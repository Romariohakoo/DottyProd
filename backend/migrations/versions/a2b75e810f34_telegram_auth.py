"""Replace password credentials with Telegram identity.

Existing user IDs and trip references are retained. Credentials cannot be restored.
"""
from alembic import op
import sqlalchemy as sa

revision = "a2b75e810f34"
down_revision = "b6e2c91a4d73"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("telegram_subject", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.create_unique_constraint("uq_users_telegram_subject", "users", ["telegram_subject"])
    op.create_unique_constraint("uq_users_telegram_id", "users", ["telegram_id"])
    op.drop_constraint("users_username_key", "users", type_="unique")
    op.drop_column("users", "email")
    op.drop_column("users", "hashed_password")
    op.execute("UPDATE auth_sessions SET revoked_at = now() WHERE revoked_at IS NULL")
    op.create_table(
        "telegram_login_attempts",
        sa.Column("state", sa.String(64), primary_key=True),
        sa.Column("browser_hash", sa.String(64), nullable=False),
        sa.Column("verifier", sa.String(128), nullable=False),
        sa.Column("nonce", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_telegram_login_attempts_expires_at", "telegram_login_attempts", ["expires_at"])


def downgrade():
    raise RuntimeError("Telegram migration removes credentials; restore a pre-migration backup to roll back.")
