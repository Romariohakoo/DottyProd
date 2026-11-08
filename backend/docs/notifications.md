# Telegram notifications

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_NOTIFICATIONS_ENABLED=true` in `backend/.env`, apply migrations with `alembic upgrade head`, and start the API. The app polls every 10 seconds and uses Telegram `getUpdates`; it removes an existing webhook on startup.

All endpoints require authentication:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications/telegram-status` | Returns `{"linked": true}` only after a private chat with the bot has been confirmed |
| `POST` | `/api/notifications/telegram-link` | Generate a 15-minute `/start CODE` command |
| `GET` | `/api/notifications` | List the user's notifications, including `event_id`, `reminder_minutes`, `notify_at` and `sent_at` |
| `POST` | `/api/notifications` | Create a manual notification (`text`, `notify_at`) |
| `GET`, `PUT`, `DELETE` | `/api/notifications/{id}` | Read, replace or delete a manual notification |

The frontend should request a link command, show it to the user and poll the status endpoint after they send it to the bot in a private chat. A user who already logged in with Telegram can also confirm the chat with `/start`. Telegram OAuth alone does not confirm that the bot can send messages. Existing users must confirm their chat again after this migration.

For each event, the scheduler creates reminders for the trip owner and its current members, one hour before and at the start. Reminders are generated within the hour before the event; if an event is created during that hour, the first reminder is due immediately. Pending event reminders follow event edits and are removed when the event is deleted, rescheduled, the user loses access, or the event started more than 10 minutes ago. Failed sends are retried with exponential backoff, up to one hour between attempts. Manual notifications remain pending until a chat is confirmed. Times use timezone-aware ISO 8601 values.
