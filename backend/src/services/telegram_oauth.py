import base64
import hashlib
import hmac
import secrets
from urllib.parse import urlencode

from fastapi import HTTPException, status
import httpx
import jwt

from src.core.config import settings

TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth"


def _derive_verifier(state: str) -> str:
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        state.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _sign_state_part(payload: str) -> str:
    return hmac.new(
        settings.secret_key.encode("utf-8"),
        f"state:{payload}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:16]


def _encode_state(link_user_id: int | None = None) -> str:
    token = secrets.token_hex(12)
    if link_user_id is None:
        return token
    payload = f"{token}-{link_user_id}"
    sig = _sign_state_part(payload)
    return f"{payload}-{sig}"


def _extract_link_user_id(state: str) -> int | None:
    parts = state.split("-")
    if len(parts) != 3:
        return None
    token, uid_str, sig = parts
    payload = f"{token}-{uid_str}"
    if not hmac.compare_digest(sig, _sign_state_part(payload)):
        return None
    try:
        return int(uid_str)
    except ValueError:
        return None


def build_telegram_auth_url(link_user_id: int | None = None) -> str:
    if not settings.telegram_client_id or not settings.telegram_client_secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Telegram OAuth is not configured in .env",
        )

    state = _encode_state(link_user_id=link_user_id)
    nonce = secrets.token_urlsafe(16)
    verifier = _derive_verifier(state)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("utf-8")).digest())
        .rstrip(b"=")
        .decode("ascii")
    )

    params = {
        "client_id": settings.telegram_client_id,
        "redirect_uri": settings.telegram_redirect_uri,
        "response_type": "code",
        "scope": "openid profile telegram:bot_access",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return f"{TELEGRAM_AUTH_URL}?{urlencode(params)}"


async def fetch_telegram_user(code: str, state: str) -> dict:
    verifier = _derive_verifier(state)
    link_user_id = _extract_link_user_id(state)
    relay = settings.telegram_relay_url.rstrip("/")
    token_url = f"{relay}/token" if relay else "https://oauth.telegram.org/token"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                token_url,
                auth=(settings.telegram_client_id, settings.telegram_client_secret),
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.telegram_redirect_uri,
                    "client_id": settings.telegram_client_id,
                    "code_verifier": verifier,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Cannot reach Telegram relay server",
        ) from None

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
        "link_user_id": link_user_id,
    }
