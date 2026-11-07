from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.cookies import ACCESS_COOKIE
from src.core.security import InvalidToken, read_token
from src.db.dependencies import SessionDep
from src.models.auth_session_model import AuthSessionModel
from src.models.user_model import UserModel
from src.repositories.auth_session_repository import AuthSessionRepository
from src.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def credentials_error() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials")


def get_access_token(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
                     access_cookie: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None):
    if credentials is not None:
        return credentials.credentials

    return access_cookie


AccessToken = Annotated[str | None, Depends(get_access_token)]


async def get_current_auth_session(session: SessionDep, token: AccessToken):
    try:
        claims = read_token(token, "access")
    except InvalidToken:
        raise credentials_error() from None

    auth_session = await AuthSessionRepository(session).get_active_by_id(claims.session_id)
    if auth_session is None or auth_session.user_id != claims.user_id:
        raise credentials_error()

    return auth_session


CurrentAuthSession = Annotated[AuthSessionModel, Depends(get_current_auth_session)]


async def get_current_user(session: SessionDep, auth_session: CurrentAuthSession) -> UserModel:
    user = await UserRepository(session).get_by_id(auth_session.user_id)
    if user is None:
        raise credentials_error()

    return user


CurrentUser = Annotated[UserModel, Depends(get_current_user)]
