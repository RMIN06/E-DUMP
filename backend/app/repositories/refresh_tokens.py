from datetime import datetime

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.auth import RefreshRecord

type Database = AsyncDatabase[dict[str, object]]


async def insert(database: Database, record: RefreshRecord) -> None:
    await database.refresh_tokens.insert_one(record.model_dump(by_alias=True))


async def by_hash(database: Database, token_hash: str) -> RefreshRecord | None:
    document = await database.refresh_tokens.find_one({"token_hash": token_hash})
    return RefreshRecord.model_validate(document) if document else None


async def replace(
    database: Database, token_id: ObjectId, replacement: ObjectId, now: datetime
) -> bool:
    result = await database.refresh_tokens.update_one(
        {"_id": token_id, "revoked_at": None, "replaced_by": None},
        {"$set": {"revoked_at": now, "replaced_by": replacement}},
    )
    return result.modified_count == 1


async def revoke_family(database: Database, family_id: str, now: datetime) -> None:
    await database.refresh_tokens.update_many(
        {"family_id": family_id, "revoked_at": None}, {"$set": {"revoked_at": now}}
    )


async def revoke_user(database: Database, user_id: ObjectId, now: datetime) -> None:
    await database.refresh_tokens.update_many(
        {"user_id": user_id, "revoked_at": None}, {"$set": {"revoked_at": now}}
    )
