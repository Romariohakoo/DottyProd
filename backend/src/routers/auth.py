from fastapi import APIRouter, Response, status

from src.core.dependencies import CurrentAuthSession, CurrentUser
from src.db.dependencies import SessionDep
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository
from src.schemas.auth import (
    RefreshTokenRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserRegister, session: SessionDep):
    return await _auth_service(session).register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, session: SessionDep):
    return await _auth_service(session).login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshTokenRequest, session: SessionDep):
    return await _auth_service(session).refresh(data)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(auth_session: CurrentAuthSession, session: SessionDep) -> Response:
    await _auth_service(session).logout(auth_session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    return user


def _auth_service(session: SessionDep) -> AuthService:
    return AuthService(UserRepository(session), AuthSessionRepository(session))
