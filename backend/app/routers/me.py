from fastapi import APIRouter, Response

from app.deps import AuthLock, CurrentUser, Database
from app.models.device import DeviceWrite
from app.models.user import NameRequest, User
from app.services import admin_service, device_service, user_service

router = APIRouter(prefix="/api/v1/me", tags=["me"])


@router.delete("", status_code=204)
async def delete_account(
    user: CurrentUser, database: Database, lock: AuthLock
) -> Response:
    await admin_service.delete_account(database, lock, user)
    return Response(status_code=204)


@router.get("", response_model=User)
async def me(user: CurrentUser) -> User:
    return User.from_record(user)


@router.patch("", response_model=User)
async def update_me(body: NameRequest, user: CurrentUser, database: Database) -> User:
    return await user_service.update_name(database, user, body.name)


@router.post("/seen-updates", status_code=204)
async def seen_updates(user: CurrentUser, database: Database) -> Response:
    await device_service.seen(database, user)
    return Response(status_code=204)


@router.put("/devices", status_code=204)
async def register_device(
    body: DeviceWrite, user: CurrentUser, database: Database
) -> Response:
    await device_service.register(database, user, body)
    return Response(status_code=204)


@router.delete("/devices/{token}", status_code=204)
async def unregister_device(
    token: str, user: CurrentUser, database: Database
) -> Response:
    await device_service.unregister(database, user, token)
    return Response(status_code=204)
