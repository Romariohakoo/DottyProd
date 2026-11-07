from dataclasses import dataclass
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import credentials_error
from src.core.security import (
    InvalidToken,
    IssuedToken,
    hash_password,
    issue_access_token,
    issue_refresh_token,
    read_token,
    verify_password,
)
from src.models.user_model import UserModel
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository
from src.schemas.auth import UserLogin, UserRegister


@dataclass(frozen=True)
class TokenPair:
    access: IssuedToken
    refresh: IssuedToken


class AuthService:
    def __init__(self, session: AsyncSession):
        self.users = UserRepository(session)
        self.auth_sessions = AuthSessionRepository(session)

    async def register(self, data: UserRegister) -> UserModel:
        if await self.users.get_by_email(data.email) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
        if await self.users.get_by_username(data.username) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

        return await self.users.create(data.username, data.email, hash_password(data.password))

    async def login(self, data: UserLogin) -> tuple[UserModel, TokenPair]:
        user = await self.users.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

        session_id = str(uuid4())
        tokens = _issue_pair(user.id, session_id)
        await self.auth_sessions.create(session_id, user.id, tokens.refresh.jti, tokens.refresh.expires_at)

        return user, tokens

    async def refresh(self, refresh_token: str | None) -> TokenPair:
        try:
            claims = read_token(refresh_token, "refresh")
        except InvalidToken:
            raise credentials_error() from None

        if await self.users.get_by_id(claims.user_id) is None:
            raise credentials_error()

        tokens = _issue_pair(claims.user_id, claims.session_id)
        rotated = await self.auth_sessions.rotate_refresh_token(
            session_id=claims.session_id,
            user_id=claims.user_id,
            current_jti=claims.jti,
            new_jti=tokens.refresh.jti,
            expires_at=tokens.refresh.expires_at,
        )
        if not rotated:
            raise credentials_error()

        return tokens

    async def logout(self, access_token: str | None, refresh_token: str | None) -> None:
        for token, token_type in ((access_token, "access"), (refresh_token, "refresh")):
            try:
                claims = read_token(token, token_type)
            except InvalidToken:
                continue

            auth_session = await self.auth_sessions.get_active_by_id(claims.session_id)
            if auth_session is not None and auth_session.user_id == claims.user_id:
                await self.auth_sessions.revoke(auth_session.id)
                return


def _issue_pair(user_id: int, session_id: str) -> TokenPair:
    return TokenPair(
        access=issue_access_token(user_id, session_id),
        refresh=issue_refresh_token(user_id, session_id),
    )
