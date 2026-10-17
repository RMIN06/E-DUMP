import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.models.announcement import AnnouncementRecord, AnnouncementType
from app.repositories import announcements
from app.repositories.files import Database
from app.services import reminder_service
from tests.integration.test_announcements import (
    FakePush,
)
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
from tests.integration.test_materials import login
from tests.integration.test_web_devices import subscription

NOW = datetime(2026, 10, 20, 5, tzinfo=UTC)


async def add_update(
    database: Database,
    due: datetime | None,
    *,
    kind: AnnouncementType = "quiz",
    author: ObjectId | None = None,
    created: datetime = NOW - timedelta(days=2),
) -> AnnouncementRecord:
    item = AnnouncementRecord(
        _id=ObjectId(),
        type=kind,
        title="Chapter three",
        body="Read the chapter.",
        subject_slug="ds",
        due_at=due,
        author_id=author or ObjectId(),
        author_name_snapshot="Class admin",
        created_at=created,
        updated_at=created,
    )
    await announcements.insert(database, item)
    return item


async def test_every_dated_type_once_at_24_hours_and_after_restart(
    client: AsyncClient,
    database: Database,
    push: FakePush,
) -> None:
    student = await login(client)
    await client.put(
        "/api/v1/me/devices",
        headers=student,
        json={
            "expo_push_token": "ExpoPushToken[test]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    due = NOW + timedelta(hours=24)
    items = [
        await add_update(database, due, kind=kind)
        for kind in ("quiz", "task", "datesheet", "general")
    ]
    await reminder_service.sweep(database, push, NOW - timedelta(seconds=1))
    assert push.batches == []
    await asyncio.gather(
        reminder_service.sweep(database, push, NOW),
        reminder_service.sweep(database, push, NOW),
    )
    assert len(push.batches) == 4
    assert {batch[0]["data"]["announcement_id"] for batch in push.batches} == {
        str(item.id) for item in items
    }
    assert all(
        batch[0]["ttl"] == 86400 and str(batch[0]["body"]).startswith("1 day left:")
        for batch in push.batches
    )
    assert all("DS" in str(batch[0]["title"]) for batch in push.batches)
    restarted = FakePush()
    await reminder_service.sweep(database, restarted, NOW + timedelta(minutes=1))
    assert restarted.batches == []
    for item in items:
        assert (await database.announcements.find_one({"_id": item.id}))[
            "reminded_deadlines"
        ] == [due]


async def test_sleep_catchup_skips_expired_undated_and_new_last_day_posts(
    client: AsyncClient,
    database: Database,
    push: FakePush,
) -> None:
    user = await login(client)
    await client.put(
        "/api/v1/me/devices",
        headers=user,
        json={
            "expo_push_token": "ExpoPushToken[test]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    late = await add_update(database, NOW + timedelta(hours=3))
    for due in (None, NOW, NOW - timedelta(seconds=1), NOW + timedelta(days=2)):
        await add_update(database, due)
    await add_update(database, NOW + timedelta(hours=3), created=NOW)
    await reminder_service.sweep(database, push, NOW)
    assert len(push.batches) == 1
    message = push.batches[0][0]
    assert message["data"] == {"announcement_id": str(late.id)}
    assert message["ttl"] == 10800
    assert str(message["body"]).startswith("Less than 1 day left:")


async def test_edits_preserve_markers_and_reschedule_only_changed_deadlines(
    database: Database,
) -> None:
    item = await add_update(database, NOW + timedelta(hours=24))
    assert await announcements.claim_reminder(database, item)
    item.title = "Updated chapter"
    item.updated_at = NOW
    await announcements.update(database, item)
    assert await announcements.reminder_candidates(database, NOW) == []
    previous_due = item.due_at
    item.due_at = NOW + timedelta(days=2)
    item.updated_at = NOW + timedelta(seconds=1)
    await announcements.update(database, item)
    assert await announcements.reminder_candidates(database, NOW) == []
    assert await announcements.reminder_candidates(database, NOW + timedelta(days=1))
    assert await announcements.claim_reminder(database, item)
    item.due_at = previous_due
    await announcements.update(database, item)
    assert await announcements.reminder_candidates(database, NOW) == []
    stale = await add_update(database, NOW + timedelta(hours=24))
    await database.announcements.update_one(
        {"_id": stale.id}, {"$set": {"due_at": None}}
    )
    assert not await announcements.claim_reminder(database, stale)
    await database.announcements.delete_one({"_id": stale.id})
    assert not await announcements.claim_reminder(database, stale)


async def test_reminders_respect_device_and_account_preferences(
    client: AsyncClient,
    database: Database,
    push: FakePush,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    student = await login(client)
    author = await login(client, "l250002")
    disabled = await login(client, "l250003")
    off = await login(client, "l250004")
    for headers, token, enabled in (
        (student, "active", True),
        (author, "author", True),
        (disabled, "disabled", True),
        (off, "off", False),
    ):
        await client.put(
            "/api/v1/me/devices",
            headers=headers,
            json={
                "expo_push_token": f"ExpoPushToken[{token}]",
                "platform": "android",
                "notifications_enabled": enabled,
            },
        )
        await client.put(
            "/api/v1/me/web-devices",
            headers=headers,
            json={
                "subscription": subscription(token),
                "platform": "web",
                "notifications_enabled": enabled,
            },
        )
    await database.users.update_one(
        {"email": "l250003@lhr.nu.edu.pk"}, {"$set": {"is_active": False}}
    )
    author_id = ObjectId((await client.get("/api/v1/me", headers=author)).json()["id"])
    sender = AsyncMock(return_value=False)
    monkeypatch.setattr("app.integrations.web_push.send", sender)
    item = await add_update(database, NOW + timedelta(hours=24), author=author_id)
    await reminder_service.sweep(database, push, NOW)
    assert [message["to"] for batch in push.batches for message in batch] == [
        "ExpoPushToken[active]"
    ]
    sender.assert_awaited_once()
    assert sender.call_args.args[0]["endpoint"].endswith("active")
    assert sender.call_args.args[1]["announcement_id"] == str(item.id)
    assert sender.call_args.kwargs["ttl"] == 86400


async def test_failed_provider_is_not_broadcast_twice(
    client: AsyncClient,
    database: Database,
    push: FakePush,
) -> None:
    student = await login(client)
    await client.put(
        "/api/v1/me/devices",
        headers=student,
        json={
            "expo_push_token": "ExpoPushToken[test]",
            "platform": "android",
            "notifications_enabled": True,
        },
    )
    await add_update(database, NOW + timedelta(hours=24))
    push.fail = True
    await reminder_service.sweep(database, push, NOW)
    await reminder_service.sweep(database, push, NOW)
    assert len(push.batches) == 1
