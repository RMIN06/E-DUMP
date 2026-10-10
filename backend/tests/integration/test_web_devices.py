import base64
from hashlib import sha256
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.config import get_settings
from app.repositories.files import Database
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
from tests.integration.test_announcements import (
    update_body,
)
from tests.integration.test_materials import login


def subscription(name: str = "test") -> dict[str, object]:
    return {
        "endpoint": "https://fcm.googleapis.com/fcm/send/" + name,
        "keys": {
            "p256dh": base64.urlsafe_b64encode(b"\x04" + b"k" * 64).decode(),
            "auth": base64.urlsafe_b64encode(b"a" * 16).decode(),
        },
    }


@pytest.mark.parametrize(
    "method,path", [("GET", "/web-push-key"), ("PUT", "/web-devices")]
)
async def test_web_routes_require_auth(
    client: AsyncClient, method: str, path: str
) -> None:
    assert (
        await client.request(method, "/api/v1/me" + path, json={})
    ).status_code == 401


async def test_key_and_owned_subscription(
    client: AsyncClient, database: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    first = await login(client)
    second = await login(client, "l250003")
    assert (await client.get("/api/v1/me/web-push-key", headers=first)).json() == {
        "public_key": None
    }
    monkeypatch.setenv("WEB_PUSH_PUBLIC_KEY", "public-test-key")
    monkeypatch.setenv("WEB_PUSH_PRIVATE_KEY", "private-test-key")
    get_settings.cache_clear()
    assert (await client.get("/api/v1/me/web-push-key", headers=first)).json() == {
        "public_key": "public-test-key"
    }
    data = {"subscription": subscription(), "notifications_enabled": True}
    assert (
        await client.put("/api/v1/me/web-devices", json=data, headers=first)
    ).status_code == 204
    token = "webpush:" + sha256(str(subscription()["endpoint"]).encode()).hexdigest()
    assert (
        await client.delete("/api/v1/me/devices/" + token, headers=second)
    ).status_code == 204
    assert await database.devices.count_documents({}) == 1
    assert (
        await client.delete("/api/v1/me/devices/" + token, headers=first)
    ).status_code == 204
    assert await database.devices.count_documents({}) == 0


@pytest.mark.parametrize(
    "endpoint",
    [
        "http://fcm.googleapis.com/a",
        "https://localhost/a",
        "https://fcm.googleapis.com.evil.test/a",
        "https://fcm.googleapis.com:8443/a",
        "https://user@fcm.googleapis.com/a",
    ],
)
async def test_push_ssrf_rejected(client: AsyncClient, endpoint: str) -> None:
    headers = await login(client)
    assert (
        await client.put(
            "/api/v1/me/web-devices",
            headers=headers,
            json={
                "subscription": subscription() | {"endpoint": endpoint},
                "notifications_enabled": True,
            },
        )
    ).status_code == 422


async def test_web_delivery_skips_author_disabled_and_inactive_prunes_expired(
    client: AsyncClient, database: Database, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin = await login(client, "l250002")
    for email, name, enabled in [
        ("l250002", "author", True),
        ("l250003", "active", True),
        ("l250004", "expired", True),
        ("l250005", "disabled", False),
        ("l250006", "inactive", True),
    ]:
        headers = await login(client, email)
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
        {"email": "l250006@lhr.nu.edu.pk"}, {"$set": {"is_active": False}}
    )
    send = AsyncMock(side_effect=[False, True])
    monkeypatch.setattr("app.integrations.web_push.send", send)
    created = await client.post(
        "/api/v1/announcements", headers=admin, json=update_body()
    )
    assert created.status_code == 201
    assert send.await_count == 2
    assert {call.args[0]["endpoint"] for call in send.await_args_list} == {
        subscription("active")["endpoint"],
        subscription("expired")["endpoint"],
    }
    assert (
        await database.devices.count_documents(
            {"subscription.endpoint": subscription("expired")["endpoint"]}
        )
        == 0
    )


async def test_web_delivery_failure_preserves_update(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    admin = await login(client, "l250002")
    student = await login(client)
    await client.put(
        "/api/v1/me/web-devices",
        headers=student,
        json={"subscription": subscription(), "notifications_enabled": True},
    )
    monkeypatch.setattr(
        "app.integrations.web_push.send",
        AsyncMock(side_effect=RuntimeError("provider failed")),
    )
    assert (
        await client.post("/api/v1/announcements", headers=admin, json=update_body())
    ).status_code == 201
