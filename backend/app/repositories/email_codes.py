from datetime import datetime, timedelta
from typing import cast

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.repositories.refresh_tokens import Database


async def reserve(
    database: Database, email: str, challenge: str, digest: str, now: datetime
) -> bool:
    current = await database.email_codes.find_one({"_id": email})
    if current and (
        cast(datetime, current["requested_at"]) > now - timedelta(seconds=60)
        or (
            cast(datetime, current["window_start"]) > now - timedelta(hours=1)
            and cast(int, current["send_count"]) >= 5
        )
    ):
        return False
    same_window = current and cast(datetime, current["window_start"]) > now - timedelta(
        hours=1
    )
    record: dict[str, object] = {
        "challenge_id": challenge,
        "digest": digest,
        "requested_at": now,
        "expires_at": now + timedelta(minutes=10),
        "purge_at": now + timedelta(days=1),
        "window_start": current["window_start"] if current and same_window else now,
        "send_count": cast(int, current["send_count"]) + 1
        if current and same_window
        else 1,
        "attempts": 0,
        "delivered": False,
        "consumed": False,
    }
    # CAS protects the cooldown even if another process is handling a resend.
    query: dict[str, object] = {"_id": email}
    if current:
        query["challenge_id"] = current["challenge_id"]
    try:
        result = await database.email_codes.update_one(
            query, {"$set": record}, upsert=True
        )
    except DuplicateKeyError:
        return False
    return result.modified_count == 1 or result.upserted_id is not None


async def reserve_daily(database: Database, now: datetime) -> bool:
    key = now.strftime("%Y-%m-%d")
    try:
        record = await database.email_delivery_limits.find_one_and_update(
            {"_id": key, "count": {"$lt": 180}},
            {
                "$inc": {"count": 1},
                "$setOnInsert": {"purge_at": now + timedelta(days=2)},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        return False
    return record is not None


async def delivery(
    database: Database, email: str, challenge: str, success: bool
) -> None:
    await database.email_codes.update_one(
        {"_id": email, "challenge_id": challenge},
        {"$set": {"delivered": success, "consumed": not success}},
    )


async def attempt(
    database: Database, email: str, challenge: str, now: datetime
) -> dict[str, object] | None:
    return await database.email_codes.find_one_and_update(
        {
            "_id": email,
            "challenge_id": challenge,
            "expires_at": {"$gt": now},
            "attempts": {"$lt": 5},
            "delivered": True,
            "consumed": False,
        },
        {"$inc": {"attempts": 1}},
        return_document=ReturnDocument.BEFORE,
    )


async def consume(database: Database, email: str, challenge: str) -> bool:
    result = await database.email_codes.update_one(
        {
            "_id": email,
            "challenge_id": challenge,
            "consumed": False,
            "attempts": {"$lte": 5},
        },
        {"$set": {"consumed": True}},
    )
    return result.modified_count == 1


async def delete_for_email(database: Database, email: str) -> None:
    await database.email_codes.delete_one({"_id": email})
