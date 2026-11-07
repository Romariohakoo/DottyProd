from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth_session_model import AuthSessionModel


class AuthSessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        session_id: str,
        user_id: int,
        refresh_token_jti: str,
        expires_at: datetime,
    ) -> AuthSessionModel:
        auth_session = AuthSessionModel(
            id=session_id,
            user_id=user_id,
            refresh_token_jti=refresh_token_jti,
            expires_at=expires_at,
        )
        self.session.add(auth_session)
        await self.session.commit()

        return auth_session

    async def get_active_by_id(self, session_id: str) -> AuthSessionModel | None:
        auth_session = await self.session.get(AuthSessionModel, session_id)
        if auth_session is None or auth_session.revoked_at is not None:
            return None

        return auth_session

    async def rotate_refresh_token(
        self,
        session_id: str,
        user_id: int,
        current_jti: str,
        new_jti: str,
        expires_at: datetime,
    ) -> bool:
        result = await self.session.execute(
            update(AuthSessionModel)
            .where(
                AuthSessionModel.id == session_id,
                AuthSessionModel.user_id == user_id,
                AuthSessionModel.refresh_token_jti == current_jti,
                AuthSessionModel.revoked_at.is_(None),
            )
            .values(refresh_token_jti=new_jti, expires_at=expires_at)
        )
        await self.session.commit()

        return result.rowcount == 1

    async def revoke(self, session_id: str) -> None:
        await self.session.execute(
            update(AuthSessionModel)
            .where(AuthSessionModel.id == session_id, AuthSessionModel.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.session.commit()
