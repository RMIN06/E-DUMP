import asyncio
from datetime import UTC, datetime

import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.errors import DomainError
from app.models.admin import UserPatch
from app.models.user import UserRecord
from app.repositories.files import Database
from app.services import admin_service
from tests.email_helpers import verified_login
from tests.fakes import FakeStorage
from tests.integration.test_announcements import (
    client as client,
)
from tests.integration.test_announcements import (
    database as database,
)
from tests.integration.test_announcements import (
    push as push,
)
from tests.integration.test_announcements import (
    storage as storage,
)
from tests.integration.test_materials import login, upload


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/admin/users"),
        ("GET", "/admin/reports"),
        ("PATCH", "/admin/users/000000000000000000000001"),
        ("PATCH", "/admin/reports/000000000000000000000001"),
    ],
)
@pytest.mark.parametrize("actor", ["anonymous", "student", "disabled"])
async def test_admin_authorization_matrix(
    client: AsyncClient, database: Database, method: str, path: str, actor: str
) -> None:
    headers = (
        {}
        if actor == "anonymous"
        else await login(client, "l250002" if actor == "disabled" else "l250001")
    )
    if actor == "disabled":
        await database.users.update_one(
            {"email": "l250002@lhr.nu.edu.pk"}, {"$set": {"is_active": False}}
        )
    result = await client.request(
        method,
        "/api/v1" + path,
        headers=headers,
        json={"role": "admin", "action": "dismiss"},
    )
    assert result.status_code == (401 if actor == "anonymous" else 403)


async def test_roles_and_disabling_apply_to_existing_tokens(
    client: AsyncClient, database: Database
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    member = (await client.get("/api/v1/me", headers=student)).json()
    users = await client.get("/api/v1/admin/users?q=L250001", headers=admin)
    assert users.status_code == 200 and len(users.json()) == 1
    assert users.headers["cache-control"] == "no-store"
    assert (await client.get("/api/v1/admin/users?q=.*", headers=admin)).json() == []
    assert (
        await client.patch(
            f"/api/v1/admin/users/{member['id']}", headers=admin, json={"role": "admin"}
        )
    ).status_code == 200
    assert (await client.get("/api/v1/admin/users", headers=student)).status_code == 200
    assert (
        await client.patch(
            f"/api/v1/admin/users/{member['id']}",
            headers=admin,
            json={"role": "student"},
        )
    ).status_code == 200
    assert (await client.get("/api/v1/admin/users", headers=student)).status_code == 403
    assert (
        await client.patch(
            f"/api/v1/admin/users/{member['id']}",
            headers=admin,
            json={"is_active": False},
        )
    ).status_code == 200
    assert (await client.get("/api/v1/me", headers=student)).status_code == 403
    assert (
        await database.refresh_tokens.count_documents(
            {"user_id": ObjectId(member["id"]), "revoked_at": None}
        )
        == 0
    )
    assert (
        await client.patch(
            f"/api/v1/admin/users/{member['id']}",
            headers=admin,
            json={"is_active": True},
        )
    ).status_code == 200
    assert (await client.get("/api/v1/me", headers=student)).status_code == 200


async def test_seeded_admin_restoration_and_account_transfer(
    client: AsyncClient,
) -> None:
    seeded = await login(client, "l250002")
    replacement = await login(client, "l250003")
    seeded_id = (await client.get("/api/v1/me", headers=seeded)).json()["id"]
    replacement_id = (await client.get("/api/v1/me", headers=replacement)).json()["id"]
    await client.patch(
        f"/api/v1/admin/users/{replacement_id}", headers=seeded, json={"role": "admin"}
    )
    assert (
        await client.patch(
            f"/api/v1/admin/users/{seeded_id}",
            headers=replacement,
            json={"role": "student"},
        )
    ).status_code == 200
    assert (await client.get("/api/v1/admin/users", headers=seeded)).status_code == 403
    restored = await login(client, "l250002")
    assert (
        await client.get("/api/v1/admin/users", headers=restored)
    ).status_code == 200
    await client.patch(
        f"/api/v1/admin/users/{seeded_id}",
        headers=replacement,
        json={"is_active": False},
    )
    assert (await verified_login(client, "l250002@lhr.nu.edu.pk")).status_code == 403
    await client.patch(
        f"/api/v1/admin/users/{seeded_id}",
        headers=replacement,
        json={"is_active": True},
    )
    assert (await client.delete("/api/v1/me", headers=restored)).status_code == 204
    assert (
        await client.get("/api/v1/admin/users", headers=replacement)
    ).status_code == 200


async def test_self_and_last_admin_guards(client: AsyncClient) -> None:
    admin = await login(client, "l250002")
    actor = (await client.get("/api/v1/me", headers=admin)).json()
    for change in [{"role": "student"}, {"is_active": False}]:
        assert (
            await client.patch(
                f"/api/v1/admin/users/{actor['id']}", headers=admin, json=change
            )
        ).status_code == 403
    assert (await client.delete("/api/v1/me", headers=admin)).status_code == 403
    assert (await client.delete("/api/v1/me")).status_code == 401
    assert (
        await client.patch(
            "/api/v1/admin/users/missing", headers=admin, json={"role": "student"}
        )
    ).status_code == 404
    for change in [
        {},
        {"role": None},
        {"is_active": "false"},
        {"email": "another@example.invalid"},
    ]:
        assert (
            await client.patch(
                f"/api/v1/admin/users/{actor['id']}", headers=admin, json=change
            )
        ).status_code == 422


async def test_concurrent_reciprocal_disable_keeps_one_active_admin(
    client: AsyncClient, database: Database
) -> None:
    first = await login(client, "l250002")
    second = await login(client)
    first_id = (await client.get("/api/v1/me", headers=first)).json()["id"]
    second_id = (await client.get("/api/v1/me", headers=second)).json()["id"]
    await client.patch(
        f"/api/v1/admin/users/{second_id}", headers=first, json={"role": "admin"}
    )
    # Capture both actors before either mutation, matching requests already in flight.
    actors = [
        UserRecord.model_validate(
            await database.users.find_one({"_id": ObjectId(value)})
        )
        for value in [first_id, second_id]
    ]
    lock = asyncio.Lock()
    results = await asyncio.gather(
        admin_service.change_user(
            database, lock, actors[0], second_id, UserPatch(is_active=False)
        ),
        admin_service.change_user(
            database, lock, actors[1], first_id, UserPatch(is_active=False)
        ),
        return_exceptions=True,
    )
    assert sum(isinstance(item, DomainError) for item in results) == 1
    assert (
        await database.users.count_documents({"role": "admin", "is_active": True}) == 1
    )


async def test_delete_account_erases_credentials_and_anonymizes_retained_uploads(
    client: AsyncClient, database: Database
) -> None:
    student = await login(client)
    member = (await client.get("/api/v1/me", headers=student)).json()
    material = (await upload(client, student)).json()
    await client.put(
        "/api/v1/me/devices",
        headers=student,
        json={
            "expo_push_token": "ExpoPushToken[delete]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    assert (await client.delete("/api/v1/me", headers=student)).status_code == 204
    user_id = ObjectId(member["id"])
    assert await database.users.find_one({"_id": user_id}) is None
    assert await database.devices.count_documents({"user_id": user_id}) == 0
    assert await database.refresh_tokens.count_documents({"user_id": user_id}) == 0
    assert (await client.get("/api/v1/me", headers=student)).status_code == 401
    other = await login(client, "l250003")
    retained = (
        await client.get(f"/api/v1/materials/{material['id']}", headers=other)
    ).json()
    assert retained["uploader_name"] == "Former member"
    assert (await database.materials.find_one({"_id": ObjectId(material["id"])}))[
        "uploader_name_snapshot"
    ] == "Former member"
    fresh = (await verified_login(client, member["email"])).json()
    assert fresh["needs_name"] and fresh["user"]["id"] != member["id"]


async def test_reports_dismiss_remove_and_retry_storage_failure(
    client: AsyncClient, database: Database, storage: FakeStorage
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    material = (await upload(client, student)).json()
    report = (
        await client.post(
            f"/api/v1/materials/{material['id']}/report",
            headers=student,
            json={"reason": "copyright", "note": "Please review"},
        )
    ).json()
    queue = await client.get("/api/v1/admin/reports", headers=admin)
    assert (
        queue.status_code == 200
        and queue.json()[0]["material_title"] == material["title"]
    )
    assert "email" not in str(queue.json())
    storage.fail_delete = True
    assert (
        await client.patch(
            f"/api/v1/admin/reports/{report['id']}",
            headers=admin,
            json={"action": "remove_material"},
        )
    ).status_code == 503
    assert (await database.reports.find_one({"_id": ObjectId(report["id"])}))[
        "status"
    ] == "open"
    storage.fail_delete = False
    assert (
        await client.patch(
            f"/api/v1/admin/reports/{report['id']}",
            headers=admin,
            json={"action": "remove_material"},
        )
    ).status_code == 204
    assert (
        await client.get(f"/api/v1/materials/{material['id']}", headers=student)
    ).status_code == 404
    assert (
        await client.patch(
            f"/api/v1/admin/reports/{report['id']}",
            headers=admin,
            json={"action": "dismiss"},
        )
    ).status_code == 409
    assert (await client.get("/api/v1/admin/reports", headers=admin)).json() == []
    resolved = (
        await client.get("/api/v1/admin/reports?status=resolved", headers=admin)
    ).json()[0]
    assert resolved["material_removed"] and resolved["resolved_by"]
    extra_id = ObjectId()
    await database.reports.insert_one(
        {
            "_id": extra_id,
            "material_id": ObjectId(material["id"]),
            "reporter_id": ObjectId(),
            "reason": "other",
            "note": None,
            "status": "open",
            "created_at": datetime.now(UTC),
            "resolved_by": None,
        }
    )
    assert (await client.get("/api/v1/admin/reports", headers=admin)).json()[0][
        "reporter_name"
    ] == "Former member"
    assert (
        await client.patch(
            f"/api/v1/admin/reports/{extra_id}",
            headers=admin,
            json={"action": "dismiss"},
        )
    ).status_code == 204
    assert (
        await client.patch(
            f"/api/v1/admin/reports/{ObjectId()}",
            headers=admin,
            json={"action": "dismiss"},
        )
    ).status_code == 404
