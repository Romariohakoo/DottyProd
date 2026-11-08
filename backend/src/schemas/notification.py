from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NotificationInput(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    notify_at: datetime

    @field_validator("text")
    @classmethod
    def nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Notification text cannot be blank")
        return value

    @field_validator("notify_at")
    @classmethod
    def timezone_required(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("notify_at must include a timezone offset")
        return value.astimezone(timezone.utc)


class NotificationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    event_id: int | None
    reminder_minutes: int | None
    notify_at: datetime
    sent_at: datetime | None
    created_at: datetime


class TelegramLinkDTO(BaseModel):
    command: str
    expires_at: datetime
    bot_url: str | None = None


class TelegramStatusDTO(BaseModel):
    linked: bool
    bot_enabled: bool
