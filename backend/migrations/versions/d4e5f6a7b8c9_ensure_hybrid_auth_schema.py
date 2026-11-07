"""ensure users schema has email, hashed_password, and telegram_id

Revision ID: d4e5f6a7b8c9
Revises: c3f8a1b92e47
"""
from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c3f8a1b92e47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT")
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_telegram_id') THEN "
        "ALTER TABLE users ADD CONSTRAINT uq_users_telegram_id UNIQUE (telegram_id); "
        "END IF; END $$;"
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR")
    op.execute("UPDATE users SET email = 'user_' || id || '@telegram.local' WHERE email IS NULL")
    op.execute("ALTER TABLE users ALTER COLUMN email SET NOT NULL")
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN "
        "ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN "
        "UPDATE users SET username = username || '_' || id WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY username); "
        "ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username); "
        "END IF; END $$;"
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR NOT NULL DEFAULT ''")


def downgrade() -> None:
    pass
