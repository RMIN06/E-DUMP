from datetime import UTC, datetime

from bson import ObjectId

from app.models.device import DeviceWrite
from app.repositories.files import Database


async def register(database: Database, user_id: ObjectId, data: DeviceWrite) -> None:
    now = datetime.now(UTC)
    await database.devices.update_one(
        {"expo_push_token": data.expo_push_token},
        {
            "$set": data.model_dump() | {"user_id": user_id, "last_seen_at": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


async def unregister(database: Database, user_id: ObjectId, token: str) -> None:
    await database.devices.delete_one({"user_id": user_id, "expo_push_token": token})


async def delete_tokens(database: Database, tokens: list[str]) -> None:
    await database.devices.delete_many({"expo_push_token": {"$in": tokens}})


async def recipients(database: Database, author_id: ObjectId) -> list[str]:
    rows = await database.devices.aggregate(
        [
            {"$match": {"notifications_enabled": True, "user_id": {"$ne": author_id}}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "owner",
                }
            },
            {"$match": {"owner.is_active": True}},
            {"$project": {"_id": 0, "expo_push_token": 1}},
        ]
    )
    return [str(row["expo_push_token"]) async for row in rows]
