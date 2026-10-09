import asyncio
import json
import sys
from pathlib import Path

from pydantic import TypeAdapter
from pymongo import AsyncMongoClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.db.indexes import ensure_indexes  # noqa: E402
from app.models.schedule import ScheduleSeed  # noqa: E402
from app.models.subject import SubjectSeed  # noqa: E402
from app.services.schedule_service import seed_catalog  # noqa: E402


async def main() -> None:
    settings = get_settings()
    if not settings.mongodb_uri:
        raise SystemExit("Set MONGODB_URI in backend/.env before seeding.")
    folder = Path(__file__).parent
    subjects = TypeAdapter(list[SubjectSeed]).validate_python(
        json.loads((folder / "subjects.json").read_text(encoding="utf-8"))
    )
    slots = TypeAdapter(list[ScheduleSeed]).validate_python(
        json.loads((folder / "schedule.json").read_text(encoding="utf-8"))
    )
    async with AsyncMongoClient[dict[str, object]](settings.mongodb_uri) as client:
        database = client[settings.mongodb_db]
        await ensure_indexes(database)
        await seed_catalog(database, subjects, slots)
    print(f"Seeded {len(subjects)} subjects and {len(slots)} schedule slots.")


if __name__ == "__main__":
    asyncio.run(main())
