from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError

from src.core.config import settings
from src.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from src.core.dependencies import AccessToken, CurrentUser
from src.db.dependencies import SessionDep
from src.schemas.auth import UserResponse, UserUpdate
from src.services import telegram_auth_service as telegram
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service(session: SessionDep) -> AuthService:
    return AuthService(session)


AuthServiceDep = Annotated[AuthService, Depends(_auth_service)]
RefreshCookie = Annotated[str | None, Cookie(alias=REFRESH_COOKIE)]

TELEGRAM_COOKIE = "telegram_login"
TELEGRAM_PATH = "/api/auth/telegram"


@router.post("/telegram/start")
async def telegram_start(response: Response, session: SessionDep):
    url, browser_secret = await telegram.start_login(session)
    response.set_cookie(
        TELEGRAM_COOKIE, browser_secret, max_age=telegram.LOGIN_TTL,
        path=TELEGRAM_PATH, httponly=True, secure=settings.cookie_secure,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"authorization_url": url}


@router.get("/telegram/callback")
async def telegram_callback(
    session: SessionDep,
    auth: AuthServiceDep,
    state: str = Query(default="", max_length=128),
    code: str = Query(default="", max_length=4096),
    error: str = Query(default="", max_length=256),
    browser_secret: Annotated[str | None, Cookie(alias=TELEGRAM_COOKIE)] = None,
):
    frontend = settings.frontend_url.rstrip("/")
    try:
        attempt = await telegram.consume_login(session, state, browser_secret or "")
        if error or not code:
            raise HTTPException(400, "Telegram login cancelled")
        claims = await telegram.exchange_code(code, attempt)
        _, tokens = await auth.login_telegram(claims)
    except (HTTPException, IntegrityError):
        await session.rollback()
        response = RedirectResponse(f"{frontend}/login?telegram_error=1", status_code=303)
    else:
        response = RedirectResponse(f"{frontend}/", status_code=303)
        set_auth_cookies(response, tokens.access.value, tokens.refresh.value)
    response.delete_cookie(TELEGRAM_COOKIE, path=TELEGRAM_PATH,
                           httponly=True, secure=settings.cookie_secure, samesite="lax")
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, user: CurrentUser, session: SessionDep):
    user.username = data.name
    await session.commit()
    return user


@router.post("/refresh", status_code=status.HTTP_204_NO_CONTENT)
async def refresh(response: Response, auth: AuthServiceDep, refresh_token: RefreshCookie = None):
    tokens = await auth.refresh(refresh_token)
    set_auth_cookies(response, tokens.access.value, tokens.refresh.value)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    auth: AuthServiceDep,
    access_token: AccessToken,
    refresh_token: RefreshCookie = None,
):
    await auth.logout(access_token, refresh_token)
    clear_auth_cookies(response)


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    return user
