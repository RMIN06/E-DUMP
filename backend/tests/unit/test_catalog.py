import pytest
from pydantic import ValidationError

from app.errors import DomainError
from app.models.schedule import ScheduleSeed
from app.models.subject import SubjectSeed
from app.services.schedule_service import seed_catalog


@pytest.mark.parametrize(
    "start,end,weekday",
    [("9:00", "10:00", 1), ("09:00", "08:00", 1), ("09:00", "10:00", 8)],
)
def test_schedule_seed_validation(start: str, end: str, weekday: int) -> None:
    with pytest.raises(ValidationError):
        ScheduleSeed(
            subject_slug="ds", weekday=weekday, start=start, end=end, venue="C-2"
        )


async def test_seed_references_validated_before_writes() -> None:
    from unittest.mock import AsyncMock

    database = AsyncMock()
    subject = SubjectSeed(
        slug="ds", name="DS", short_name="DS", kind="theory", sort_order=0
    )
    slot = ScheduleSeed(
        subject_slug="unknown", weekday=1, start="09:00", end="10:00", venue="C-2"
    )
    with pytest.raises(DomainError):
        await seed_catalog(database, [subject], [slot])
    database.subjects.update_one.assert_not_awaited()
