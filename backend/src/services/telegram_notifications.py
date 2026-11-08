import asyncio
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select, text

from src.core.config import settings
from src.db.database import SessionLocal, engine
from src.models.notification_model import NotificationModel
from src.models.user_model import UserModel

logger = logging.getLogger(__name__)


def _bot_api_base() -> str:
    relay = settings.telegram_relay_url.rstrip("/")
    return f"{relay}/bot" if relay else "https://api.telegram.org/bot"


async def telegram_call(client: httpx.AsyncClient, method: str, payload: dict):
    try:
        response = await client.post(f"{_bot_api_base()}{settings.telegram_bot_token}/{method}", json=payload)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"Telegram HTTP {exc.response.status_code}") from None
    except httpx.RequestError:
        raise RuntimeError("Telegram connection failed") from None
    data = response.json()
    if not data.get("ok"):
        raise RuntimeError(data.get("description", "Telegram API error"))
    return data["result"]


async def schedule_event_reminders() -> None:
    """Reconcile upcoming event reminders for the owner and current members."""
    async with SessionLocal() as session:
        # Serialize reconciliation, including against other scheduler instances.
        if not await session.scalar(text("SELECT pg_try_advisory_xact_lock(1198453922)")):
            return
        await session.execute(text("""
            DELETE FROM notifications n
            WHERE n.reminder_minutes IS NOT NULL AND n.sent_at IS NULL AND NOT EXISTS (
                SELECT 1 FROM events e JOIN trips t ON t.id = e.trip_id
                WHERE e.id = n.event_id AND e.start_at = n.event_start_at
                  AND e.start_at >= now() - interval '10 minutes'
                  AND (t.owner_id = n.user_id OR EXISTS (
                      SELECT 1 FROM trip_members m WHERE m.trip_id = t.id AND m.user_id = n.user_id
                  ))
            )
        """))
        await session.execute(text("""
            INSERT INTO notifications (user_id, event_id, event_start_at, reminder_minutes, text, notify_at, next_attempt_at)
            SELECT recipients.user_id, e.id, e.start_at, offsets.minutes,
                   CASE WHEN offsets.minutes = 60 THEN 'Скоро событие: ' ELSE 'Событие начинается: ' END || e.title,
                   e.start_at - offsets.minutes * interval '1 minute',
                   e.start_at - offsets.minutes * interval '1 minute'
            FROM events e JOIN trips t ON t.id = e.trip_id
            CROSS JOIN LATERAL (
                SELECT t.owner_id AS user_id
                UNION SELECT m.user_id FROM trip_members m WHERE m.trip_id = t.id
            ) recipients
            CROSS JOIN (VALUES (60), (0)) offsets(minutes)
            WHERE e.start_at >= now() - interval '10 minutes'
              AND e.start_at <= now() + interval '1 hour'
              AND (offsets.minutes = 0 OR e.start_at > now())
            ON CONFLICT ON CONSTRAINT uq_event_reminder DO NOTHING
        """))
        await session.execute(text("""
            UPDATE notifications n SET text =
                CASE WHEN n.reminder_minutes = 60 THEN 'Скоро событие: ' ELSE 'Событие начинается: ' END || e.title
            FROM events e WHERE n.event_id = e.id AND n.reminder_minutes IS NOT NULL AND n.sent_at IS NULL
                AND n.event_start_at = e.start_at
        """))
        await session.commit()


async def send_due_notifications(client: httpx.AsyncClient) -> int:
    """Send a small locked batch so multiple app instances do not send the same row concurrently."""
    sent = 0
    async with SessionLocal() as session:
        now = datetime.now(timezone.utc)
        result = await session.execute(
            select(NotificationModel, UserModel.telegram_chat_id)
            .join(UserModel, UserModel.id == NotificationModel.user_id)
            .where(
                NotificationModel.sent_at.is_(None),
                NotificationModel.next_attempt_at <= now,
                UserModel.telegram_chat_id.is_not(None),
            )
            .order_by(NotificationModel.next_attempt_at, NotificationModel.id)
            .limit(25)
            .with_for_update(of=NotificationModel, skip_locked=True)
        )
        for notification, chat_id in result:
            try:
                await telegram_call(client, "sendMessage", {"chat_id": chat_id, "text": notification.text})
            except Exception as exc:
                notification.attempt_count += 1
                notification.last_error = str(exc)[:500]
                delay = min(3600, 30 * 2 ** min(notification.attempt_count - 1, 7))
                notification.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
                logger.warning("Notification %s delivery failed: %s", notification.id, exc)
            else:
                notification.sent_at = datetime.now(timezone.utc)
                notification.last_error = None
                sent += 1
            await session.flush()
        await session.commit()
    return sent


async def process_bot_update(client: httpx.AsyncClient, update: dict) -> None:
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    sender = message.get("from") or {}
    if chat.get("type") != "private" or not isinstance(sender.get("id"), int) or chat.get("id") != sender["id"]:
        return
    command = message.get("text", "").split(maxsplit=1)
    if not command or command[0].split("@", 1)[0] != "/start":
        return
    answer = "Откройте приложение, получите код привязки Telegram и отправьте /start КОД."
    if len(command) == 2:
        async with SessionLocal() as session:
            user = await session.scalar(
                select(UserModel).where(UserModel.telegram_link_code == command[1]).with_for_update()
            )
            if user and user.telegram_link_expires_at and user.telegram_link_expires_at > datetime.now(timezone.utc):
                existing = await session.scalar(select(UserModel).where(UserModel.telegram_id == sender["id"]))
                if existing is None or existing.id == user.id:
                    user.telegram_id = sender["id"]
                    user.telegram_chat_id = chat["id"]
                    user.telegram_link_code = None
                    user.telegram_link_expires_at = None
                    await session.commit()
                    answer = "Telegram подключён. Напоминания будут приходить сюда."
                else:
                    answer = "Этот Telegram уже привязан к другому аккаунту."
            else:
                answer = "Код недействителен или истёк. Получите новый код в приложении."
    else:
        async with SessionLocal() as session:
            user = await session.scalar(select(UserModel).where(UserModel.telegram_id == sender["id"]))
            if user is not None:
                user.telegram_chat_id = chat["id"]
                user.telegram_link_code = None
                user.telegram_link_expires_at = None
                await session.commit()
                answer = "Бот готов отправлять ваши напоминания."
    await telegram_call(client, "sendMessage", {"chat_id": chat["id"], "text": answer})


async def notification_loop(client: httpx.AsyncClient) -> None:
    while True:
        try:
            await schedule_event_reminders()
            await send_due_notifications(client)
        except Exception:
            logger.exception("Notification delivery loop failed")
        await asyncio.sleep(10)


async def bot_loop(client: httpx.AsyncClient) -> None:
    offset = None
    while True:
        try:
            # One getUpdates consumer per database; another instance may run delivery.
            async with engine.connect() as connection:
                locked = await connection.scalar(text("SELECT pg_try_advisory_lock(1198453921)"))
                if locked:
                    try:
                        await telegram_call(client, "deleteWebhook", {"drop_pending_updates": False})
                        while True:
                            updates = await telegram_call(
                                client, "getUpdates", {"offset": offset, "timeout": 20, "allowed_updates": ["message"]}
                            )
                            for update in updates:
                                try:
                                    await process_bot_update(client, update)
                                except Exception:
                                    logger.exception("Telegram update %s failed", update.get("update_id"))
                                    break
                                offset = update["update_id"] + 1
                    finally:
                        await connection.execute(text("SELECT pg_advisory_unlock(1198453921)"))
        except Exception:
            logger.exception("Telegram bot polling failed")
        await asyncio.sleep(10)
