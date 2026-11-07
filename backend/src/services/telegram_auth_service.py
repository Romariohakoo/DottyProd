"""Telegram OIDC authorization code flow. Credentials never reach the browser."""
import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.telegram_login_model import TelegramLoginModel

ISSUER = "https://oauth.telegram.org"
LOGIN_TTL = 600


def require_configuration():
    if not settings.telegram_client_id or not settings.telegram_client_secret.get_secret_value():
        raise HTTPException(503, "Telegram login is not configured")


async def start_login(session: AsyncSession) -> tuple[str, str]:
    require_configuration()
    now = datetime.now(timezone.utc)
    browser_secret = secrets.token_urlsafe(32)
    attempt = TelegramLoginModel(
        state=secrets.token_urlsafe(32),
        browser_hash=hashlib.sha256(browser_secret.encode()).hexdigest(),
        verifier=secrets.token_urlsafe(48),
        nonce=secrets.token_urlsafe(32),
        expires_at=now + timedelta(seconds=LOGIN_TTL),
    )
    await session.execute(delete(TelegramLoginModel).where(TelegramLoginModel.expires_at <= now))
    session.add(attempt)
    await session.commit()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(attempt.verifier.encode()).digest()).rstrip(b"=").decode()
    query = urlencode({
        "client_id": settings.telegram_client_id,
        "redirect_uri": settings.telegram_redirect_uri,
        "response_type": "code",
        "scope": "openid profile telegram:bot_access",
        "state": attempt.state,
        "nonce": attempt.nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })
    return f"{ISSUER}/auth?{query}", browser_secret


async def consume_login(session: AsyncSession, state: str, browser_secret: str) -> TelegramLoginModel:
    # DELETE RETURNING makes a callback one-use even with multiple API workers.
    result = await session.execute(delete(TelegramLoginModel).where(
        TelegramLoginModel.state == state,
        TelegramLoginModel.browser_hash == hashlib.sha256(browser_secret.encode()).hexdigest(),
        TelegramLoginModel.expires_at > datetime.now(timezone.utc),
    ).returning(TelegramLoginModel))
    attempt = result.scalar_one_or_none()
    await session.commit()
    if attempt is None:
        raise HTTPException(400, "Invalid or expired Telegram login")
    return attempt


def validate_id_token(token: str, jwks: dict, nonce: str) -> dict:
    header = jwt.get_unverified_header(token)
    if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str):
        raise jwt.InvalidTokenError("Unsupported Telegram signing key")
    key = next((key for key in jwt.PyJWKSet.from_dict(jwks).keys if key.key_id == header["kid"]), None)
    if key is None:
        raise jwt.InvalidTokenError("Unknown Telegram signing key")
    claims = jwt.decode(
        token, key.key, algorithms=["RS256"], audience=settings.telegram_client_id,
        issuer=ISSUER, options={"require": ["sub", "iss", "aud", "iat", "exp", "nonce", "id"]},
    )
    if not isinstance(claims["nonce"], str) or not secrets.compare_digest(claims["nonce"], nonce):
        raise jwt.InvalidTokenError("Invalid nonce")
    if not claims["sub"] or len(claims["sub"]) > 255:
        raise jwt.InvalidTokenError("Invalid subject")
    if type(claims["id"]) is not int or not 0 < claims["id"] < 2**63:
        raise jwt.InvalidTokenError("Invalid Telegram ID")
    for field in ("name", "preferred_username"):
        if field in claims and (not isinstance(claims[field], str) or len(claims[field]) > 255):
            raise jwt.InvalidTokenError("Invalid profile")
    return claims


async def exchange_code(code: str, attempt: TelegramLoginModel) -> dict:
    require_configuration()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{ISSUER}/token",
                auth=(settings.telegram_client_id, settings.telegram_client_secret.get_secret_value()),
                data={"grant_type": "authorization_code", "code": code,
                      "redirect_uri": settings.telegram_redirect_uri,
                      "client_id": settings.telegram_client_id, "code_verifier": attempt.verifier},
            )
            response.raise_for_status()
            token = response.json()["id_token"]
            keys = await client.get(f"{ISSUER}/.well-known/jwks.json")
            keys.raise_for_status()
            return validate_id_token(token, keys.json(), attempt.nonce)
    except (httpx.HTTPError, jwt.PyJWTError, KeyError, TypeError, ValueError):
        # Do not surface provider responses, codes or tokens to logs/UI.
        raise HTTPException(401, "Telegram authorization failed") from None
