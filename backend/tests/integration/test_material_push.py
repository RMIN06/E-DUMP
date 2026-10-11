from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.repositories.files import Database
from tests.integration.test_announcements import FakePush
from tests.integration.test_announcements import client as client
from tests.integration.test_announcements import database as database
from tests.integration.test_announcements import push as push
from tests.integration.test_announcements import storage as storage
from tests.integration.test_materials import login, upload
from tests.integration.test_web_devices import subscription


async def test_upload_notifies_only_other_active_enabled_devices(
    client: AsyncClient,
    database: Database,
    push: FakePush,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    author = await login(client)
    for roll, name, enabled in [
        ("l250001", "author", True),
        ("l250003", "active", True),
        ("l250004", "disabled", False),
        ("l250005", "inactive", True),
    ]:
        headers = await login(client, roll)
        assert (
            await client.put(
                "/api/v1/me/devices",
                headers=headers,
                json={
                    "expo_push_token": f"ExponentPushToken[{name}]",
                    "platform": "android",
                    "notifications_enabled": enabled,
                },
            )
        ).status_code == 204
        assert (
            await client.put(
                "/api/v1/me/web-devices",
                headers=headers,
                json={
                    "subscription": subscription(name),
                    "notifications_enabled": enabled,
                },
            )
        ).status_code == 204
    await database.users.update_one(
        {"email": "l250005@lhr.nu.edu.pk"}, {"$set": {"is_active": False}}
    )
    send = AsyncMock(return_value=False)
    monkeypatch.setattr("app.integrations.web_push.send", send)
    response = await upload(client, author)
    assert response.status_code == 201
    item = response.json()
    assert len(push.batches) == 1 and len(push.batches[0]) == 1
    message = push.batches[0][0]
    assert message["to"] == "ExponentPushToken[active]"
    assert message["data"] == {"material_id": item["id"]}
    assert message["title"] == "Material · COAL"
    assert message["body"] == item["title"]
    send.assert_awaited_once()
    assert send.await_args.args[0]["endpoint"] == subscription("active")["endpoint"]
    assert send.await_args.args[1]["material_id"] == item["id"]
    # Duplicate retry and invalid file create no second alert.
    assert (await upload(client, author)).status_code == 409
    assert (await upload(client, author, body=b"invalid")).status_code == 422
    assert len(push.batches) == 1 and send.await_count == 1


async def test_push_provider_failure_does_not_rollback_upload(
    client: AsyncClient, push: FakePush, monkeypatch: pytest.MonkeyPatch
) -> None:
    author = await login(client)
    recipient = await login(client, "l250003")
    await client.put(
        "/api/v1/me/devices",
        headers=recipient,
        json={
            "expo_push_token": "ExponentPushToken[active]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    await client.put(
        "/api/v1/me/web-devices",
        headers=recipient,
        json={"subscription": subscription(), "notifications_enabled": True},
    )
    push.fail = True
    monkeypatch.setattr(
        "app.integrations.web_push.send",
        AsyncMock(side_effect=RuntimeError("provider unavailable")),
    )
    response = await upload(client, author)
    assert response.status_code == 201
    assert (
        await client.get(
            "/api/v1/materials/" + response.json()["id"], headers=recipient
        )
    ).status_code == 200
