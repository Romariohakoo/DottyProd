# Telegram notifications

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_NOTIFICATIONS_ENABLED=true` in `backend/.env`, then apply migrations with `alembic upgrade head` and start the API. The app polls due notifications every 10 seconds and runs the bot's `/start` command handler. The bot uses Telegram `getUpdates` and removes an existing webhook on startup.

All endpoints require the existing user authentication and live under `/api/notifications`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications` | List the current user's notifications |
| `POST` | `/api/notifications` | Create one (`text`, `notify_at`) |
| `GET` | `/api/notifications/{id}` | Read one |
| `PUT` | `/api/notifications/{id}` | Replace text and time before delivery |
| `DELETE` | `/api/notifications/{id}` | Delete one |
| `POST` | `/api/notifications/telegram-link` | Generate a 15-minute `/start CODE` command |

`notify_at` must be an ISO 8601 date and time with a timezone offset, for example `2026-12-10T12:00:00+03:00`. Responses include `sent_at`, which is `null` until Telegram accepts the message. The frontend should show the generated command to the user and ask them to send it to the bot in a private chat. Telegram login users can also start the bot without a code. Notifications for users without a linked Telegram account remain pending until they link it. Failed sends are retried with exponential backoff, up to one hour between attempts.
