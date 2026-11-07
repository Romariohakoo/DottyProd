import base64
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from urllib.parse import urlencode

from fastapi import HTTPException, status
import httpx
import jwt

from src.core.config import settings

TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth"
TELEGRAM_TOKEN_URL = "https://oauth.telegram.org/token"


def build_telegram_auth_url() -> str:
    if not settings.telegram_client_id or not settings.telegram_client_secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Telegram OAuth is not configured in .env",
        )

    verifier = secrets.token_urlsafe(32)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )

    state = jwt.encode(
        {
            "v": verifier,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )

    params = {
        "response_type": "code",
        "client_id": settings.telegram_client_id,
        "redirect_uri": settings.telegram_redirect_uri,
        "scope": "openid profile",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return f"{TELEGRAM_AUTH_URL}?{urlencode(params)}"


async def fetch_telegram_user(code: str, state: str) -> dict:
    try:
        state_payload = jwt.decode(
            state,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        verifier = state_payload["v"]
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired OAuth state") from None

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            TELEGRAM_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.telegram_redirect_uri,
                "client_id": settings.telegram_client_id,
                "client_secret": settings.telegram_client_secret,
                "code_verifier": verifier,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to exchange Telegram code")

    id_token = resp.json().get("id_token")
    if not id_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing id_token from Telegram")

    claims = jwt.decode(id_token, options={"verify_signature": False})
    telegram_id = int(claims.get("id") or claims["sub"])

    return {
        "telegram_id": telegram_id,
        "username": claims.get("preferred_username"),
        "name": claims.get("name"),
        "avatar_url": claims.get("picture"),
    }
