import re
from datetime import datetime

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.models.user import UserRecord

type Database = AsyncDatabase[dict[str, object]]


async def by_email(database: Database, email: str) -> UserRecord | None:
    document = await database.users.find_one({"email": email})
    return UserRecord.model_validate(document) if document else None


async def by_id(database: Database, user_id: ObjectId) -> UserRecord | None:
    document = await database.users.find_one({"_id": user_id})
    return UserRecord.model_validate(document) if document else None


async def login(
    database: Database, email: str, admin: bool, now: datetime
) -> UserRecord:
    fields: dict[str, object] = {"last_login_at": now}
    initial: dict[str, object] = {
        "email": email,
        "name": None,
        "is_active": True,
        "roll_no": email.split("@", 1)[0],
        "created_at": now,
        "last_seen_updates_at": None,
    }
    if admin:
        fields["role"] = "admin"
    else:
        initial["role"] = "student"
    document = await database.users.find_one_and_update(
        {"email": email},
        {"$set": fields, "$setOnInsert": initial},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return UserRecord.model_validate(document)


async def set_name(
    database: Database, user_id: ObjectId, name: str
) -> UserRecord | None:
    document = await database.users.find_one_and_update(
        {"_id": user_id, "is_active": True},
        {"$set": {"name": name}},
        return_document=ReturnDocument.AFTER,
    )
    return UserRecord.model_validate(document) if document else None


async def seen_updates(database: Database, user_id: ObjectId, now: datetime) -> None:
    await database.users.update_one(
        {"_id": user_id}, {"$set": {"last_seen_updates_at": now}}
    )


async def search(database: Database, text: str) -> list[UserRecord]:
    query: dict[str, object] = {}
    if text.strip():
        pattern = {"$regex": re.escape(text.strip()), "$options": "i"}
        query["$or"] = [{"name": pattern}, {"email": pattern}]
    return [
        UserRecord.model_validate(row)
        async for row in database.users.find(query).sort([("name", 1), ("_id", 1)])
    ]


async def active_admin_count(database: Database) -> int:
    return await database.users.count_documents({"role": "admin", "is_active": True})


async def change(
    database: Database, user_id: ObjectId, fields: dict[str, object]
) -> UserRecord:
    document = await database.users.find_one_and_update(
        {"_id": user_id}, {"$set": fields}, return_document=ReturnDocument.AFTER
    )
    return UserRecord.model_validate(document)


async def delete(database: Database, user_id: ObjectId) -> None:
    # Delete dependent credentials first so a failed cleanup can be retried.
    await database.devices.delete_many({"user_id": user_id})
    await database.refresh_tokens.delete_many({"user_id": user_id})
    await database.materials.update_many({"uploader_id": user_id}, {"$set": {"uploader_name_snapshot": "Former member"}})
    await database.announcements.update_many({"author_id": user_id}, {"$set": {"author_name_snapshot": "Former member"}})
    await database.users.delete_one({"_id": user_id})
