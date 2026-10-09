from app.errors import DomainError
from app.models.subject import Subject
from app.repositories import materials, subjects
from app.repositories.subjects import Database


async def list_subjects(database: Database) -> list[Subject]:
    result = await subjects.all_subjects(database)
    counts = await materials.counts(database)
    return [
        subject.model_copy(update={"material_count": counts.get(subject.slug, 0)})
        for subject in result
    ]


async def get_subject(database: Database, slug: str) -> Subject:
    subject = await subjects.by_slug(database, slug)
    if subject is None:
        raise DomainError("not_found", "Subject not found.", 404)
    counts = await materials.counts(database)
    return subject.model_copy(update={"material_count": counts.get(slug, 0)})
