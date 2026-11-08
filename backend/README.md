# Локальный запуск backend

Из каталога `backend`:

```sh
cp .env.example .env # если .env ещё нет
docker compose up --build
```

API-документация доступна по адресу `http://localhost:<SERVER_PORT>/api/docs` (в `.env.example` порт `8080`). Compose создаёт именованный том `backend_postgres_data` для PostgreSQL. Учётные данные и имя базы из `.env` применяются при первой инициализации этого тома; последующее изменение `POSTGRES_USERNAME`, `POSTGRES_PASSWORD` или `POSTGRES_DATABASE` не меняет уже созданную базу.

Если до обновления Compose база хранилась в анонимном томе, он сохраняется, но новый запуск использует `backend_postgres_data`. Для переноса старых данных потребуется отдельная миграция. Не используйте `docker compose down -v`, если данные базы нужны.
