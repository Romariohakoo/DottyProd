import logging
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import hash_password
from src.models.user_model import UserModel

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DemoUser:
    username: str
    email: str
    password: str


DEMO_USERS: tuple[DemoUser, ...] = (
    DemoUser("user1name", "user1@gmail.com", "user1pass"),
    DemoUser("user2name", "user2@gmail.com", "user2pass"),
    DemoUser("user3name", "user3@gmail.com", "user3pass"),
    DemoUser("user4name", "user4@gmail.com", "user4pass"),
    DemoUser("user5name", "user5@gmail.com", "user5pass"),
    DemoUser("user6name", "user6@gmail.com", "user6pass"),
    DemoUser("user7name", "user7@gmail.com", "user7pass"),
)


async def seed_demo_users(session: AsyncSession, users: tuple[DemoUser, ...] = DEMO_USERS) -> int:
    taken = await session.execute(
        select(UserModel.username, UserModel.email).where(
            or_(
                UserModel.username.in_([user.username for user in users]),
                UserModel.email.in_([user.email for user in users]),
            )
        )
    )
    taken_usernames, taken_emails = set(), set()
    for username, email in taken:
        taken_usernames.add(username)
        taken_emails.add(email)

    rows = []
    for user in users:
        username_taken = user.username in taken_usernames
        email_taken = user.email in taken_emails
        if username_taken and email_taken:
            continue
        if username_taken or email_taken:
            logger.warning(
                "Demo user %s skipped: username or email belongs to another account",
                user.username,
            )
            continue
        rows.append(
            {
                "username": user.username,
                "email": user.email,
                "hashed_password": hash_password(user.password),
            }
        )

    if not rows:
        return 0

    result = await session.execute(
        insert(UserModel).values(rows).on_conflict_do_nothing().returning(UserModel.id)
    )
    created = len(result.all())
    await session.commit()
    return created
