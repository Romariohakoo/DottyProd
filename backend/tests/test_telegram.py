import asyncio
import json
import time

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from pydantic import SecretStr

from src.core.config import settings
from src.models.telegram_login_model import TelegramLoginModel
from src.services import telegram_auth_service as telegram
from src.services.telegram_notification_service import send_event_reminder


@pytest.fixture
def signed_token(monkeypatch):
    monkeypatch.setattr(settings, "telegram_client_id", "12345")
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private.public_key()))
    jwk.update(kid="test-key", alg="RS256", use="sig")
    claims = {"sub": "subject-101", "id": 101, "iss": telegram.ISSUER, "aud": "12345",
              "iat": int(time.time()), "exp": int(time.time())+600, "nonce": "nonce"}
    def sign(**changes):
        return jwt.encode({**claims, **changes}, private, algorithm="RS256", headers={"kid": "test-key"})
    return sign, {"keys": [jwk]}


def test_signature_validation(signed_token):
    sign, jwks = signed_token
    assert telegram.validate_id_token(sign(), jwks, "nonce")["id"] == 101


@pytest.mark.parametrize("changes", [
    {"iss": "https://evil.example"}, {"aud": "different-client"}, {"exp": 1},
    {"nonce": "wrong"}, {"id": True}, {"id": -1}, {"sub": ""}, {"name": []},
])
def test_invalid_claims_rejected(signed_token, changes):
    sign, jwks = signed_token
    with pytest.raises(jwt.PyJWTError):
        telegram.validate_id_token(sign(**changes), jwks, "nonce")


def test_forged_signature_rejected(signed_token):
    sign, jwks = signed_token
    token = sign()
    header, payload, signature = token.split(".")
    signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    with pytest.raises(jwt.PyJWTError):
        telegram.validate_id_token(f"{header}.{payload}.{signature}", jwks, "nonce")


def test_code_exchange_uses_pkce_and_basic_auth(signed_token, monkeypatch):
    sign, jwks = signed_token
    monkeypatch.setattr(settings, "telegram_client_secret", SecretStr("client-secret"))
    def handler(request):
        if request.url.path == "/token":
            assert request.headers["authorization"].startswith("Basic ")
            assert b"code_verifier=verifier" in request.content
            assert b"code=one-use-code" in request.content
            return httpx.Response(200, json={"id_token": sign()})
        assert request.url.path == "/.well-known/jwks.json"
        return httpx.Response(200, json=jwks)
    original = httpx.AsyncClient
    monkeypatch.setattr(telegram.httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(handler), **kw))
    claims = asyncio.run(telegram.exchange_code("one-use-code", TelegramLoginModel(verifier="verifier", nonce="nonce")))
    assert claims["id"] == 101


def test_notifications_disabled_by_default(monkeypatch):
    from datetime import datetime, timezone
    monkeypatch.setattr(settings, "telegram_notifications_enabled", False)
    assert asyncio.run(send_event_reminder(101, "Экскурсия", datetime.now(timezone.utc))) == "disabled"
