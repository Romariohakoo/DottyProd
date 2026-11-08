"""Allow Telegram OAuth callbacks without a browser cookie.

Revision ID: b3c86f921a45
Revises: a2b75e810f34
"""
from alembic import op

revision = "b3c86f921a45"
down_revision = "a2b75e810f34"
branch_labels = None
depends_on = None


def upgrade():
    # This table only exists in older installations, not in a fresh database.
    op.execute("ALTER TABLE IF EXISTS telegram_login_attempts DROP COLUMN IF EXISTS browser_hash")


def downgrade():
    raise RuntimeError("Recreate browser_hash only from a database backup.")
