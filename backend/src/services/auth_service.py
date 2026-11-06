from datetime import datetime, timezone
from uuid import uuid4

import jwt
from fastapi import HTTPException, status

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from src.models.auth_session_model import AuthSessionModel
from src.models.user_model import UserModel
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository
from src.schemas.auth import RefreshTokenRequest, TokenResponse, UserLogin, UserRegister


class AuthService:
    def __init__(self, users: UserRepository, auth_sessions: AuthSessionRepository):
        self.users = users
        self.auth_sessions = auth_sessions

    async def register(self, data: UserRegister) -> UserModel:
        if await self.users.get_by_email(data.email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        if await self.users.get_by_username(data.username) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        return await self.users.create(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
        )

    async def login(self, data: UserLogin) -> TokenResponse:
        user = await self.users.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        return await self._create_session_tokens(user.id)

    async def refresh(self, data: RefreshTokenRequest) -> TokenResponse:
        try:
            payload = decode_access_token(data.refresh_token)
            if payload.get("type") != "refresh":
                raise ValueError
            user_id = int(payload["sub"])
            session_id = payload["sid"]
            refresh_token_jti = payload["jti"]
            if not isinstance(session_id, str) or not isinstance(refresh_token_jti, str):
                raise ValueError
        except (jwt.PyJWTError, TypeError, ValueError, KeyError):
            raise _credentials_exception()

        if await self.users.get_by_id(user_id) is None:
            raise _credentials_exception()

        tokens = self._create_token_pair(user_id, session_id)
        new_refresh_payload = decode_access_token(tokens.refresh_token)
        refresh_expires_at = datetime.fromtimestamp(
            new_refresh_payload["exp"], tz=timezone.utc
        )
        rotated = await self.auth_sessions.rotate_refresh_token(
            session_id=session_id,
            user_id=user_id,
            current_jti=refresh_token_jti,
            new_jti=new_refresh_payload["jti"],
            expires_at=refresh_expires_at,
        )
        if not rotated:
            raise _credentials_exception()
        return tokens

    async def logout(self, auth_session: AuthSessionModel) -> None:
        await self.auth_sessions.revoke(auth_session.id)

    async def _create_session_tokens(self, user_id: int) -> TokenResponse:
        session_id = str(uuid4())
        tokens = self._create_token_pair(user_id, session_id)
        refresh_payload = decode_access_token(tokens.refresh_token)
        await self.auth_sessions.create(
            session_id=session_id,
            user_id=user_id,
            refresh_token_jti=refresh_payload["jti"],
            expires_at=datetime.fromtimestamp(refresh_payload["exp"], tz=timezone.utc),
        )
        return tokens

    @staticmethod
    def _create_token_pair(user_id: int, session_id: str) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(str(user_id), session_id),
            refresh_token=create_refresh_token(str(user_id), session_id),
        )


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
