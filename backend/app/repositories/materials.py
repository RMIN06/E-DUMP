from datetime import datetime

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.file import FileRecord
from app.models.material import Material, MaterialRecord

type Database = AsyncDatabase[dict[str, object]]


def public(row: dict[str, object]) -> Material:
    record = MaterialRecord.model_validate(row)
    file = FileRecord.model_validate(row["file"])
    return Material.model_validate(
        record.model_dump()
        | {
            "id": str(record.id),
            "file_id": str(record.file_id),
            "uploader_id": str(record.uploader_id),
            "uploader_name": record.uploader_name_snapshot
            if row.get("uploader")
            else "Former member",
            "original_name": file.original_name,
            "mime_type": file.mime_type,
            "size_bytes": file.size_bytes,
        }
    )


def joins() -> list[dict[str, object]]:
    return [
        {
            "$lookup": {
                "from": "files",
                "localField": "file_id",
                "foreignField": "_id",
                "as": "file",
            }
        },
        {"$unwind": "$file"},
        {
            "$lookup": {
                "from": "users",
                "localField": "uploader_id",
                "foreignField": "_id",
                "as": "uploader",
                "pipeline": [{"$project": {"_id": 1}}],
            }
        },
    ]


async def list_page(
    database: Database, query: dict[str, object], limit: int
) -> list[Material]:
    cursor = await database.materials.aggregate(
        [
            {"$match": query},
            {"$sort": {"created_at": -1, "_id": -1}},
            {"$limit": limit},
            *joins(),
        ]
    )
    return [public(row) async for row in cursor]


async def chapters(database: Database, slug: str) -> list[int]:
    values = await database.materials.distinct(
        "chapter", {"subject_slug": slug, "status": "active", "chapter": {"$ne": None}}
    )
    return sorted(int(str(value)) for value in values)


async def by_id(database: Database, material_id: ObjectId) -> MaterialRecord | None:
    row = await database.materials.find_one({"_id": material_id, "status": "active"})
    return MaterialRecord.model_validate(row) if row else None


async def detail(database: Database, material_id: ObjectId) -> Material | None:
    cursor = await database.materials.aggregate(
        [{"$match": {"_id": material_id, "status": "active"}}, *joins()]
    )
    async for row in cursor:
        return public(row)
    return None


async def duplicate(
    database: Database, slug: str, sha256: str
) -> MaterialRecord | None:
    row = await database.materials.find_one(
        {"subject_slug": slug, "file_sha256": sha256, "status": "active"}
    )
    return MaterialRecord.model_validate(row) if row else None


async def insert(database: Database, record: MaterialRecord) -> None:
    await database.materials.insert_one(record.model_dump(by_alias=True))


async def remove(database: Database, material_id: ObjectId, now: datetime) -> None:
    await database.materials.update_one(
        {"_id": material_id}, {"$set": {"status": "removed", "updated_at": now}}
    )


async def referenced(database: Database, file_id: ObjectId) -> bool:
    return (
        await database.materials.find_one(
            {"file_id": file_id, "status": "active"}, {"_id": 1}
        )
        is not None
    )


async def counts(database: Database) -> dict[str, int]:
    cursor = await database.materials.aggregate(
        [
            {"$match": {"status": "active"}},
            {"$group": {"_id": "$subject_slug", "count": {"$sum": 1}}},
        ]
    )
    return {str(row["_id"]): int(str(row["count"])) async for row in cursor}
