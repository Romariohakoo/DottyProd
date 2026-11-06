from fastapi import Response

from src.core.config import settings

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"

ACCESS_COOKIE_PATH = "/"
REFRESH_COOKIE_PATH = "/api/auth"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    _set_cookie(
        response,
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        path=ACCESS_COOKIE_PATH,
    )
    _set_cookie(
        response,
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response):
    for key, path in ((ACCESS_COOKIE, ACCESS_COOKIE_PATH), (REFRESH_COOKIE, REFRESH_COOKIE_PATH)):
        response.delete_cookie(
            key=key,
            path=path,
            domain=settings.cookie_domain,
            secure=settings.cookie_secure,
            httponly=True,
            samesite=settings.cookie_samesite,
        )


def _set_cookie(response: Response, *, key: str, value: str, max_age: int, path: str):
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        path=path,
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
