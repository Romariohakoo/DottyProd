from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from pwdlib import PasswordHash

from src.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    assert len(password) >= 8, "password too short"
    assert len(password.encode("utf-8")) <= 72, "password too long (bytes)"
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(subject: str, session_id: str) -> str:
    return _create_token(
        subject=subject,
        session_id=session_id,
        token_type="access",
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(subject: str, session_id: str) -> str:
    return _create_token(
        subject=subject,
        session_id=session_id,
        token_type="refresh",
        expires_at=refresh_token_expires_at(),
    )


def refresh_token_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)


def _create_token(
    subject: str,
    session_id: str,
    token_type: str,
    expires_at: datetime,
) -> str:
    payload = {
        "sub": subject,
        "sid": session_id,
        "jti": str(uuid4()),
        "type": token_type,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
