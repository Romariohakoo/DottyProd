"""Schedule event reminders and confirm private Telegram chats.

Revision ID: 91ac37d0b284
Revises: ab71e902cd34
"""
from alembic import op
import sqlalchemy as sa

revision = "91ac37d0b284"
down_revision = "ab71e902cd34"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True))
    op.create_unique_constraint("uq_users_telegram_chat_id", "users", ["telegram_chat_id"])
    op.add_column("notifications", sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=True))
    op.add_column("notifications", sa.Column("event_start_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("notifications", sa.Column("reminder_minutes", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_event_reminder", "notifications", ["user_id", "event_id", "event_start_at", "reminder_minutes"])


def downgrade():
    op.drop_constraint("uq_event_reminder", "notifications", type_="unique")
    op.drop_column("notifications", "reminder_minutes")
    op.drop_column("notifications", "event_start_at")
    op.drop_column("notifications", "event_id")
    op.drop_constraint("uq_users_telegram_chat_id", "users", type_="unique")
    op.drop_column("users", "telegram_chat_id")
