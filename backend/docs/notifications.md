# Telegram notifications

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_NOTIFICATIONS_ENABLED=true` in `backend/.env`, apply migrations with `alembic upgrade head`, and start the API. The app polls every 10 seconds and uses Telegram `getUpdates`; it removes an existing webhook on startup.

All endpoints require authentication:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications/telegram-status` | Reports `linked` after private chat confirmation and `bot_enabled` when bot processing is configured |
| `POST` | `/api/notifications/telegram-link` | Generate a 15-minute `/start CODE` command |
| `GET` | `/api/notifications` | List the user's notifications, including `event_id`, `reminder_minutes`, `notify_at` and `sent_at` |
| `POST` | `/api/notifications` | Create a manual notification (`text`, `notify_at`, optional `event_id`) |
| `GET`, `PUT`, `DELETE` | `/api/notifications/{id}` | Read, replace or delete a manual notification |

The frontend should request a link command, show it to the user and poll the status endpoint after they send it to the bot in a private chat. A user who already logged in with Telegram can also confirm the chat with `/start`. Telegram OAuth alone does not confirm that the bot can send messages. Existing users must confirm their chat again after this migration.

For each event, the scheduler creates reminders for the trip owner and its current members, one hour before and at the start. Reminders are generated within the hour before the event; if an event is created during that hour, the first reminder is due immediately. Pending event reminders follow event edits and are removed when the event is deleted, rescheduled, the user loses access, or the event started more than 10 minutes ago. Failed sends are retried with exponential backoff, up to one hour between attempts. Manual notifications remain pending until a chat is confirmed. Times use timezone-aware ISO 8601 values.

## Frontend connection flow

`POST /api/auth/telegram/start` starts Telegram **OAuth login**; it does not connect a private bot chat. For notifications, call `POST /api/notifications/telegram-link` with the user's authentication cookie or bearer token. The response contains `command`, `expires_at`, and `bot_url` (a Telegram deep link, or `null` if the bot username could not be determined). Open `bot_url` and ask the user to press Start, or show `command` for them to send to the bot themselves. Then poll `GET /api/notifications/telegram-status`, whose `linked` field becomes true only after the bot receives the command. `bot_enabled` reports whether bot processing is enabled and a token is configured; it is not a connectivity health check. Do not call the link endpoint in a polling loop: poll the status endpoint instead. Repeated link requests during the 15-minute validity period return the same command.

Set `TELEGRAM_BOT_USERNAME` to the bot's username (without a URL) to provide deep links without a Telegram API lookup; otherwise the backend looks it up with `getMe` when bot processing is enabled. The bot must be running with `TELEGRAM_NOTIFICATIONS_ENABLED=true` and the correct token and relay settings. The link code is not an API authentication token and must be sent to the bot, not to the OAuth `/start` endpoint.

A manual notification may include `event_id` for an event in a trip accessible to the current user. An unknown or inaccessible event returns 404. `PUT` preserves the existing event when `event_id` is omitted; send `null` to remove the association. Automatic event reminders remain managed by the scheduler.
