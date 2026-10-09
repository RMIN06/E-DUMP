import json
import os
from collections.abc import AsyncIterator
from pathlib import Path
from uuid import uuid4

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pydantic import TypeAdapter
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.db.indexes import ensure_indexes
from app.deps import get_db
from app.main import create_app
from app.models.schedule import ScheduleSeed
from app.models.subject import SubjectSeed
from app.services.schedule_service import seed_catalog


def seed_data() -> tuple[list[SubjectSeed], list[ScheduleSeed]]:
    folder = Path(__file__).resolve().parents[2] / "seeds"
    subjects = TypeAdapter(list[SubjectSeed]).validate_python(
        json.loads((folder / "subjects.json").read_text())
    )
    schedule = TypeAdapter(list[ScheduleSeed]).validate_python(
        json.loads((folder / "schedule.json").read_text())
    )
    return subjects, schedule


@pytest.fixture
async def database() -> AsyncIterator[AsyncDatabase[dict[str, object]]]:
    uri = os.getenv("TEST_MONGODB_URI")
    if not uri:
        pytest.fail("M2 integration tests require TEST_MONGODB_URI.")
    async with AsyncMongoClient[dict[str, object]](uri, tz_aware=True) as mongo:
        name = "edump_m2_test_" + uuid4().hex
        database = mongo[name]
        await ensure_indexes(database)
        await seed_catalog(database, *seed_data())
        yield database
        await mongo.drop_database(name)


@pytest.fixture
async def client(
    database: AsyncDatabase[dict[str, object]],
) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: database
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


async def login(client: AsyncClient, admin: bool = False) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": f"l25000{2 if admin else 1}@lhr.nu.edu.pk"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}


@pytest.mark.parametrize("path", ["/subjects", "/subjects/coal", "/schedule"])
@pytest.mark.parametrize("role", ["anonymous", "student", "admin", "disabled"])
async def test_catalog_authorization_matrix(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    path: str,
    role: str,
) -> None:
    headers = {} if role == "anonymous" else await login(client, role == "admin")
    if role == "disabled":
        await database.users.update_one(
            {"email": "l250001@lhr.nu.edu.pk"}, {"$set": {"is_active": False}}
        )
    response = await client.get("/api/v1" + path, headers=headers)
    assert response.status_code == {"anonymous": 401, "disabled": 403}.get(role, 200)


async def test_sub_1_seed_order_counts_and_placeholders(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    headers = await login(client)
    first = (await client.get("/api/v1/subjects", headers=headers)).json()
    await seed_catalog(database, *seed_data())
    second = (await client.get("/api/v1/subjects", headers=headers)).json()
    assert first == second
    assert [row["slug"] for row in second] == [
        "ds",
        "ds-lab",
        "coal",
        "coal-lab",
        "discrete",
        "linear-algebra",
        "uhq",
    ]
    assert second[-1]["credits"] is None and second[-1]["teacher"] is None
    assert second[4]["aliases"] == ["Discrete Mathematics"]
    await database.materials.insert_many(
        [
            {"subject_slug": "coal", "status": "active"},
            {"subject_slug": "coal", "status": "removed"},
            {"subject_slug": "ds", "status": "active"},
        ]
    )
    detail = await client.get("/api/v1/subjects/coal", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["material_count"] == 1
    assert "email" not in detail.text
    assert (
        await client.get("/api/v1/subjects/missing", headers=headers)
    ).status_code == 404


async def test_sch_1_exact_seed_and_stable_ids(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    headers = await login(client)
    first = (await client.get("/api/v1/schedule", headers=headers)).json()
    await seed_catalog(database, *seed_data())
    assert first == (await client.get("/api/v1/schedule", headers=headers)).json()
    assert len(first) == 11
    assert [(row["weekday"], row["start"]) for row in first] == sorted(
        (row["weekday"], row["start"]) for row in first
    )
    assert first[0]["subject_slug"] == "uhq"
    assert first[0]["teacher"] is None
    assert first[4]["venue"] == "Lab-14"
    assert first[9]["venue"] == "Lab-17"
    assert all(ObjectId.is_valid(row["id"]) for row in first)
    await database.schedule_slots.insert_one(
        {
            "subject_slug": "unknown",
            "weekday": 5,
            "start": "09:00",
            "end": "10:00",
            "venue": "C-2",
        }
    )
    assert len((await client.get("/api/v1/schedule", headers=headers)).json()) == 11


async def test_catalog_read_limit_is_shared_and_per_user(client: AsyncClient) -> None:
    student = await login(client)
    admin = await login(client, True)
    for _ in range(60):
        assert (
            await client.get("/api/v1/subjects", headers=student)
        ).status_code == 200
    limited = await client.get("/api/v1/schedule", headers=student)
    assert limited.status_code == 429
    assert limited.headers["Retry-After"] == "60"
    assert (await client.get("/api/v1/schedule", headers=admin)).status_code == 200
