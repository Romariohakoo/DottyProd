import pytest
from pydantic import ValidationError

from src.core.config import Settings

REQUIRED = {
    "postgres_username": "u",
    "postgres_password": "p",
    "postgres_host": "localhost",
    "postgres_port": 5432,
    "postgres_database": "d",
    "secret_key": "test-secret",
}


def _settings(**overrides):
    return Settings(_env_file=None, **{**REQUIRED, **overrides})


def test_samesite_defaults_to_lax_without_secure():
    settings = _settings()
    assert settings.cookie_samesite == "lax"
    assert settings.cookie_secure is False


def test_samesite_none_forces_secure():
    settings = _settings(cookie_samesite="none", cookie_secure=False)
    assert settings.cookie_samesite == "none"
    assert settings.cookie_secure is True


def test_samesite_is_case_insensitive():
    assert _settings(cookie_samesite="None").cookie_samesite == "none"


def test_samesite_rejects_unknown_value():
    with pytest.raises(ValidationError):
        _settings(cookie_samesite="sometimes")
