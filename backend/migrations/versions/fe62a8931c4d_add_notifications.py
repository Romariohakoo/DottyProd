"""Add scheduled Telegram notifications and account link codes.

Revision ID: fe62a8931c4d
Revises: d4e5f6a7b8c9
"""

import sqlalchemy as sa
from alembic import op

revision = "fe62a8931c4d"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_link_code", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("telegram_link_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_users_telegram_link_code", "users", ["telegram_link_code"])
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("notify_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_due", "notifications", ["next_attempt_at", "id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id", "id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_constraint("uq_users_telegram_link_code", "users", type_="unique")
    op.drop_column("users", "telegram_link_expires_at")
    op.drop_column("users", "telegram_link_code")
