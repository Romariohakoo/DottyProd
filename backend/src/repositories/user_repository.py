from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user_model import UserModel


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> UserModel | None:
        return await self.session.get(UserModel, user_id)

    async def get_or_create_telegram(self, claims: dict) -> UserModel | None:
        # Handle conflicts on BOTH unique identities, including concurrent inserts.
        # Never merge accounts by display name or just one identity field.
        statement = insert(UserModel).values(
            telegram_subject=claims["sub"],
            telegram_id=claims["id"],
            username=claims.get("preferred_username") or claims.get("name") or "Пользователь Telegram",
        )
        statement = statement.on_conflict_do_nothing().returning(UserModel)
        user = (await self.session.execute(statement)).scalar_one_or_none()
        if user is None:
            user = (await self.session.execute(select(UserModel).where(
                UserModel.telegram_subject == claims["sub"],
                UserModel.telegram_id == claims["id"],
            ))).scalar_one_or_none()
        await self.session.commit()
        return user
