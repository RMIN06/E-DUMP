import asyncio
import base64
import binascii
import json
import logging
import re
from datetime import UTC, datetime
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError, PyMongoError
from starlette.datastructures import UploadFile

from app.config import get_settings
from app.errors import DomainError
from app.integrations.r2 import Storage
from app.models.file import FileRecord
from app.models.material import (
    Download,
    Material,
    MaterialCreate,
    MaterialKind,
    MaterialPage,
    MaterialRecord,
)
from app.models.report import ReportCreate, ReportReceipt
from app.models.user import UserRecord
from app.repositories import files, materials, reports, subjects
from app.repositories.materials import Database
from app.services.upload_validation import validate_upload

logger = logging.getLogger(__name__)


def identifier(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise DomainError("not_found", "Material not found.", 404) from exc


async def require_subject(database: Database, slug: str) -> None:
    if await subjects.by_slug(database, slug) is None:
        raise DomainError("not_found", "Subject not found.", 404)


def cursor_query(cursor: str) -> dict[str, object]:
    try:
        if len(cursor) > 512:
            raise ValueError("Long cursor")
        raw = json.loads(
            base64.b64decode(cursor.encode("ascii"), altchars=b"-_", validate=True)
        )
        if not isinstance(raw, dict) or set(raw) != {"created_at", "_id"}:
            raise ValueError("Bad cursor")
        created = datetime.fromisoformat(raw["created_at"])
        if created.tzinfo is None:
            raise ValueError("Missing timezone")
        last_id = ObjectId(raw["_id"])
        return {
            "$or": [
                {"created_at": {"$lt": created}},
                {"created_at": created, "_id": {"$lt": last_id}},
            ]
        }
    except (ValueError, TypeError, KeyError, binascii.Error, InvalidId) as exc:
        raise DomainError("validation_error", "Invalid page cursor.", 422) from exc


async def list_materials(
    database: Database,
    slug: str,
    kind: MaterialKind | None,
    chapter: int | None,
    q: str,
    cursor: str | None,
    limit: int,
) -> MaterialPage:
    await require_subject(database, slug)
    query: dict[str, object] = {"subject_slug": slug, "status": "active"}
    if kind is not None:
        query["kind"] = kind
    if chapter is not None:
        query["chapter"] = chapter
    terms: list[dict[str, object]] = []
    for token in q.lower().strip().split():
        match: dict[str, object] = {"search_text": {"$regex": re.escape(token)}}
        if token.isascii() and token.isdigit():
            match = {"$or": [match, {"chapter": int(token)}]}
        terms.append(match)
    if cursor:
        terms.append(cursor_query(cursor))
    if terms:
        query["$and"] = terms
    results = await materials.list_page(database, query, limit + 1)
    next_cursor = None
    if len(results) > limit:
        last = results[limit - 1]
        next_cursor = base64.urlsafe_b64encode(
            json.dumps(
                {"created_at": last.created_at.isoformat(), "_id": last.id}
            ).encode()
        ).decode()
    return MaterialPage(
        items=results[:limit],
        next_cursor=next_cursor,
        chapters=await materials.chapters(database, slug),
    )


async def detail(database: Database, value: str) -> Material:
    item = await materials.detail(database, identifier(value))
    if item is None:
        raise DomainError("not_found", "Material not found.", 404)
    return item


def duplicate_error(record: MaterialRecord) -> DomainError:
    return DomainError(
        "duplicate",
        f"Already uploaded as '{record.title}'.",
        409,
        {"existing_material_id": str(record.id), "title": record.title},
    )


async def upload_material(
    database: Database,
    storage: Storage,
    lock: asyncio.Lock,
    user: UserRecord,
    slug: str,
    upload: UploadFile,
    data: MaterialCreate,
) -> Material:
    await require_subject(database, slug)
    settings = get_settings()
    validated = await validate_upload(upload, settings.max_upload_mb * 1024 * 1024)
    try:
        async with lock:
            duplicate = await materials.duplicate(database, slug, validated.sha256)
            if duplicate:
                raise duplicate_error(duplicate)
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
            record = MaterialRecord(
                _id=ObjectId(),
                **data.model_dump(),
                subject_slug=slug,
                file_id=file.id,
                uploader_id=user.id,
                uploader_name_snapshot=user.name or "Class member",
                file_sha256=file.sha256,
                search_text=" ".join(
                    [
                        data.title,
                        f"chapter {data.chapter}" if data.chapter is not None else "",
                        file.original_name,
                    ]
                ).lower(),
                status="active",
                created_at=now,
                updated_at=now,
            )
            inserted = False
            try:
                await storage.put(file.key, validated.body, file.mime_type)
                await files.insert(database, file)
                await materials.insert(database, record)
                inserted = True
                await files.set_status(database, file.id, "ready")
            except BaseException as exc:
                if not inserted:
                    try:
                        await storage.delete(file.key)
                        await files.remove(database, file.id)
                    except Exception:
                        # Preserve a pending record for the hourly retry when possible.
                        try:
                            if await files.by_id(database, file.id) is None:
                                await files.insert(database, file)
                        except PyMongoError:
                            logger.error("Upload rollback requires operator cleanup.")
                if isinstance(exc, DuplicateKeyError):
                    duplicate = await materials.duplicate(database, slug, file.sha256)
                    if duplicate:
                        raise duplicate_error(duplicate) from exc
                raise
            return await detail(database, str(record.id))
    finally:
        validated.body.close()


async def download(database: Database, storage: Storage, value: str) -> Download:
    item = await detail(database, value)
    file = await files.by_id(database, ObjectId(item.file_id))
    if file is None or file.status == "deleted":
        raise DomainError("not_found", "File not found.", 404)
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


async def remove_material(
    database: Database,
    storage: Storage,
    lock: asyncio.Lock,
    user: UserRecord,
    value: str,
) -> None:
    async with lock:
        record = await materials.by_id(database, identifier(value))
        if record is None:
            raise DomainError("not_found", "Material not found.", 404)
        if record.uploader_id != user.id and user.role != "admin":
            raise DomainError(
                "forbidden", "Only the uploader or an admin can remove this file.", 403
            )
        file = await files.by_id(database, record.file_id)
        if file:
            await storage.delete(file.key)
            await files.set_status(database, file.id, "deleted")
        await materials.remove(database, record.id, datetime.now(UTC))


async def report_material(
    database: Database, user: UserRecord, value: str, data: ReportCreate
) -> ReportReceipt:
    item = await detail(database, value)
    try:
        return ReportReceipt(
            id=await reports.insert(database, ObjectId(item.id), user.id, data)
        )
    except DuplicateKeyError as exc:
        raise DomainError(
            "duplicate", "You already reported this material.", 409
        ) from exc
