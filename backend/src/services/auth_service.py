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
from src.schemas.auth import UserLogin, UserRegister, UserUpdateCredentials


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
        if user is None or not user.hashed_password or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

        session_id = str(uuid4())
        tokens = _issue_pair(user.id, session_id)
        await self.auth_sessions.create(session_id, user.id, tokens.refresh.jti, tokens.refresh.expires_at)

        return user, tokens

    async def login_telegram(
        self,
        telegram_id: int,
        username: str | None = None,
        name: str | None = None,
        avatar_url: str | None = None,
        link_user_id: int | None = None,
    ) -> tuple[UserModel, TokenPair]:
        existing_tg_user = await self.users.get_by_telegram_id(telegram_id)

        if link_user_id is not None:
            current_user = await self.users.get_by_id(link_user_id)
            if current_user is not None:
                if existing_tg_user is not None and existing_tg_user.id != current_user.id:
                    raise HTTPException(
                        status.HTTP_409_CONFLICT,
                        "Telegram account already linked to another user",
                    )
                user = await self.users.link_telegram(current_user, telegram_id, name, avatar_url)
            else:
                user = await self.users.get_or_create_by_telegram(telegram_id, username, name, avatar_url)
        else:
            user = existing_tg_user or await self.users.get_or_create_by_telegram(
                telegram_id, username, name, avatar_url
            )

        session_id = str(uuid4())
        tokens = _issue_pair(user.id, session_id)
        await self.auth_sessions.create(session_id, user.id, tokens.refresh.jti, tokens.refresh.expires_at)

        return user, tokens

    async def update_credentials(self, user: UserModel, data: UserUpdateCredentials) -> UserModel:
        by_email = await self.users.get_by_email(data.email)
        if by_email is not None and by_email.id != user.id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

        if data.username and data.username != user.username:
            by_username = await self.users.get_by_username(data.username)
            if by_username is not None and by_username.id != user.id:
                raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

        return await self.users.update_credentials(
            user=user,
            email=data.email,
            hashed_password=hash_password(data.password),
            username=data.username,
        )

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
