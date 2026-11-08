# Релиз, откат и восстановление БД

Команды выполняются на VM из `~/app`, если не указано иное. Нужен Docker Compose v2 с `up --wait --wait-timeout` и `env_file.required`. CI сохраняет `COMPOSE_PROFILES=prod` в `.env`: Caddy и мониторинг входят только в этот профиль. Для локального запуска профиль не нужен.

## Автоматический релиз

1. Backend-тесты с отдельной PostgreSQL.
2. Сборка образов с тегом `<commit>-<pipeline-id>`. Frontend проходит `pnpm check` без изменения файлов, затем production build.
3. Деплой только `main`, с `resource_group: production` и `interruptible: false`.
4. **До замены конфигурации** `backup.sh` сохраняет старые compose, `.env`, конфигурации, ссылки на работающие образы и дамп БД в `backups/<UTC-время>-<pid>/`. Первый деплой пропускает backup, если предыдущей конфигурации нет. Ошибка backup прерывает релиз.
5. Новые образы запускаются через `compose up --wait --wait-timeout 180`. Backend сначала применяет Alembic-миграции.
6. Backend `/api/ready` проверяет соединение с БД и таблицу пользователей; frontend отвечает `/ready`. Nginx ждёт готовности обоих.
7. `verify.sh` проверяет публичный HTTPS: главную, frontend/backend readiness и OpenAPI. Неудача завершает deploy с ошибкой.

`FRONTEND_ENV` поддерживает File variable и текст dotenv. Один нормализованный файл применяется при сборке и передаётся на VM как `frontend.env`; при отсутствии переменной файл пустой. Backup сохраняет `frontend.env` вместе с остальной конфигурацией. Публичные переменные Next.js встраиваются при сборке, поэтому изменение runtime-файла не заменяет пересборку.

Readiness не проверяет S3/Telegram/OpenRouter; загрузку файлов, распознавание билетов и доставку сообщений проверять отдельно. HTTPS-проверка не заменяет сценарий в браузере. `unhealthy` сам по себе не перезапускает контейнер; `restart: unless-stopped` работает при завершении процесса.

`TELEGRAM_BOT_TOKEN` из отдельной CI variable переопределяет значение в `BACKEND_ENV` только если непустой. Флаг `TELEGRAM_NOTIFICATIONS_ENABLED` задаётся в `BACKEND_ENV`; CI не включает внешние уведомления принудительно. Деплой не запускает backup S3 и не проверяет доступность OpenRouter.

Источники: [Compose --wait](https://docs.docker.com/reference/cli/docker/compose/up/), [GitLab resource groups](https://docs.gitlab.com/ci/resource_groups/).

## Диагностика

```sh
cd ~/app
sudo docker compose ps
sudo docker compose logs --tail=100 backend frontend nginx caddy
sudo docker compose exec -T backend alembic current
sudo docker compose exec -T backend alembic heads
sudo sh verify.sh https://hack-kzn-11-vm1-5798eb.vm.prodcontest.com
```

Ошибка деплоя не запускает автоматическое восстановление БД: оно может потерять новые записи. Сначала установить совместимость предыдущего образа с текущей схемой.

## Резервные копии

```sh
cd ~/app
sudo sh backup.sh
sudo ls -lt backups
```

Скрипт создаёт `pg_dump -Fc`, проверяет формат через `pg_restore --list`, затем переименовывает `.partial` в `database.dump`. Это не заменяет пробного восстановления. Каталог защищён `umask 077` и содержит секреты `.env`; не публиковать в Git/CI artifacts.

Дамп согласован на момент создания. Запросы приложения могут продолжаться: при восстановлении будут потеряны более поздние записи. Для финального дампа без новых записей сначала остановить backend и закрыть доступ через прокси.

Копии на VM не защищают от потери диска. Переносить завершённые каталоги в закрытое внешнее хранилище; согласовать сроки хранения и расписание. Автоматическая внешняя выгрузка/ежедневное расписание этим изменением не настроены.

**S3 не входит в дамп БД.** Для полного восстановления включить версионирование/backup объектов у провайдера. Восстановление PostgreSQL не вернёт удалённые изображения.

## Откат приложения без восстановления БД

Применяется при обратно совместимой схеме. Для новых миграций использовать expand/contract: сначала совместимые добавления, затем удаление устаревшего после окна отката.

1. Приостановить новые деплои в GitLab и дождаться активного job. Ручные команды не защищены `resource_group`.
2. Выбрать завершённую копию с `database.dump`; проверить доступность старых образов. При возможности сохранить текущее состояние.
3. Восстановить конфигурацию (заменить путь примера реальным):

```sh
cd ~/app
release_backup=backups/20261108T000000Z-1234
sudo test -s "$release_backup/database.dump"
sudo cp "$release_backup/.env" .env
sudo cp "$release_backup/docker-compose.yaml" docker-compose.yaml
sudo cp "$release_backup/nginx.conf" nginx.conf
sudo cp "$release_backup/Caddyfile" Caddyfile
sudo cp "$release_backup/frontend.env" frontend.env
sudo docker compose config --quiet
sudo docker compose pull frontend backend
sudo docker compose up -d --force-recreate --remove-orphans --wait --wait-timeout 180
sudo docker compose exec -T nginx nginx -s reload
```

Если менялись мониторинг/Grafana, вернуть их конфигурации из той же копии до запуска. Для старого релиза без readiness endpoints проверить главную, `/api/ping`, вход и поездки; новый `verify.sh` может не подходить.

Для копии, сделанной до появления `frontend.env`, команду его копирования пропустить. В текущем едином Compose файл необязателен (`required: false`), но CI всегда создаёт его, чтобы не сохранять настройки прошлого релиза. При откате также восстановить прежнее значение `COMPOSE_PROFILES` вместе с `.env`.

Старый backend автоматически запускает `alembic upgrade head`. Если он не знает revision новой схемы, даже совместимый откат может не запуститься. **Только после проверки совместимости схемы** использовать временный override для запуска без миграций:

```sh
cat > rollback.override.yaml <<'YAML'
services:
  backend:
    command: ["python", "-m", "src.main"]
YAML
sudo docker compose -f docker-compose.yaml -f rollback.override.yaml up -d --force-recreate --wait --wait-timeout 180
```

Для обычного релиза снова запускать compose без override. Не использовать `alembic stamp` для сокрытия несовпадения схемы.

## Пробное восстановление

Проводить до аварии в отдельной БД. Это не заменяет production:

```sh
cd ~/app
release_backup=backups/20261108T000000Z-1234
sudo docker compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" travelhub_restore_check'
# Root-shell нужен для чтения защищённого backup.
sudo sh -c 'docker compose exec -T postgres sh -c '\''pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d travelhub_restore_check'\'' < "$1/database.dump"' sh "$release_backup"
sudo docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d travelhub_restore_check -c "SELECT * FROM alembic_version;" -c "SELECT count(*) FROM trips;" -c "SELECT count(*) FROM events;"'
```

Далее в изолированном окружении запустить соответствующий образ с восстановленной тестовой БД, отключить Telegram/сидирование и проверить чтение поездок/вложений. После проверки удалить только `travelhub_restore_check`, предварительно проверив имя.

## Восстановление production

Процедура **заменяет текущие данные выбранной копией**, изменения после неё теряются. Ответственный за релиз выбирает backup и подтверждает его проверку.

1. Остановить деплои; проверить копию в отдельной БД.
2. Закрыть доступ и остановить приложения, оставив PostgreSQL:

```sh
sudo docker compose stop caddy nginx frontend backend
```

3. По возможности сохранить аварийный дамп текущей БД.
4. Вернуть `.env`, compose и конфигурации выбранного релиза. PostgreSQL должен использовать ожидаемый кластер/volume и роль.
5. Пересоздать БД и загрузить архив. Команда удаляет текущую БД, поэтому применять её только после проверки выбранной копии:

```sh
release_backup=backups/20261108T000000Z-1234
sudo sh -c 'docker compose exec -T postgres sh -c '\''dropdb --if-exists --force -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB" && pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"'\'' < "$1/database.dump"' sh "$release_backup"
sudo docker compose up -d --force-recreate --remove-orphans --wait --wait-timeout 180
```

6. Проверить миграции, вход, поездки, события и вложения. Для релиза с readiness выполнить `sudo sh verify.sh <public-url>`.
7. Открыть доступ и возобновить деплои. Зафиксировать время дампа и потерянный интервал данных.

`docker compose down -v` не использовать для отката: команда удаляет volumes с данными.
