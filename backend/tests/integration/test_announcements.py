from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

from app.deps import get_db, get_push_client, get_storage
from app.main import create_app
from app.repositories.files import Database
from app.tasks.housekeeping import sweep
from tests.fakes import FakeStorage
from tests.fixtures import PDF
from tests.integration.test_materials import database as database
from tests.integration.test_materials import login


class FakePush:
    def __init__(self) -> None:
        self.batches: list[list[dict[str, object]]] = []
        self.fail = False

    async def send(self, messages: list[dict[str, object]]) -> list[str]:
        self.batches.append(messages)
        if self.fail:
            raise RuntimeError("private provider details")
        return [
            str(message["to"])
            for message in messages
            if str(message["to"]).endswith("expired]")
        ]


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
def push() -> FakePush:
    return FakePush()


@pytest.fixture
async def client(
    database: Database, storage: FakeStorage, push: FakePush
) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: database
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_push_client] = lambda: push
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


def update_body(**values: object) -> dict[str, object]:
    return {
        "type": "quiz",
        "title": "Linked lists",
        "body": "Read chapter three.",
        "subject_slug": "ds",
        "due_at": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
    } | values


async def test_deadlines_hide_expired_rows_before_pagination_and_unread_count(
    client: AsyncClient,
    database: Database,
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    expired = []
    for kind in ("quiz", "task", "datesheet", "general"):
        response = await client.post(
            "/api/v1/announcements",
            headers=admin,
            json=update_body(type=kind, due_at=datetime.now(UTC).isoformat()),
        )
        assert response.status_code == 201
        expired.append(ObjectId(response.json()["id"]))
    await database.announcements.update_many(
        {"_id": {"$in": expired}}, {"$set": {"pinned": True}}
    )
    active = []
    for due in (None, (datetime.now(UTC) + timedelta(days=2)).isoformat()):
        response = await client.post(
            "/api/v1/announcements", headers=admin, json=update_body(due_at=due)
        )
        active.append(response.json()["id"])
    first = (
        await client.get(
            "/api/v1/announcements?type=quiz&subject=ds&limit=1", headers=student
        )
    ).json()
    assert [row["id"] for row in first["items"]] == [active[1]]
    second = (
        await client.get(
            "/api/v1/announcements",
            headers=student,
            params={
                "limit": 1,
                "cursor": first["next_cursor"],
                "type": "quiz",
                "subject": "ds",
            },
        )
    ).json()
    assert [row["id"] for row in second["items"]] == [active[0]]
    assert second["next_cursor"] is None
    assert (
        await client.get("/api/v1/announcements/unread-count", headers=student)
    ).json()["count"] == 2
    assert [
        row["id"]
        for row in (
            await client.get("/api/v1/announcements/upcoming", headers=student)
        ).json()
    ] == [active[1]]
    assert await database.announcements.count_documents({}) == 6
    assert (
        await client.get(f"/api/v1/announcements/{expired[0]}", headers=admin)
    ).status_code == 200


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/announcements"),
        ("GET", "/announcements/upcoming"),
        ("GET", "/announcements/unread-count"),
        ("GET", "/announcements/000000000000000000000001"),
        (
            "GET",
            "/announcements/000000000000000000000001/attachments/000000000000000000000002/download",
        ),
        ("POST", "/announcements"),
        ("POST", "/announcements/attachments"),
        ("PATCH", "/announcements/000000000000000000000001"),
        ("DELETE", "/announcements/000000000000000000000001"),
        ("POST", "/me/seen-updates"),
        ("PUT", "/me/devices"),
        ("DELETE", "/me/devices/ExpoPushToken[test]"),
    ],
)
async def test_new_routes_require_auth(
    client: AsyncClient, method: str, path: str
) -> None:
    response = await client.request(method, "/api/v1" + path, json=update_body())
    assert response.status_code == 401


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", ""),
        ("POST", "/attachments"),
        ("PATCH", "/000000000000000000000001"),
        ("DELETE", "/000000000000000000000001"),
    ],
)
async def test_students_cannot_write(
    client: AsyncClient, method: str, path: str
) -> None:
    headers = await login(client)
    assert (
        await client.request(
            method, "/api/v1/announcements" + path, headers=headers, json=update_body()
        )
    ).status_code == 403


async def test_feed_pin_pagination_filters_and_seen(client: AsyncClient) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    ids = []
    for index in range(4):
        created = await client.post(
            "/api/v1/announcements",
            headers=admin,
            json=update_body(title=f"Quiz {index}"),
        )
        assert created.status_code == 201, created.text
        ids.append(created.json()["id"])
    assert (
        await client.patch(
            f"/api/v1/announcements/{ids[0]}", headers=admin, json={"pinned": True}
        )
    ).status_code == 200
    first = (await client.get("/api/v1/announcements?limit=2", headers=student)).json()
    assert [item["id"] for item in first["items"]] == [ids[0], ids[1]]
    last = (
        await client.get(
            "/api/v1/announcements",
            headers=student,
            params={"limit": 2, "cursor": first["next_cursor"]},
        )
    ).json()
    assert [item["id"] for item in last["items"]] == [ids[2], ids[3]]
    assert last["next_cursor"] is None
    assert (
        len(
            (await client.get("/api/v1/announcements/upcoming", headers=student)).json()
        )
        == 3
    )
    assert (
        await client.get(
            "/api/v1/announcements?type=general&subject=ds", headers=student
        )
    ).json()["items"] == []
    assert (
        await client.get("/api/v1/announcements/unread-count", headers=student)
    ).json()["count"] == 4
    assert (
        await client.post("/api/v1/me/seen-updates", headers=student)
    ).status_code == 204
    assert (
        await client.get("/api/v1/announcements/unread-count", headers=student)
    ).json()["count"] == 0
    assert (
        await client.get("/api/v1/announcements?cursor=bad", headers=student)
    ).status_code == 422
    assert (
        await client.get("/api/v1/announcements/not-an-id", headers=student)
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/announcements/{ids[0]}", headers=admin)
    ).status_code == 204
    assert (
        await client.get(f"/api/v1/announcements/{ids[0]}", headers=student)
    ).status_code == 404


async def test_attachments_are_owned_bounded_and_private(
    client: AsyncClient, database: Database, storage: FakeStorage
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    attached = await client.post(
        "/api/v1/announcements/attachments",
        headers=admin,
        files={"file": ("quiz.pdf", PDF, "application/pdf")},
    )
    assert attached.status_code == 201, attached.text
    file_id = attached.json()["file_id"]
    created = await client.post(
        "/api/v1/announcements", headers=admin, json=update_body(file_ids=[file_id])
    )
    assert created.status_code == 201, created.text
    item = created.json()
    assert len(item["attachments"]) == 1
    link = await client.get(
        f"/api/v1/announcements/{item['id']}/attachments/{file_id}/download",
        headers=student,
    )
    assert link.status_code == 200 and link.json()["expires_in"] == 600
    assert link.headers["cache-control"] == "no-store"
    assert "key" not in str(item)
    assert (
        await client.post(
            "/api/v1/announcements", headers=admin, json=update_body(file_ids=[file_id])
        )
    ).status_code == 422
    assert (
        await client.get(
            f"/api/v1/announcements/{item['id']}/attachments/{ObjectId()}/download",
            headers=student,
        )
    ).status_code == 404
    await database.files.update_one(
        {"_id": ObjectId(file_id)},
        {
            "$set": {
                "status": "pending",
                "created_at": datetime.now(UTC) - timedelta(days=2),
            }
        },
    )
    import asyncio

    await sweep(database, storage, asyncio.Lock())
    assert (await database.files.find_one({"_id": ObjectId(file_id)}))[
        "status"
    ] == "ready"
    edited = await client.patch(
        f"/api/v1/announcements/{item['id']}",
        headers=admin,
        json={"file_ids": [], "body": "Updated body"},
    )
    assert edited.status_code == 200, edited.text
    assert (await database.files.find_one({"_id": ObjectId(file_id)}))[
        "status"
    ] == "deleted"
    assert (
        await client.post(
            "/api/v1/announcements/attachments",
            headers=admin,
            files={"file": ("fake.pdf", b"not a PDF", "application/pdf")},
        )
    ).status_code == 422


async def test_device_ownership_push_batches_and_failure(
    client: AsyncClient, database: Database, push: FakePush
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    member = await database.users.find_one({"email": "l250001@lhr.nu.edu.pk"})
    author = await database.users.find_one({"email": "l250002@lhr.nu.edu.pk"})
    assert member and author
    now = datetime.now(UTC)
    await database.devices.insert_many(
        [
            {
                "user_id": member["_id"],
                "expo_push_token": f"ExpoPushToken[t{i}]",
                "platform": "android",
                "notifications_enabled": True,
                "created_at": now,
            }
            for i in range(250)
        ]
    )
    await client.put(
        "/api/v1/me/devices",
        headers=student,
        json={
            "expo_push_token": "ExpoPushToken[expired]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    await client.put(
        "/api/v1/me/devices",
        headers=admin,
        json={
            "expo_push_token": "ExpoPushToken[author]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    await client.put(
        "/api/v1/me/devices",
        headers=student,
        json={
            "expo_push_token": "ExpoPushToken[off]",
            "platform": "ios",
            "notifications_enabled": False,
        },
    )
    await client.delete("/api/v1/me/devices/ExpoPushToken[author]", headers=student)
    assert (
        await database.devices.count_documents(
            {"expo_push_token": "ExpoPushToken[author]"}
        )
        == 1
    )
    item = (
        await client.post("/api/v1/announcements", headers=admin, json=update_body())
    ).json()
    assert [len(batch) for batch in push.batches] == [100, 100, 51]
    assert push.batches[0][0]["title"] == "Quiz · DS"
    assert push.batches[0][0]["priority"] == "high"
    assert push.batches[0][0]["channelId"] == "default"
    assert push.batches[0][0]["data"] == {"announcement_id": item["id"]}
    assert (
        await database.devices.count_documents(
            {"expo_push_token": "ExpoPushToken[expired]"}
        )
        == 0
    )
    push.batches.clear()
    await client.patch(
        f"/api/v1/announcements/{item['id']}",
        headers=admin,
        json={"title": "New title"},
    )
    assert push.batches == []
    push.fail = True
    assert (
        await client.patch(
            f"/api/v1/announcements/{item['id']}?notify=true",
            headers=admin,
            json={"title": "New title"},
        )
    ).status_code == 200
    assert len(push.batches) == 3
    await database.users.update_one(
        {"_id": member["_id"]}, {"$set": {"is_active": False}}
    )
    push.batches.clear()
    await client.post("/api/v1/announcements", headers=admin, json=update_body())
    assert push.batches == []
    assert (
        await client.put(
            "/api/v1/me/devices",
            headers=student,
            json={
                "expo_push_token": "bad",
                "platform": "android",
                "notifications_enabled": True,
            },
        )
    ).status_code == 403
    await client.delete("/api/v1/me/devices/ExpoPushToken[author]", headers=admin)
    assert (
        await database.devices.count_documents(
            {"expo_push_token": "ExpoPushToken[author]"}
        )
        == 0
    )


@pytest.mark.parametrize(
    "change",
    [
        {"title": " "},
        {"body": "x" * 2001},
        {"type": "other"},
        {"due_at": "2026-10-10T10:00:00"},
        {"file_ids": [str(ObjectId())] * 4},
        {"file_ids": [str(ObjectId())]},
        {"subject_slug": "unknown"},
    ],
)
async def test_invalid_updates(client: AsyncClient, change: dict[str, object]) -> None:
    admin = await login(client, "l250002")
    assert (
        await client.post(
            "/api/v1/announcements", headers=admin, json=update_body(**change)
        )
    ).status_code in (422, 404)


async def test_deadline_order_spans_pages_types_and_undated_rows(
    client: AsyncClient, database: Database
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    now = datetime.now(UTC)
    definitions = [
        ("Late pinned", 5, "quiz"),
        ("Undated old", None, "general"),
        ("Soon", 1, "task"),
        ("Same deadline old", 2, "datesheet"),
        ("Same deadline new", 2, "quiz"),
        ("Undated new", None, "general"),
    ]
    ids = []
    for index, (title, days, kind) in enumerate(definitions):
        response = await client.post(
            "/api/v1/announcements",
            headers=admin,
            json=update_body(
                title=title,
                type=kind,
                due_at=(now + timedelta(days=days)).isoformat() if days else None,
            ),
        )
        assert response.status_code == 201
        ids.append(response.json()["id"])
        await database.announcements.update_one(
            {"_id": ObjectId(ids[-1])},
            {
                "$set": {
                    "created_at": now + timedelta(seconds=index),
                    "pinned": index == 0,
                }
            },
        )
    expected = [ids[2], ids[4], ids[3], ids[0], ids[5], ids[1]]
    actual = []
    cursor = None
    for _ in range(6):
        params = {"limit": "1"}
        if cursor:
            params["cursor"] = cursor
        response = await client.get(
            "/api/v1/announcements", headers=student, params=params
        )
        assert response.status_code == 200
        actual.extend(row["id"] for row in response.json()["items"])
        cursor = response.json()["next_cursor"]
    assert actual == expected
    assert cursor is None
    filtered = await client.get(
        "/api/v1/announcements?type=quiz&subject=ds", headers=student
    )
    assert [row["id"] for row in filtered.json()["items"]] == [ids[4], ids[0]]
