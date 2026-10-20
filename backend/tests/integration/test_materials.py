import asyncio
import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.db.indexes import ensure_indexes
from app.deps import get_db, get_storage
from app.main import create_app
from app.repositories import materials
from app.services.schedule_service import seed_catalog
from app.services.upload_validation import MIMES
from app.tasks.housekeeping import sweep
from tests.email_helpers import verified_login
from tests.fakes import FakeStorage
from tests.fixtures import JPG, PDF, PNG, WEBP, office
from tests.integration.test_catalog import seed_data


@pytest.fixture
async def database() -> AsyncIterator[AsyncDatabase[dict[str, object]]]:
    uri = os.getenv("TEST_MONGODB_URI")
    if not uri:
        pytest.fail("M3 integration tests require TEST_MONGODB_URI.")
    async with AsyncMongoClient[dict[str, object]](uri, tz_aware=True) as mongo:
        name = "edump_m3_test_" + uuid4().hex
        database = mongo[name]
        await ensure_indexes(database)
        await seed_catalog(database, *seed_data())
        yield database
        await mongo.drop_database(name)


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
async def client(
    database: AsyncDatabase[dict[str, object]], storage: FakeStorage
) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: database
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


async def login(client: AsyncClient, roll: str = "l250001") -> dict[str, str]:
    result = await verified_login(client, roll + "@lhr.nu.edu.pk")
    headers = {"Authorization": "Bearer " + result.json()["access_token"]}
    await client.patch("/api/v1/me", headers=headers, json={"name": "Test member"})
    return headers


async def upload(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    slug: str = "coal",
    body: bytes = PDF,
    extension: str = "pdf",
    title: str = "Chapter 3 notes",
    kind: str = "notes",
    chapter: str = "3",
) -> object:
    return await client.post(
        "/api/v1/subjects/" + slug + "/materials",
        headers=headers,
        files={
            "file": (
                "chapter 3." + extension,
                body,
                MIMES.get(extension, "application/octet-stream"),
            )
        },
        data={
            "title": title,
            "kind": kind,
            "chapter": chapter,
            "description": "Class notes",
        },
    )


@pytest.mark.parametrize(
    "extension,body",
    [
        ("pdf", PDF),
        ("png", PNG),
        ("jpg", JPG),
        ("jpeg", JPG),
        ("webp", WEBP),
        ("docx", office("docx")),
        ("pptx", office("pptx")),
    ],
)
async def test_mat4_allowed_uploads_and_private_metadata(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    storage: FakeStorage,
    extension: str,
    body: bytes,
) -> None:
    headers = await login(client)
    response = await upload(client, headers, extension=extension, body=body)
    assert response.status_code == 201
    item = response.json()
    assert item["chapter"] == 3 and item["description"] == "Class notes"
    assert item["mime_type"] == MIMES[extension]
    assert item["uploader_name"] == "Test member"
    assert item["created_at"].endswith("Z")
    assert not {"key", "email", "file_sha256", "search_text"} & item.keys()
    file = await database.files.find_one({"_id": ObjectId(item["file_id"])})
    assert file is not None and file["status"] == "ready"
    key = str(file["key"])
    assert key.startswith("files/") and "chapter" not in key
    assert storage.objects[key] == body
    subjects = (await client.get("/api/v1/subjects", headers=headers)).json()
    assert (
        next(subject for subject in subjects if subject["slug"] == "coal")[
            "material_count"
        ]
        == 1
    )


@pytest.mark.parametrize(
    "path,method",
    [
        ("/subjects/coal/materials", "GET"),
        ("/subjects/coal/materials", "POST"),
        ("/materials/{id}", "GET"),
        ("/materials/{id}", "DELETE"),
        ("/materials/{id}/download", "GET"),
        ("/materials/{id}/report", "POST"),
    ],
)
@pytest.mark.parametrize("role", ["anonymous", "student", "admin", "disabled"])
async def test_every_material_route_is_authorized(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    role: str,
    path: str,
    method: str,
) -> None:
    owner = await login(client)
    item = (await upload(client, owner)).json()
    headers = (
        {}
        if role == "anonymous"
        else await login(client, "l250002" if role == "admin" else "l250001")
    )
    if role == "disabled":
        await database.users.update_one(
            {"email": "l250001@lhr.nu.edu.pk"}, {"$set": {"is_active": False}}
        )
    target = "/api/v1" + path.replace("{id}", item["id"])
    if path.endswith("/materials") and method == "POST":
        response = await upload(client, headers, body=PDF + b"second")
    else:
        response = await client.request(
            method,
            target,
            headers=headers,
            **({"json": {"reason": "other"}} if method == "POST" else {}),
        )
    expected = (
        401
        if role == "anonymous"
        else 403
        if role == "disabled"
        else 201
        if method == "POST"
        else 200
    )
    assert response.status_code == expected


async def test_mat8_duplicates_are_subject_scoped_and_race_safe(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    storage: FakeStorage,
) -> None:
    headers = await login(client)
    first, second = await asyncio.gather(
        upload(client, headers), upload(client, headers)
    )
    assert sorted([first.status_code, second.status_code]) == [201, 409]
    accepted = first if first.status_code == 201 else second
    rejected = second if second.status_code == 409 else first
    assert (
        rejected.json()["error"]["details"]["existing_material_id"]
        == accepted.json()["id"]
    )
    assert storage.put_calls == 1
    assert (await upload(client, headers, slug="ds")).status_code == 201
    assert await database.files.count_documents({}) == 2


async def test_mat1_cursor_three_pages_filters_and_search(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    headers = await login(client)
    template = (await upload(client, headers)).json()
    base = await database.materials.find_one({"_id": ObjectId(template["id"])})
    assert base is not None
    await database.materials.delete_many({})
    now = datetime.now(UTC)
    await database.materials.insert_many(
        [
            base
            | {
                "_id": ObjectId(),
                "file_sha256": str(index),
                "created_at": now - timedelta(seconds=index // 3),
                "title": f"Notes {index}",
                "kind": "notes" if index % 2 == 0 else "slides",
                "chapter": index % 5,
                "search_text": f"notes {index} chapter {index % 5} original.pdf",
            }
            for index in range(45)
        ]
    )
    items: list[dict[str, object]] = []
    cursor = None
    for count in (20, 20, 5):
        response = await client.get(
            "/api/v1/subjects/coal/materials",
            headers=headers,
            params={"cursor": cursor} if cursor else {},
        )
        page = response.json()
        assert len(page["items"]) == count and page["chapters"] == [0, 1, 2, 3, 4]
        items.extend(page["items"])
        cursor = page["next_cursor"]
    assert cursor is None and len({item["id"] for item in items}) == 45
    order = [(str(item["created_at"]), str(item["id"])) for item in items]
    assert order == sorted(order, reverse=True)
    filtered = (
        await client.get(
            "/api/v1/subjects/coal/materials",
            headers=headers,
            params={"kind": "notes", "chapter": 3, "q": "chapter 3 original.pdf"},
        )
    ).json()["items"]
    assert filtered and all(
        item["kind"] == "notes" and item["chapter"] == 3 for item in filtered
    )
    assert (
        await client.get(
            "/api/v1/subjects/ds/materials", headers=headers, params={"q": "original"}
        )
    ).json()["items"] == []
    assert (
        await client.get(
            "/api/v1/subjects/coal/materials", headers=headers, params={"q": ".*"}
        )
    ).json()["items"] == []
    assert (
        await client.get(
            "/api/v1/subjects/coal/materials", headers=headers, params={"cursor": "bad"}
        )
    ).status_code == 422


async def test_mat5_download_and_mat6_owner_admin_delete(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    storage: FakeStorage,
) -> None:
    owner = await login(client)
    item = (await upload(client, owner)).json()
    other = await login(client, "l250003")
    url = await client.get(f"/api/v1/materials/{item['id']}/download", headers=other)
    assert url.status_code == 200 and url.json()["expires_in"] == 600
    assert url.headers["cache-control"] == "no-store"
    assert storage.downloads[0][1:] == ("chapter 3.pdf", "application/pdf", 600)
    assert (
        await client.delete(f"/api/v1/materials/{item['id']}", headers=other)
    ).status_code == 403
    admin = await login(client, "l250002")
    assert (
        await client.delete(f"/api/v1/materials/{item['id']}", headers=admin)
    ).status_code == 200
    assert not storage.objects
    assert (
        await client.get(f"/api/v1/materials/{item['id']}/download", headers=owner)
    ).status_code == 404
    assert (await upload(client, owner)).status_code == 201
    own = (await client.get("/api/v1/subjects/coal/materials", headers=owner)).json()[
        "items"
    ][0]
    assert (
        await client.delete(f"/api/v1/materials/{own['id']}", headers=owner)
    ).status_code == 200


async def test_mat7_reports_are_unique_bounded_and_per_user_limited(
    client: AsyncClient,
) -> None:
    owner = await login(client)
    other = await login(client, "l250003")
    for index in range(6):
        item = (await upload(client, owner, body=PDF + str(index).encode())).json()
        response = await client.post(
            f"/api/v1/materials/{item['id']}/report",
            headers=other,
            json={"reason": "wrong_subject", "note": "Check course"},
        )
        assert response.status_code == (201 if index < 5 else 429)
    assert (
        await client.post(
            f"/api/v1/materials/{item['id']}/report",
            headers=owner,
            json={"reason": "invalid"},
        )
    ).status_code == 422
    assert (
        await client.post(
            f"/api/v1/materials/{item['id']}/report",
            headers=owner,
            json={"reason": "other", "note": "x" * 201},
        )
    ).status_code == 422
    assert (
        await client.post(
            f"/api/v1/materials/{item['id']}/report",
            headers=owner,
            json={"reason": "other"},
        )
    ).status_code == 201
    assert (
        await client.post(
            f"/api/v1/materials/{item['id']}/report",
            headers=owner,
            json={"reason": "other"},
        )
    ).status_code == 409


async def test_storage_and_mongo_failures_leave_no_untracked_objects(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    storage: FakeStorage,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = await login(client)
    storage.fail_put = True
    assert (await upload(client, headers)).status_code == 503
    assert await database.files.count_documents({}) == 0
    storage.fail_put = False
    original = materials.insert

    async def fail(*args: object) -> None:
        raise PyMongoError("private failure")

    monkeypatch.setattr(materials, "insert", fail)
    assert (await upload(client, headers)).status_code == 503
    assert not storage.objects and await database.files.count_documents({}) == 0
    storage.fail_delete = True
    assert (await upload(client, headers)).status_code == 503
    pending = await database.files.find_one({"status": "pending"})
    assert pending is not None and storage.objects
    await database.files.update_one(
        {"_id": pending["_id"]},
        {"$set": {"created_at": datetime.now(UTC) - timedelta(days=2)}},
    )
    storage.fail_delete = False
    await sweep(database, storage, asyncio.Lock())
    assert not storage.objects and await database.files.count_documents({}) == 0
    monkeypatch.setattr(materials, "insert", original)


async def test_quota_prevents_second_file_without_r2_write(
    client: AsyncClient, storage: FakeStorage, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.config import get_settings

    monkeypatch.setenv("UPLOAD_QUOTA_MB", "1")
    get_settings.cache_clear()
    headers = await login(client)
    assert (await upload(client, headers, body=PDF + b"x" * 600000)).status_code == 201
    response = await upload(client, headers, body=PDF + b"y" * 600000)
    assert (
        response.status_code == 413
        and response.json()["error"]["code"] == "quota_exceeded"
    )
    assert storage.put_calls == 1


async def test_pending_reference_is_recovered_without_deleting_active_object(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    storage: FakeStorage,
) -> None:
    headers = await login(client)
    item = (await upload(client, headers)).json()
    await database.files.update_one(
        {"_id": ObjectId(item["file_id"])},
        {
            "$set": {
                "status": "pending",
                "created_at": datetime.now(UTC) - timedelta(days=2),
            }
        },
    )
    await sweep(database, storage, asyncio.Lock())
    file = await database.files.find_one({"_id": ObjectId(item["file_id"])})
    assert file is not None and file["status"] == "ready" and storage.objects


async def test_upload_limits_reject_before_storage(
    client: AsyncClient, storage: FakeStorage
) -> None:
    headers = await login(client)
    response = await client.post(
        "/api/v1/subjects/coal/materials",
        headers={**headers, "Content-Length": str(27 * 1024 * 1024)},
        content=b"x",
    )
    assert response.status_code == 413 and storage.put_calls == 0
    for index in range(20):
        assert (
            await upload(client, headers, body=PDF + str(index).encode())
        ).status_code == 201
    response = await upload(client, headers, body=PDF + b"over-limit")
    assert response.status_code == 429 and storage.put_calls == 20


@pytest.mark.parametrize(
    "change",
    [
        {"title": ""},
        {"title": "x" * 101},
        {"kind": "wrong"},
        {"chapter": "-1"},
        {"chapter": "100"},
    ],
)
async def test_mat4_metadata_validation(
    client: AsyncClient, change: dict[str, str]
) -> None:
    headers = await login(client)
    assert (await upload(client, headers, **change)).status_code == 422


async def test_missing_and_removed_materials_and_deleted_member(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    headers = await login(client)
    assert (await upload(client, headers, slug="unknown")).status_code == 404
    for value in ("invalid", str(ObjectId())):
        assert (
            await client.get("/api/v1/materials/" + value, headers=headers)
        ).status_code == 404
    item = (await upload(client, headers)).json()
    await database.users.delete_one({"email": "l250001@lhr.nu.edu.pk"})
    other = await login(client, "l250003")
    assert (await client.get("/api/v1/materials/" + item["id"], headers=other)).json()[
        "uploader_name"
    ] == "Former member"
