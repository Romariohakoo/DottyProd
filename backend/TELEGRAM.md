# Вход через Telegram

Регистрация и вход — единый OIDC Authorization Code Flow с PKCE (RS256).
Frontend вызывает `POST /api/auth/telegram/start`, затем открывает полученный
`authorization_url`. Backend обрабатывает `GET /api/auth/telegram/callback`,
проверяет одноразовый state, привязку к браузеру, nonce и подпись Telegram,
создаёт пользователя и выдаёт прежние HttpOnly cookies. Email и пароль удалены.
`username` — редактируемое неуникальное отображаемое имя; идентичность — OIDC `sub`.
Обновление имени: `PATCH /api/auth/me` с `{"name": "Новое имя"}`.

## Настройка рабочего окружения

1. В @BotFather открыть своего бота → Login Widget → OAuth 2.0 (не Legacy).
2. Добавить Allowed URLs:
   - `https://hack-kzn-11-vm1-5798eb.vm.prodcontest.com`
   - `https://hack-kzn-11-vm1-5798eb.vm.prodcontest.com/api/auth/telegram/callback`
3. Скопировать Client ID и Client Secret из раздела OAuth 2.0. В Advanced оставить RS256.
4. Добавить в backend environment (в этом проекте GitLab file variable `BACKEND_ENV`,
   которая при deploy становится `~/app/.env`):

```dotenv
TELEGRAM_CLIENT_ID=<Client ID из Login Widget>
TELEGRAM_CLIENT_SECRET=<Client Secret из Login Widget>
TELEGRAM_REDIRECT_URI=https://hack-kzn-11-vm1-5798eb.vm.prodcontest.com/api/auth/telegram/callback
FRONTEND_URL=https://hack-kzn-11-vm1-5798eb.vm.prodcontest.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
TELEGRAM_NOTIFICATIONS_ENABLED=false
# Не обязателен для входа, пригодится для уведомлений:
TELEGRAM_BOT_TOKEN=<токен BotFather>
```

Существующие POSTGRES_*, SECRET_KEY, SERVER_PORT и остальные настройки сохранить.
Client Secret и bot token — разные секреты; оба только на backend, без NEXT_PUBLIC_.
Если домен другой, заменить его в Allowed URLs и обоих URL окружения.
Без Client ID/Secret backend запускается, но начало входа возвращает 503.

5. Перед обновлением сохранить резервную копию БД. Миграция
   `a2b75e810f34` удаляет email/хеши паролей и отзывает прежние сессии.
   Она сохраняет ID старых пользователей и связи поездок, но не привязывает их
   к Telegram автоматически. Откат credentials возможен только из резервной копии.
6. Пересобрать и развернуть backend/frontend и обновлённый nginx.conf.
   Backend Docker CMD сам выполняет `alembic upgrade head` перед запуском.
7. Открыть `/login`, войти через Telegram, проверить профиль, выход и повторный вход.
   Попробовать отмену входа и вход без разрешения на сообщения.

Вход использует redirect, не popup. Для локальной разработки backend по умолчанию
`http://localhost:8080`, frontend `http://localhost:3000`; нужны согласованные
`NEXT_PUBLIC_API_BASE_URL`, `TELEGRAM_REDIRECT_URI`, `FRONTEND_URL` и Allowed URLs.
Если Telegram не принимает локальный HTTP URL, использовать HTTPS dev-домен/туннель
и проксировать frontend и `/api` под одним origin. Не смешивать локальный frontend
с production callback: привязка OAuth-попытки использует SameSite=Lax cookie.

## Уведомления — пока заглушка

Вход запрашивает `telegram:bot_access`, но отказ от сообщений не мешает входу.
Есть функция `send_event_reminder(telegram_id, title, start_at)` в
`src/services/telegram_notification_service.py`. По умолчанию она возвращает
`disabled` и не обращается к Telegram. При явном включении и наличии bot token
умеет отправить сообщение через sendMessage и вернуть sent/unavailable/retry.

Планировщика, автоматических вызовов, webhook, подписок и просьб об отзыве пока нет.
Включение флага само по себе рассылку не запускает. Перед будущей отправкой нужно
проверять актуальность события, получателей и согласие; успешный вход сам по себе
не гарантирует, что пользователь разрешил боту писать. Текущий адаптер не хранит
состояние согласия и не повторяет отправки самостоятельно.

Документация Telegram: https://core.telegram.org/bots/telegram-login
