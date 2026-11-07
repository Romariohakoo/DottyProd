from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status
from fastapi.responses import RedirectResponse

from src.core.config import settings
from src.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from src.core.dependencies import AccessToken, CurrentUser
from src.core.security import InvalidToken, read_token
from src.db.dependencies import SessionDep
from src.schemas.auth import UserLogin, UserRegister, UserResponse, UserUpdateCredentials
from src.services.auth_service import AuthService
from src.services.telegram_oauth import build_telegram_auth_url, fetch_telegram_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service(session: SessionDep) -> AuthService:
    return AuthService(session)


AuthServiceDep = Annotated[AuthService, Depends(_auth_service)]
RefreshCookie = Annotated[str | None, Cookie(alias=REFRESH_COOKIE)]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, auth: AuthServiceDep):
    return await auth.register(data)


@router.post("/login", response_model=UserResponse)
async def login(data: UserLogin, response: Response, auth: AuthServiceDep):
    user, tokens = await auth.login(data)
    set_auth_cookies(response, tokens.access.value, tokens.refresh.value)

    return user


@router.post("/telegram/start")
async def telegram_start(access_token: AccessToken = None):
    link_user_id: int | None = None
    if access_token:
        try:
            claims = read_token(access_token, "access")
            link_user_id = claims.user_id
        except InvalidToken:
            link_user_id = None

    return {"authorization_url": build_telegram_auth_url(link_user_id=link_user_id)}


@router.get("/telegram/callback")
async def telegram_callback(
    auth: AuthServiceDep,
    code: str | None = None,
    state: str | None = None,
):
    if not code or not state:
        return RedirectResponse(f"{settings.frontend_url}/login", status_code=status.HTTP_302_FOUND)

    tg_user = await fetch_telegram_user(code, state)
    _, tokens = await auth.login_telegram(**tg_user)

    redirect = RedirectResponse(url=settings.frontend_url, status_code=status.HTTP_302_FOUND)
    set_auth_cookies(redirect, tokens.access.value, tokens.refresh.value)
    return redirect


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


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdateCredentials, user: CurrentUser, auth: AuthServiceDep):
    return await auth.update_credentials(user, data)
