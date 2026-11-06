from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from src.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from src.core.dependencies import CurrentUser, get_access_token, get_current_auth_session
from src.db.dependencies import SessionDep
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository
from src.schemas.auth import UserLogin, UserRegister, UserResponse
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

RefreshCookie = Annotated[str | None, Cookie(alias=REFRESH_COOKIE)]


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, session: SessionDep):
    return await _auth_service(session).register(data)


@router.post("/login", response_model=UserResponse)
async def login(data: UserLogin, response: Response, session: SessionDep):
    user, tokens = await _auth_service(session).login(data)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return user


@router.post("/refresh", status_code=status.HTTP_204_NO_CONTENT)
async def refresh(session: SessionDep, refresh_token: RefreshCookie = None):
    tokens = await _auth_service(session).refresh(refresh_token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(session: SessionDep, access_token: Annotated[str | None, Depends(get_access_token)], refresh_token: RefreshCookie = None):
    service = _auth_service(session)
    try:
        auth_session = await get_current_auth_session(session, access_token)
    except HTTPException:
        await service.logout_by_refresh_token(refresh_token)
    else:
        await service.logout(auth_session)

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_auth_cookies(response)
    return response


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    return user


def _auth_service(session: SessionDep) -> AuthService:
    return AuthService(UserRepository(session), AuthSessionRepository(session))
