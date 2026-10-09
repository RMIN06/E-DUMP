from app.errors import DomainError
from app.models.schedule import ScheduleSeed, ScheduleSlot
from app.models.subject import SubjectSeed
from app.repositories import schedule_slots, subjects
from app.repositories.subjects import Database


async def list_schedule(database: Database) -> list[ScheduleSlot]:
    catalog = {
        subject.slug: subject for subject in await subjects.all_subjects(database)
    }
    result = []
    for document in await schedule_slots.all_slots(database):
        subject = catalog.get(str(document["subject_slug"]))
        if subject is not None:
            result.append(
                ScheduleSlot.model_validate(
                    document
                    | {
                        "id": str(document["_id"]),
                        "subject_name": subject.name,
                        "short_name": subject.short_name,
                        "teacher": subject.teacher,
                    }
                )
            )
    return result


async def seed_catalog(
    database: Database, catalog: list[SubjectSeed], slots: list[ScheduleSeed]
) -> None:
    slugs = {subject.slug for subject in catalog}
    if len(slugs) != len(catalog) or any(
        slot.subject_slug not in slugs for slot in slots
    ):
        raise DomainError("validation_error", "Invalid seed subject references.", 422)
    await subjects.seed(database, catalog)
    await schedule_slots.seed(database, slots)
