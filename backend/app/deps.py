import asyncio
from typing import Annotated, cast

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.asynchronous.database import AsyncDatabase
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.errors import DomainError, Unavailable
from app.integrations.r2 import R2Storage, Storage
from app.models.user import UserRecord
from app.services import auth_service

limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")


def user_rate_key(request: Request) -> str:
    return str(request.state.user_id)


def get_db(request: Request) -> AsyncDatabase[dict[str, object]]:
    database = request.app.state.db
    if database is None:
        raise Unavailable()
    return cast(AsyncDatabase[dict[str, object]], database)


def get_auth_lock(request: Request) -> asyncio.Lock:
    return cast(asyncio.Lock, request.app.state.auth_lock)


bearer = HTTPBearer(auto_error=False)
Database = Annotated[AsyncDatabase[dict[str, object]], Depends(get_db)]
AuthLock = Annotated[asyncio.Lock, Depends(get_auth_lock)]


def get_storage() -> Storage:
    return R2Storage(get_settings())


def get_material_lock(request: Request) -> asyncio.Lock:
    return cast(asyncio.Lock, request.app.state.material_lock)


ObjectStorage = Annotated[Storage, Depends(get_storage)]
MaterialLock = Annotated[asyncio.Lock, Depends(get_material_lock)]


def require_bearer(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise DomainError("unauthorized", "Sign in to continue.", 401)
    return credentials.credentials


async def get_current_user(
    request: Request,
    token: Annotated[str, Depends(require_bearer)],
    database: Database,
    lock: AuthLock,
) -> UserRecord:
    user = await auth_service.current_user(database, token, lock)
    request.state.user_id = str(user.id)
    return user


CurrentUser = Annotated[UserRecord, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> UserRecord:
    if user.role != "admin":
        raise DomainError("forbidden", "An admin is required.", 403)
    return user
