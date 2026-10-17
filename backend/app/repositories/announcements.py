from datetime import UTC, datetime

from bson import ObjectId

from app.models.announcement import AnnouncementRecord
from app.repositories.files import Database


def active_filter(now: datetime) -> dict[str, object]:
    return {"$or": [{"due_at": None}, {"due_at": {"$gt": now}}]}


async def insert(database: Database, record: AnnouncementRecord) -> None:
    await database.announcements.insert_one(record.model_dump(by_alias=True))


async def by_id(database: Database, identifier: ObjectId) -> AnnouncementRecord | None:
    document = await database.announcements.find_one({"_id": identifier})
    return AnnouncementRecord.model_validate(document) if document else None


async def page(
    database: Database, query: dict[str, object], limit: int, upcoming: bool = False
) -> list[AnnouncementRecord]:
    order = (
        [("due_at", 1), ("_id", 1)]
        if upcoming
        else [("pinned", -1), ("created_at", -1), ("_id", -1)]
    )
    return [
        AnnouncementRecord.model_validate(row)
        async for row in database.announcements.find(query).sort(order).limit(limit)
    ]


async def update(database: Database, record: AnnouncementRecord) -> None:
    await database.announcements.replace_one(
        {"_id": record.id}, record.model_dump(by_alias=True)
    )


async def remove(database: Database, identifier: ObjectId) -> None:
    await database.announcements.delete_one({"_id": identifier})


async def referenced(database: Database, file_id: ObjectId) -> bool:
    return (
        await database.announcements.find_one({"file_ids": str(file_id)}, {"_id": 1})
        is not None
    )


async def unread(database: Database, since: object) -> int:
    query = active_filter(datetime.now(UTC))
    if since:
        query["created_at"] = {"$gt": since}
    return await database.announcements.count_documents(query)
