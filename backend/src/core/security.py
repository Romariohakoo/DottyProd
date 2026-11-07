from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from src.core.config import settings


@dataclass(frozen=True)
class IssuedToken:
    value: str
    jti: str
    expires_at: datetime


@dataclass(frozen=True)
class TokenClaims:
    user_id: int
    session_id: str
    jti: str


class InvalidToken(Exception):
    pass


def issue_access_token(user_id: int, session_id: str) -> IssuedToken:
    lifetime = timedelta(minutes=settings.access_token_expire_minutes)
    return _issue_token(user_id, session_id, "access", lifetime)


def issue_refresh_token(user_id: int, session_id: str) -> IssuedToken:
    lifetime = timedelta(days=settings.refresh_token_expire_days)
    return _issue_token(user_id, session_id, "refresh", lifetime)


def read_token(token: str | None, token_type: str) -> TokenClaims:
    if not token:
        raise InvalidToken

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        claims = TokenClaims(int(payload["sub"]), payload["sid"], payload["jti"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise InvalidToken from None

    if payload.get("type") != token_type:
        raise InvalidToken
    if not isinstance(claims.session_id, str) or not isinstance(claims.jti, str):
        raise InvalidToken

    return claims


def _issue_token(user_id: int, session_id: str, token_type: str, lifetime: timedelta) -> IssuedToken:
    jti = str(uuid4())
    expires_at = datetime.now(timezone.utc) + lifetime

    payload = {
        "sub": str(user_id),
        "sid": session_id,
        "jti": jti,
        "type": token_type,
        "exp": expires_at,
    }
    value = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)

    return IssuedToken(value, jti, expires_at)
