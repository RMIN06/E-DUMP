import asyncio
import base64
import binascii
import json
import logging
from datetime import UTC, datetime
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from pydantic import ValidationError
from starlette.datastructures import UploadFile

from app.config import get_settings
from app.errors import DomainError
from app.integrations.r2 import Storage
from app.models.announcement import (
    Announcement,
    AnnouncementPage,
    AnnouncementPatch,
    AnnouncementRecord,
    AnnouncementType,
    AnnouncementWrite,
    Attachment,
)
from app.models.file import FileRecord
from app.models.material import Download
from app.models.user import UserRecord
from app.repositories import announcements, files, materials, subjects, users
from app.repositories.files import Database
from app.services.upload_validation import validate_upload

logger = logging.getLogger(__name__)


def identifier(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise DomainError("not_found", "Update not found.", 404)
    return ObjectId(value)


async def record(database: Database, value: str) -> AnnouncementRecord:
    item = await announcements.by_id(database, identifier(value))
    if item is None:
        raise DomainError("not_found", "Update not found.", 404)
    return item


def attachment(file: FileRecord) -> Attachment:
    return Attachment(
        file_id=str(file.id),
        original_name=file.original_name,
        mime_type=file.mime_type,
        size_bytes=file.size_bytes,
    )


async def present(database: Database, item: AnnouncementRecord) -> Announcement:
    attached = []
    for value in item.file_ids:
        file = await files.by_id(database, ObjectId(value))
        if file and file.status != "deleted":
            attached.append(attachment(file))
    author = await users.by_id(database, item.author_id)
    return Announcement(
        **item.model_dump(exclude={"id", "author_id", "author_name_snapshot"}),
        id=str(item.id),
        author_id=str(item.author_id),
        author_name=(author.name or "Class member") if author else "Former member",
        attachments=attached,
    )


async def detail(database: Database, value: str) -> Announcement:
    return await present(database, await record(database, value))


def cursor_query(value: str) -> dict[str, object]:
    try:
        raw = json.loads(
            base64.b64decode(value.encode("ascii"), altchars=b"-_", validate=True)
        )
        if (
            not isinstance(raw, dict)
            or set(raw) != {"pinned", "created_at", "_id"}
            or type(raw["pinned"]) is not bool
        ):
            raise ValueError()
        created = datetime.fromisoformat(raw["created_at"])
        if created.tzinfo is None:
            raise ValueError()
        last_id = ObjectId(raw["_id"])
        terms: list[dict[str, object]] = [
            {"pinned": raw["pinned"], "created_at": {"$lt": created}},
            {"pinned": raw["pinned"], "created_at": created, "_id": {"$lt": last_id}},
        ]
        if raw["pinned"]:
            terms.append({"pinned": False})
        return {"$or": terms}
    except (ValueError, TypeError, KeyError, binascii.Error, InvalidId) as exc:
        raise DomainError("validation_error", "Invalid page cursor.", 422) from exc


async def list_updates(
    database: Database,
    kind: AnnouncementType | None,
    subject: str | None,
    cursor: str | None,
    limit: int,
) -> AnnouncementPage:
    query: dict[str, object] = {}
    if kind:
        query["type"] = kind
    if subject:
        query["subject_slug"] = subject
    if cursor:
        query.update(cursor_query(cursor))
    rows = await announcements.page(database, query, limit + 1)
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = base64.urlsafe_b64encode(
            json.dumps(
                {
                    "pinned": last.pinned,
                    "created_at": last.created_at.isoformat(),
                    "_id": str(last.id),
                }
            ).encode()
        ).decode()
    return AnnouncementPage(
        items=[await present(database, item) for item in rows[:limit]],
        next_cursor=next_cursor,
    )


async def upcoming(database: Database, limit: int) -> list[Announcement]:
    rows = await announcements.page(
        database, {"due_at": {"$gt": datetime.now(UTC)}}, limit, upcoming=True
    )
    return [await present(database, item) for item in rows]


async def validate_links(
    database: Database, user: UserRecord, data: AnnouncementWrite, retained: list[str]
) -> None:
    if (
        data.subject_slug
        and await subjects.by_slug(database, data.subject_slug) is None
    ):
        raise DomainError("not_found", "Subject not found.", 404)
    for value in data.file_ids:
        if value in retained:
            continue
        file = await files.by_id(database, ObjectId(value))
        if (
            file is None
            or file.uploader_id != user.id
            or file.status != "pending"
            or await announcements.referenced(database, file.id)
            or await materials.referenced(database, file.id)
        ):
            raise DomainError(
                "validation_error", "Choose attachments uploaded for this update.", 422
            )


async def create(
    database: Database, lock: asyncio.Lock, user: UserRecord, data: AnnouncementWrite
) -> AnnouncementRecord:
    async with lock:
        await validate_links(database, user, data, [])
        now = datetime.now(UTC)
        item = AnnouncementRecord(
            _id=ObjectId(),
            **data.model_dump(),
            author_id=user.id,
            author_name_snapshot=user.name or "Class member",
            created_at=now,
            updated_at=now,
        )
        await announcements.insert(database, item)
        for value in item.file_ids:
            await files.set_status(database, ObjectId(value), "ready")
        return item


async def clean_files(database: Database, storage: Storage, values: list[str]) -> None:
    for value in values:
        file = await files.by_id(database, ObjectId(value))
        if file:
            await files.set_status(database, file.id, "pending")
            try:
                await storage.delete(file.key)
                await files.set_status(database, file.id, "deleted")
            except Exception:
                logger.warning("Detached attachment cleanup will retry hourly.")


async def edit(
    database: Database,
    storage: Storage,
    lock: asyncio.Lock,
    user: UserRecord,
    value: str,
    patch: AnnouncementPatch,
) -> AnnouncementRecord:
    async with lock:
        original = await record(database, value)
        updated = original.model_dump(by_alias=True) | patch.model_dump(
            exclude_unset=True
        )
        try:
            item = AnnouncementRecord.model_validate(updated)
        except ValidationError as exc:
            raise DomainError(
                "validation_error", "Check the submitted fields.", 422
            ) from exc
        data = AnnouncementWrite.model_validate(
            {name: getattr(item, name) for name in AnnouncementWrite.model_fields}
        )
        await validate_links(database, user, data, original.file_ids)
        item.updated_at = datetime.now(UTC)
        await announcements.update(database, item)
        for file_id in item.file_ids:
            await files.set_status(database, ObjectId(file_id), "ready")
        await clean_files(
            database,
            storage,
            [file_id for file_id in original.file_ids if file_id not in item.file_ids],
        )
        return item


async def remove(
    database: Database, storage: Storage, lock: asyncio.Lock, value: str
) -> None:
    async with lock:
        item = await record(database, value)
        await announcements.remove(database, item.id)
        await clean_files(database, storage, item.file_ids)


async def upload(
    database: Database,
    storage: Storage,
    lock: asyncio.Lock,
    user: UserRecord,
    upload: UploadFile,
) -> Attachment:
    settings = get_settings()
    validated = await validate_upload(upload, settings.max_upload_mb * 1024 * 1024)
    try:
        async with lock:
            if (
                await files.used_bytes(database, user.id) + validated.size_bytes
                > settings.upload_quota_mb * 1024 * 1024
            ):
                raise DomainError(
                    "quota_exceeded",
                    "Your upload storage limit is reached. Remove an old file first.",
                    413,
                )
            now = datetime.now(UTC)
            file = FileRecord(
                _id=ObjectId(),
                key=f"files/{now:%Y}/{now:%m}/{uuid4()}.{validated.extension}",
                original_name=validated.original_name,
                mime_type=validated.mime_type,
                size_bytes=validated.size_bytes,
                sha256=validated.sha256,
                uploader_id=user.id,
                status="pending",
                created_at=now,
            )
            # Persist first so hourly cleanup can reclaim a failed upload.
            await files.insert(database, file)
            await storage.put(file.key, validated.body, file.mime_type)
            return attachment(file)
    finally:
        validated.body.close()


async def download(
    database: Database, storage: Storage, value: str, file_id: str
) -> Download:
    item = await record(database, value)
    if file_id not in item.file_ids:
        raise DomainError("not_found", "Attachment not found.", 404)
    file = await files.by_id(database, ObjectId(file_id))
    if not file or file.status == "deleted":
        raise DomainError("not_found", "Attachment not found.", 404)
    ttl = get_settings().download_url_ttl_sec
    return Download(
        url=await storage.download_url(
            file.key, file.original_name, file.mime_type, ttl
        ),
        expires_in=ttl,
        filename=file.original_name,
        mime_type=file.mime_type,
        size_bytes=file.size_bytes,
    )
