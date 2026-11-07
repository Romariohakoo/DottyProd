"""add event comments

Revision ID: c3f8a1b92e47
Revises: a2b75e810f34
Create Date: 2026-11-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f8a1b92e47"
down_revision: Union[str, None] = "a2b75e810f34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_comments",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
    )
    op.create_index(
        "ix_event_comments_event_created_id",
        "event_comments",
        ["event_id", "created_at", "id"],
    )
    op.create_index("ix_event_comment_author", "event_comments", ["author_id"])


def downgrade() -> None:
    op.drop_index("ix_event_comment_author", table_name="event_comments")
    op.drop_index("ix_event_comments_event_created_id", table_name="event_comments")
    op.drop_table("event_comments")
