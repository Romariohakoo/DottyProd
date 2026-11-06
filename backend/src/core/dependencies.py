from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.security import decode_access_token
from src.db.dependencies import SessionDep
from src.models.auth_session_model import AuthSessionModel
from src.models.user_model import UserModel
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer()


async def get_current_auth_session(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> AuthSessionModel:
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError
        subject = payload.get("sub")
        user_id = int(subject)
        session_id = payload["sid"]
        if not isinstance(session_id, str):
            raise ValueError
    except (jwt.PyJWTError, TypeError, ValueError, KeyError):
        raise _credentials_exception()

    auth_session = await AuthSessionRepository(session).get_active_by_id(session_id)
    if auth_session is None or auth_session.user_id != user_id:
        raise _credentials_exception()
    return auth_session


async def get_current_user(
    session: SessionDep,
    auth_session: Annotated[AuthSessionModel, Depends(get_current_auth_session)],
) -> UserModel:
    user = await UserRepository(session).get_by_id(auth_session.user_id)
    if user is None:
        raise _credentials_exception()
    return user


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


CurrentAuthSession = Annotated[AuthSessionModel, Depends(get_current_auth_session)]
CurrentUser = Annotated[UserModel, Depends(get_current_user)]
