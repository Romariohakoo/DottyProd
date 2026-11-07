from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status

from src.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from src.core.dependencies import AccessToken, CurrentUser
from src.db.dependencies import SessionDep
from src.schemas.auth import UserLogin, UserRegister, UserResponse
from src.services.auth_service import AuthService

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
