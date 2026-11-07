from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from fastapi import APIRouter
from sqlalchemy import select

from src.core.dependencies import CurrentUser
from src.core.domain import ConflictError, NotFoundError
from src.db.dependencies import SessionDep
from src.models.notification_model import NotificationModel
from src.schemas.notification import NotificationDTO, NotificationInput, TelegramLinkDTO

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def owned_notification(session: SessionDep, user: CurrentUser, notification_id: int) -> NotificationModel:
    notification = await session.scalar(
        select(NotificationModel).where(NotificationModel.id == notification_id, NotificationModel.user_id == user.id)
    )
    if notification is None:
        raise NotFoundError("Notification not found")
    return notification


@router.get("", response_model=list[NotificationDTO])
async def list_notifications(session: SessionDep, user: CurrentUser):
    result = await session.scalars(
        select(NotificationModel).where(NotificationModel.user_id == user.id).order_by(NotificationModel.notify_at, NotificationModel.id)
    )
    return result.all()


@router.post("", response_model=NotificationDTO, status_code=201)
async def create_notification(data: NotificationInput, session: SessionDep, user: CurrentUser):
    notification = NotificationModel(
        user_id=user.id, text=data.text, notify_at=data.notify_at, next_attempt_at=data.notify_at
    )
    session.add(notification)
    await session.commit()
    await session.refresh(notification)
    return notification


@router.get("/{notification_id}", response_model=NotificationDTO)
async def get_notification(notification_id: int, session: SessionDep, user: CurrentUser):
    return await owned_notification(session, user, notification_id)


@router.put("/{notification_id}", response_model=NotificationDTO)
async def update_notification(notification_id: int, data: NotificationInput, session: SessionDep, user: CurrentUser):
    notification = await owned_notification(session, user, notification_id)
    if notification.sent_at is not None:
        raise ConflictError("Sent notification cannot be changed")
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
    await session.delete(notification)
    await session.commit()


@router.post("/telegram-link", response_model=TelegramLinkDTO)
async def create_telegram_link(session: SessionDep, user: CurrentUser):
    user.telegram_link_code = token_urlsafe(24)
    user.telegram_link_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await session.commit()
    return TelegramLinkDTO(command=f"/start {user.telegram_link_code}", expires_at=user.telegram_link_expires_at)
