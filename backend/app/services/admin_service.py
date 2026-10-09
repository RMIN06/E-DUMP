import asyncio
from datetime import UTC, datetime
from typing import cast

from bson import ObjectId

from app.errors import DomainError
from app.integrations.r2 import Storage
from app.models.admin import AdminReport, ReportAction, UserPatch
from app.models.user import User, UserRecord
from app.repositories import materials, refresh_tokens, reports, users
from app.repositories.files import Database
from app.services import material_service


def identifier(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise DomainError("not_found", "Record not found.", 404)
    return ObjectId(value)


async def authorize(database: Database, actor: UserRecord) -> None:
    current = await users.by_id(database, actor.id)
    if current is None or not current.is_active or current.role != "admin":
        raise DomainError("forbidden", "An active admin is required.", 403)


async def list_users(database: Database, text: str) -> list[User]:
    return [User.from_record(user) for user in await users.search(database, text)]


async def change_user(
    database: Database,
    lock: asyncio.Lock,
    actor: UserRecord,
    value: str,
    patch: UserPatch,
) -> User:
    async with lock:
        await authorize(database, actor)
        target = await users.by_id(database, identifier(value))
        if target is None:
            raise DomainError("not_found", "User not found.", 404)
        fields = patch.model_dump(exclude_unset=True)
        loses_admin = fields.get("role", target.role) != "admin" or not fields.get(
            "is_active", target.is_active
        )
        if target.id == actor.id and loses_admin:
            raise DomainError(
                "forbidden", "You cannot remove your own admin access.", 403
            )
        if (
            target.role == "admin"
            and target.is_active
            and loses_admin
            and await users.active_admin_count(database) <= 1
        ):
            raise DomainError("forbidden", "Keep at least one active admin.", 403)
        updated = await users.change(database, target.id, fields)
        if not updated.is_active:
            await refresh_tokens.revoke_user(database, target.id, datetime.now(UTC))
        return User.from_record(updated)


async def list_reports(database: Database, status: str) -> list[AdminReport]:
    return await reports.list_reports(database, status)


async def resolve_report(
    database: Database,
    storage: Storage,
    auth_lock: asyncio.Lock,
    material_lock: asyncio.Lock,
    actor: UserRecord,
    value: str,
    body: ReportAction,
) -> None:
    async with auth_lock:
        await authorize(database, actor)
        item = await reports.by_id(database, identifier(value))
        if item is None:
            raise DomainError("not_found", "Report not found.", 404)
        if item["status"] != "open":
            raise DomainError("conflict", "This report has already been handled.", 409)
        material_id = cast(ObjectId, item["material_id"])
        if body.action == "remove_material" and await materials.by_id(
            database, material_id
        ):
            await material_service.remove_material(
                database, storage, material_lock, actor, str(material_id)
            )
        await reports.resolve(
            database,
            identifier(value),
            actor.id,
            "resolved" if body.action == "remove_material" else "dismissed",
        )


async def delete_account(
    database: Database, lock: asyncio.Lock, user: UserRecord
) -> None:
    async with lock:
        current = await users.by_id(database, user.id)
        if current is None:
            raise DomainError("unauthorized", "Sign in to continue.", 401)
        if not current.is_active:
            raise DomainError("account_disabled", "Contact a class admin.", 403)
        if (
            current.role == "admin"
            and current.is_active
            and await users.active_admin_count(database) <= 1
        ):
            raise DomainError(
                "forbidden",
                "Make another active member an admin before deleting your account.",
                403,
            )
        await users.delete(database, user.id)
