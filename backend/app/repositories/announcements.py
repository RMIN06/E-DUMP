from datetime import UTC, datetime, timedelta

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
    cursor = await database.announcements.aggregate(
        [
            {"$match": query},
            {
                "$addFields": {
                    "_undated": {
                        "$cond": [{"$eq": [{"$ifNull": ["$due_at", None]}, None]}, 1, 0]
                    }
                }
            },
            {"$sort": {"_undated": 1, "due_at": 1, "created_at": -1, "_id": -1}},
            {"$limit": limit},
            {"$project": {"_undated": 0}},
        ]
    )
    return [AnnouncementRecord.model_validate(row) async for row in cursor]


async def update(database: Database, record: AnnouncementRecord) -> None:
    await database.announcements.update_one(
        {"_id": record.id}, {"$set": record.model_dump(exclude={"id"})}
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


async def reminder_candidates(
    database: Database, now: datetime
) -> list[AnnouncementRecord]:
    query: dict[str, object] = {
        "due_at": {"$gt": now, "$lte": now + timedelta(hours=24)},
        "$expr": {
            "$and": [
                {"$lte": ["$created_at", {"$subtract": ["$due_at", 86_400_000]}]},
                {
                    "$not": [
                        {"$in": ["$due_at", {"$ifNull": ["$reminded_deadlines", []]}]}
                    ]
                },
            ]
        },
    }
    return await page(database, query, 100, upcoming=True)


async def claim_reminder(database: Database, item: AnnouncementRecord) -> bool:
    result = await database.announcements.update_one(
        {
            "_id": item.id,
            "due_at": item.due_at,
            "updated_at": item.updated_at,
            "reminded_deadlines": {"$ne": item.due_at},
        },
        {"$addToSet": {"reminded_deadlines": item.due_at}},
    )
    return result.modified_count == 1
