from pymongo.asynchronous.database import AsyncDatabase

from app.models.schedule import ScheduleSeed

type Database = AsyncDatabase[dict[str, object]]


async def all_slots(database: Database) -> list[dict[str, object]]:
    return [
        document
        async for document in database.schedule_slots.find().sort(
            [("weekday", 1), ("start", 1), ("_id", 1)]
        )
    ]


async def seed(database: Database, slots: list[ScheduleSeed]) -> None:
    for slot in slots:
        await database.schedule_slots.update_one(
            {
                "subject_slug": slot.subject_slug,
                "weekday": slot.weekday,
                "start": slot.start,
            },
            {"$set": slot.model_dump()},
            upsert=True,
        )
