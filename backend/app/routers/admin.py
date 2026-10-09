from typing import Annotated, Literal

from fastapi import APIRouter, Query, Request, Response

from app.deps import (
    AdminUser,
    AuthLock,
    Database,
    MaterialLock,
    ObjectStorage,
    limiter,
    user_rate_key,
)
from app.models.admin import AdminReport, ReportAction, UserPatch
from app.models.user import User
from app.services import admin_service

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/users", response_model=list[User])
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def users(
    request: Request,
    user: AdminUser,
    database: Database,
    q: Annotated[str, Query(max_length=100)] = "",
) -> list[User]:
    return await admin_service.list_users(database, q)


@router.patch("/users/{id}", response_model=User)
async def change_user(
    body: UserPatch, user: AdminUser, database: Database, lock: AuthLock, id: str
) -> User:
    return await admin_service.change_user(database, lock, user, id, body)


@router.get("/reports", response_model=list[AdminReport])
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def reports(
    request: Request,
    user: AdminUser,
    database: Database,
    status: Literal["open", "resolved", "dismissed"] = "open",
) -> list[AdminReport]:
    return await admin_service.list_reports(database, status)


@router.patch("/reports/{id}", status_code=204)
async def resolve_report(
    body: ReportAction,
    user: AdminUser,
    database: Database,
    storage: ObjectStorage,
    auth_lock: AuthLock,
    material_lock: MaterialLock,
    id: str,
) -> Response:
    await admin_service.resolve_report(
        database, storage, auth_lock, material_lock, user, id, body
    )
    return Response(status_code=204)
