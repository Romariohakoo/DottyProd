from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.db.database import Base, CreatedAt


class NotificationModel(CreatedAt, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", "event_start_at", "reminder_minutes", name="uq_event_reminder"),
        Index("ix_notifications_due", "next_attempt_at", "id"),
        Index("ix_notifications_user_id", "user_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    event_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reminder_minutes: Mapped[int | None] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    notify_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_error: Mapped[str | None] = mapped_column(String(500))
