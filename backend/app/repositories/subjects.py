from pymongo.asynchronous.database import AsyncDatabase

from app.models.subject import Subject, SubjectSeed

type Database = AsyncDatabase[dict[str, object]]


async def all_subjects(database: Database) -> list[Subject]:
    return [
        Subject.model_validate(document | {"id": str(document["_id"])})
        async for document in database.subjects.find().sort("sort_order", 1)
    ]


async def by_slug(database: Database, slug: str) -> Subject | None:
    document = await database.subjects.find_one({"slug": slug})
    return (
        Subject.model_validate(document | {"id": str(document["_id"])})
        if document
        else None
    )


async def seed(database: Database, subjects: list[SubjectSeed]) -> None:
    for subject in subjects:
        await database.subjects.update_one(
            {"slug": subject.slug}, {"$set": subject.model_dump()}, upsert=True
        )
