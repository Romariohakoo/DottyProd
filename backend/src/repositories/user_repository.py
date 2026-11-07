from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user_model import UserModel


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> UserModel | None:
        return await self.session.get(UserModel, user_id)

    async def get_by_email(self, email: str) -> UserModel | None:
        return await self.session.scalar(select(UserModel).where(UserModel.email == email))

    async def get_by_username(self, username: str) -> UserModel | None:
        return await self.session.scalar(select(UserModel).where(UserModel.username == username))

    async def get_by_telegram_id(self, telegram_id: int) -> UserModel | None:
        return await self.session.scalar(select(UserModel).where(UserModel.telegram_id == telegram_id))

    async def create(self, username: str, email: str, hashed_password: str) -> UserModel:
        user = UserModel(username=username, email=email, hashed_password=hashed_password)
        self.session.add(user)

        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def get_or_create_by_telegram(
        self,
        telegram_id: int,
        username: str | None = None,
        name: str | None = None,
        avatar_url: str | None = None,
    ) -> UserModel:
        user = await self.get_by_telegram_id(telegram_id)
        if user is not None:
            return user

        chosen_username = username or f"tg_{telegram_id}"
        if await self.get_by_username(chosen_username) is not None:
            chosen_username = f"tg_{telegram_id}"

        user = UserModel(
            username=chosen_username,
            email=f"tg_{telegram_id}@telegram.local",
            hashed_password="",
            telegram_id=telegram_id,
            name=name,
            avatar_url=avatar_url,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
