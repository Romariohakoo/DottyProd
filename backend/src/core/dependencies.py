from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.cookies import ACCESS_COOKIE
from src.core.security import decode_access_token
from src.db.dependencies import SessionDep
from src.models.auth_session_model import AuthSessionModel
from src.models.user_model import UserModel
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_access_token(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
                     access_cookie: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None):
    # Явный Authorization важнее куки: Swagger Authorize и curl не должны
    # молча авторизоваться сессией браузера.
    if credentials is not None:
        return credentials.credentials
    if access_cookie:
        return access_cookie
    return None


async def get_current_auth_session(
    session: SessionDep,
    token: Annotated[str | None, Depends(get_access_token)],
) -> AuthSessionModel:
    if not token:
        raise _credentials_exception()
    try:
        payload = decode_access_token(token)
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
