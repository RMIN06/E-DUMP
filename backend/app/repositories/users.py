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
