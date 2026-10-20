from pymongo.asynchronous.database import AsyncDatabase


async def ensure_indexes(database: AsyncDatabase[dict[str, object]]) -> None:
    await database.announcements.create_index(
        [("pinned", -1), ("created_at", -1), ("_id", -1)]
    )
    await database.announcements.create_index([("subject_slug", 1), ("created_at", -1)])
    await database.announcements.create_index(
        "due_at", partialFilterExpression={"due_at": {"$type": "date"}}
    )
    await database.devices.create_index("expo_push_token", unique=True)
    await database.devices.create_index([("user_id", 1), ("notifications_enabled", 1)])
    await database.files.create_index("sha256")
    await database.files.create_index([("status", 1), ("created_at", 1)])
    await database.files.create_index([("uploader_id", 1), ("status", 1)])
    await database.materials.create_index(
        [("subject_slug", 1), ("status", 1), ("created_at", -1), ("_id", -1)]
    )
    await database.materials.create_index(
        [("subject_slug", 1), ("kind", 1), ("chapter", 1)]
    )
    await database.materials.create_index(
        [("subject_slug", 1), ("file_sha256", 1)],
        unique=True,
        partialFilterExpression={
            "status": "active",
            "file_sha256": {"$type": "string"},
        },
    )
    await database.reports.create_index(
        [("material_id", 1), ("reporter_id", 1)], unique=True
    )
    await database.reports.create_index([("status", 1), ("created_at", 1)])
    await database.subjects.create_index("slug", unique=True)
    await database.schedule_slots.create_index(
        [("subject_slug", 1), ("weekday", 1), ("start", 1)], unique=True
    )
    await database.users.create_index("email", unique=True)
    await database.refresh_tokens.create_index("token_hash", unique=True)
    await database.refresh_tokens.create_index("family_id")
    await database.refresh_tokens.create_index("user_id")
    await database.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    await database.email_codes.create_index("purge_at", expireAfterSeconds=0)
    await database.email_delivery_limits.create_index("purge_at", expireAfterSeconds=0)
