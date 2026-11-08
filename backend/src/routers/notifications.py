from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

import httpx
from fastapi import APIRouter
from sqlalchemy import or_, select

from src.core.config import settings
from src.core.dependencies import CurrentUser
from src.core.domain import ConflictError, NotFoundError
from src.db.dependencies import SessionDep
from src.models.notification_model import NotificationModel
from src.models.trip_model import EventModel, TripMemberModel, TripModel
from src.models.user_model import UserModel
from src.schemas.notification import NotificationDTO, NotificationInput, TelegramLinkDTO, TelegramStatusDTO
from src.services.telegram_notifications import telegram_call

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def owned_notification(session: SessionDep, user: CurrentUser, notification_id: int) -> NotificationModel:
    notification = await session.scalar(
        select(NotificationModel).where(NotificationModel.id == notification_id, NotificationModel.user_id == user.id)
    )
    if notification is None:
        raise NotFoundError("Notification not found")
    return notification


async def require_accessible_event(session: SessionDep, user: CurrentUser, event_id: int | None) -> None:
    if event_id is None:
        return
    event = await session.scalar(
        select(EventModel.id)
        .join(TripModel, TripModel.id == EventModel.trip_id)
        .outerjoin(TripMemberModel, (TripMemberModel.trip_id == TripModel.id) & (TripMemberModel.user_id == user.id))
        .where(EventModel.id == event_id, or_(TripModel.owner_id == user.id, TripMemberModel.user_id == user.id))
    )
    if event is None:
        raise NotFoundError("Event not found")


@router.get("", response_model=list[NotificationDTO])
async def list_notifications(session: SessionDep, user: CurrentUser):
    result = await session.scalars(
        select(NotificationModel).where(NotificationModel.user_id == user.id).order_by(NotificationModel.notify_at, NotificationModel.id)
    )
    return result.all()


@router.post("", response_model=NotificationDTO, status_code=201)
async def create_notification(data: NotificationInput, session: SessionDep, user: CurrentUser):
    await require_accessible_event(session, user, data.event_id)
    notification = NotificationModel(
        user_id=user.id, event_id=data.event_id, text=data.text, notify_at=data.notify_at, next_attempt_at=data.notify_at
    )
    session.add(notification)
    await session.commit()
    await session.refresh(notification)
    return notification


@router.get("/telegram-status", response_model=TelegramStatusDTO)
async def telegram_status(user: CurrentUser):
    return TelegramStatusDTO(
        linked=user.telegram_chat_id is not None,
        bot_enabled=bool(settings.telegram_notifications_enabled and settings.telegram_bot_token),
    )


@router.get("/{notification_id}", response_model=NotificationDTO)
async def get_notification(notification_id: int, session: SessionDep, user: CurrentUser):
    return await owned_notification(session, user, notification_id)


@router.put("/{notification_id}", response_model=NotificationDTO)
async def update_notification(notification_id: int, data: NotificationInput, session: SessionDep, user: CurrentUser):
    notification = await owned_notification(session, user, notification_id)
    if notification.reminder_minutes is not None:
        raise ConflictError("Event reminders are managed automatically")
    if notification.sent_at is not None:
        raise ConflictError("Sent notification cannot be changed")
    if "event_id" in data.model_fields_set:
        await require_accessible_event(session, user, data.event_id)
        notification.event_id = data.event_id
    notification.text = data.text
    notification.notify_at = data.notify_at
    notification.next_attempt_at = data.notify_at
    notification.attempt_count = 0
    notification.last_error = None
    await session.commit()
    await session.refresh(notification)
    return notification


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(notification_id: int, session: SessionDep, user: CurrentUser):
    notification = await owned_notification(session, user, notification_id)
    if notification.reminder_minutes is not None:
        raise ConflictError("Event reminders are managed automatically")
    await session.delete(notification)
    await session.commit()


@router.post("/telegram-link", response_model=TelegramLinkDTO)
async def create_telegram_link(session: SessionDep, user: CurrentUser):
    # Concurrent frontend requests must not invalidate the command already shown.
    user = await session.scalar(select(UserModel).where(UserModel.id == user.id).with_for_update())
    now = datetime.now(timezone.utc)
    if not user.telegram_link_code or not user.telegram_link_expires_at or user.telegram_link_expires_at <= now:
        user.telegram_link_code = token_urlsafe(24)
        user.telegram_link_expires_at = now + timedelta(minutes=15)
    code = user.telegram_link_code
    expires_at = user.telegram_link_expires_at
    await session.commit()
    username = settings.telegram_bot_username.strip().removeprefix("@")
    if not username and settings.telegram_notifications_enabled and settings.telegram_bot_token:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                bot = await telegram_call(client, "getMe", {})
                username = bot.get("username", "")
        except Exception:
            # The command still works if the bot API is temporarily unavailable.
            pass
    bot_url = f"https://t.me/{username}?start={code}" if username else None
    return TelegramLinkDTO(command=f"/start {code}", expires_at=expires_at, bot_url=bot_url)
