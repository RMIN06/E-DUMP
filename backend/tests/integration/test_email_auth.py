import asyncio
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import AsyncClient

from app.deps import get_email_sender
from app.errors import Unavailable
from app.repositories import devices
from app.repositories.files import Database
from app.services.auth_service import hash_refresh, token_secret
from tests.email_helpers import FakeEmailSender, verified_login
from tests.integration.test_auth import authorization
from tests.integration.test_auth import client as client
from tests.integration.test_auth import database as database

EMAIL = "l250001@lhr.nu.edu.pk"


async def request(client: AsyncClient, email: str = EMAIL) -> dict[str, object]:
    result = await client.post("/api/v1/auth/login", json={"email": email})
    assert result.status_code == 200, result.text
    return result.json()


async def verify(
    client: AsyncClient, challenge: dict[str, object], code: str, email: str = EMAIL
):
    return await client.post(
        "/api/v1/auth/verify",
        json={
            "email": email,
            "challenge_id": challenge["challenge_id"],
            "code": code,
        },
    )


async def test_email_ownership_gate_and_single_use(
    client: AsyncClient, database: Database
):
    """AUTH-1: no access before proof; verification codes work only once."""
    challenge = await request(client)
    assert set(challenge) == {"challenge_id", "expires_in", "retry_after"}
    assert await database.users.count_documents({}) == 0
    assert await database.refresh_tokens.count_documents({}) == 0
    code = FakeEmailSender.messages[EMAIL]
    stored = await database.email_codes.find_one({"_id": EMAIL})
    assert code not in str(stored) and "digest" in stored
    result = await verify(client, challenge, code)
    assert result.status_code == 200
    assert result.json()["needs_name"] is True
    assert (await verify(client, challenge, code)).status_code == 400
    assert await database.refresh_tokens.count_documents({}) == 1


@pytest.mark.parametrize(
    "case", ["expired", "wrong_email", "wrong_challenge", "five_guesses"]
)
async def test_invalid_proof_cannot_issue_tokens(
    client: AsyncClient, database: Database, case: str
):
    challenge = await request(client)
    code = FakeEmailSender.messages[EMAIL]
    email = EMAIL
    if case == "expired":
        await database.email_codes.update_one(
            {"_id": EMAIL},
            {"$set": {"expires_at": datetime.now(UTC) - timedelta(seconds=1)}},
        )
    elif case == "wrong_email":
        email = "l250003@lhr.nu.edu.pk"
    elif case == "wrong_challenge":
        challenge["challenge_id"] = "x" * 32
    else:
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            assert (await verify(client, challenge, wrong)).status_code == 400
    assert (await verify(client, challenge, code, email)).status_code == 400
    assert await database.users.count_documents({}) == 0


async def test_resend_replaces_code_and_persists_limits(
    client: AsyncClient, database: Database
):
    first = await request(client)
    first_code = FakeEmailSender.messages[EMAIL]
    assert (
        await client.post("/api/v1/auth/login", json={"email": EMAIL})
    ).status_code == 429
    from app.routers.auth import limiter

    for _ in range(4):
        limiter.reset()
        await database.email_codes.update_one(
            {"_id": EMAIL},
            {"$set": {"requested_at": datetime.now(UTC) - timedelta(seconds=61)}},
        )
        latest = await request(client)
    assert (await verify(client, first, first_code)).status_code == 400
    assert (
        await verify(client, latest, FakeEmailSender.messages[EMAIL])
    ).status_code == 200
    from app.routers.auth import limiter

    limiter.reset()
    await database.email_codes.update_one(
        {"_id": EMAIL},
        {"$set": {"requested_at": datetime.now(UTC) - timedelta(seconds=61)}},
    )
    assert (
        await client.post("/api/v1/auth/login", json={"email": EMAIL})
    ).status_code == 429


async def test_parallel_verification_only_one_session(
    client: AsyncClient, database: Database
):
    challenge = await request(client)
    results = await asyncio.gather(
        *(verify(client, challenge, FakeEmailSender.messages[EMAIL]) for _ in range(2))
    )
    assert sorted(result.status_code for result in results) == [200, 400]
    assert await database.refresh_tokens.count_documents({}) == 1


async def test_delivery_failure_and_daily_cap_fail_closed(
    client: AsyncClient, database: Database
):
    class BrokenSender:
        async def send_code(self, email: str, code: str):
            raise Unavailable()

    client._transport.app.dependency_overrides[get_email_sender] = BrokenSender
    result = await client.post("/api/v1/auth/login", json={"email": EMAIL})
    assert result.status_code == 503
    assert await database.users.count_documents({}) == 0
    stored = await database.email_codes.find_one({"_id": EMAIL})
    assert stored["consumed"] and not stored["delivered"]
    await database.email_delivery_limits.update_many({}, {"$set": {"count": 180}})
    assert (
        await client.post("/api/v1/auth/login", json={"email": "l250003@lhr.nu.edu.pk"})
    ).status_code == 429


async def test_legacy_sessions_and_devices_require_verification(
    client: AsyncClient, database: Database
):
    session = (await verified_login(client, EMAIL)).json()
    access = jwt.decode(session["access_token"], token_secret(), algorithms=["HS256"])
    access.pop("auth_version")
    old = jwt.encode(access, token_secret(), algorithm="HS256")
    assert (
        await client.get("/api/v1/me", headers={"Authorization": "Bearer " + old})
    ).status_code == 401
    await database.refresh_tokens.update_one(
        {"token_hash": hash_refresh(session["refresh_token"])},
        {"$unset": {"auth_version": ""}},
    )
    assert (
        await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": session["refresh_token"]}
        )
    ).status_code == 401
    from bson import ObjectId

    user_id = ObjectId(session["user"]["id"])
    await database.devices.insert_one(
        {
            "user_id": user_id,
            "platform": "android",
            "notifications_enabled": True,
            "expo_push_token": "ExpoPushToken[legacy]",
        }
    )
    assert await devices.recipients(database, ObjectId()) == []
    await database.devices.insert_one(
        {
            "user_id": user_id,
            "platform": "web",
            "notifications_enabled": True,
            "expo_push_token": "webpush:legacy",
            "subscription": {},
        }
    )
    assert await devices.web_recipients(database, ObjectId()) == []
    assert (
        await client.get("/api/v1/me", headers=authorization(session))
    ).status_code == 200


async def test_account_deletion_removes_pending_email_proof(
    client: AsyncClient, database: Database
):
    session = (await verified_login(client, EMAIL)).json()
    await database.email_codes.update_one(
        {"_id": EMAIL},
        {"$set": {"requested_at": datetime.now(UTC) - timedelta(seconds=61)}},
    )
    pending = await request(client)
    code = FakeEmailSender.messages[EMAIL]
    assert (
        await client.delete("/api/v1/me", headers=authorization(session))
    ).status_code == 204
    assert await database.email_codes.find_one({"_id": EMAIL}) is None
    assert (await verify(client, pending, code)).status_code == 400
