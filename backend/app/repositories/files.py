from datetime import datetime

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.file import FileRecord

type Database = AsyncDatabase[dict[str, object]]


async def insert(database: Database, record: FileRecord) -> None:
    await database.files.insert_one(record.model_dump(by_alias=True))


async def by_id(database: Database, file_id: ObjectId) -> FileRecord | None:
    row = await database.files.find_one({"_id": file_id})
    return FileRecord.model_validate(row) if row else None


async def set_status(database: Database, file_id: ObjectId, status: str) -> None:
    await database.files.update_one({"_id": file_id}, {"$set": {"status": status}})


async def remove(database: Database, file_id: ObjectId) -> None:
    await database.files.delete_one({"_id": file_id})


async def used_bytes(database: Database, uploader_id: ObjectId) -> int:
    rows = await database.files.aggregate(
        [
            {
                "$match": {
                    "uploader_id": uploader_id,
                    "status": {"$in": ["ready", "pending"]},
                }
            },
            {"$group": {"_id": None, "size": {"$sum": "$size_bytes"}}},
        ]
    )
    async for row in rows:
        return int(str(row["size"]))
    return 0


async def stale_pending(database: Database, before: datetime) -> list[FileRecord]:
    return [
        FileRecord.model_validate(row)
        async for row in database.files.find(
            {"status": "pending", "created_at": {"$lt": before}}
        ).limit(100)
    ]
