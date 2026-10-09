import asyncio
import os
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.db.indexes import ensure_indexes
from app.deps import get_db, require_admin
from app.errors import DomainError
from app.main import create_app
from app.models.user import UserRecord
from app.repositories import users
from app.routers.auth import limiter
from app.services.auth_service import hash_refresh

TEST_DATABASE = "edump_m1_test_" + uuid4().hex


@pytest.fixture
async def database() -> AsyncIterator[AsyncDatabase[dict[str, object]]]:
    uri = os.getenv("TEST_MONGODB_URI")
    if not uri:
        pytest.fail(
            "M1 integration tests require TEST_MONGODB_URI pointing to MongoDB 7."
        )
    async with AsyncMongoClient[dict[str, object]](uri, tz_aware=True) as mongo:
        database = mongo[TEST_DATABASE]
        await mongo.admin.command("ping")
        for name in await database.list_collection_names():
            await database[name].delete_many({})
        await ensure_indexes(database)
        yield database
        await mongo.drop_database(TEST_DATABASE)


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


async def sign_in(
    client: AsyncClient, email: str = "l250001@lhr.nu.edu.pk"
) -> dict[str, object]:
    response = await client.post("/api/v1/auth/login", json={"email": email})
    assert response.status_code == 200, response.text
    return response.json()


def authorization(session: dict[str, object]) -> dict[str, str]:
    return {"Authorization": "Bearer " + str(session["access_token"])}


async def test_auth_1_profile_and_admin_bootstrap(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    """AUTH-1/A1/A3/A5: normalization, name onboarding and admin bootstrap."""
    first = await sign_in(client, " L250001@LHR.NU.EDU.PK ")
    assert first["needs_name"] is True
    public = first["user"]
    assert isinstance(public, dict)
    assert public["email"] == "l250001@lhr.nu.edu.pk"
    assert public["role"] == "student"
    assert public["created_at"].endswith("Z")
    assert set(public) == {
        "id",
        "email",
        "name",
        "role",
        "is_active",
        "roll_no",
        "created_at",
        "last_login_at",
        "last_seen_updates_at",
    }
    saved = await client.patch(
        "/api/v1/me", json={"name": " Ali Raza "}, headers=authorization(first)
    )
    assert saved.status_code == 200
    assert saved.json()["name"] == "Ali Raza"
    second = await sign_in(client)
    assert second["needs_name"] is False
    assert await database.users.count_documents({}) == 1
    admin = await sign_in(client, "l250002@lhr.nu.edu.pk")
    assert isinstance(admin["user"], dict)
    assert admin["user"]["role"] == "admin"
    await database.users.update_one(
        {"email": "l250002@lhr.nu.edu.pk"}, {"$set": {"role": "student"}}
    )
    recovered = await sign_in(client, "l250002@lhr.nu.edu.pk")
    assert isinstance(recovered["user"], dict) and recovered["user"]["role"] == "admin"


@pytest.mark.parametrize(
    "method,path",
    [("post", "/api/v1/auth/logout"), ("get", "/api/v1/me"), ("patch", "/api/v1/me")],
)
@pytest.mark.parametrize("role", ["anonymous", "student", "admin", "disabled"])
async def test_auth_3_route_matrix(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    method: str,
    path: str,
    role: str,
) -> None:
    """AUTH-3: every protected M1 route enforces current active user authorization."""
    session = await sign_in(
        client, "l250002@lhr.nu.edu.pk" if role == "admin" else "l250001@lhr.nu.edu.pk"
    )
    headers = {} if role == "anonymous" else authorization(session)
    if role == "disabled":
        await database.users.update_many({}, {"$set": {"is_active": False}})
    body = (
        {"refresh_token": session["refresh_token"]}
        if method == "post"
        else {"name": "Test Student"}
    )
    response = await client.request(
        method, path, headers=headers, **({"json": body} if method != "get" else {})
    )
    assert response.status_code == (
        401
        if role == "anonymous"
        else 403
        if role == "disabled"
        else 204
        if method == "post"
        else 200
    )
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


async def test_auth_2_rotation_reuse_and_hash_only_storage(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    """AUTH-2/A6: refresh rotation and replay revoke all successors in the family."""
    session = await sign_in(client)
    raw = str(session["refresh_token"])
    document = await database.refresh_tokens.find_one({"token_hash": hash_refresh(raw)})
    assert document is not None and raw not in str(document)
    assert len(raw) >= 43
    rotated = await client.post("/api/v1/auth/refresh", json={"refresh_token": raw})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != raw
    replay = await client.post("/api/v1/auth/refresh", json={"refresh_token": raw})
    assert (
        replay.status_code == 401 and replay.json()["error"]["code"] == "invalid_token"
    )
    assert (
        await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": rotated.json()["refresh_token"]},
        )
    ).status_code == 401
    indexes = await database.refresh_tokens.index_information()
    assert indexes["expires_at_1"]["expireAfterSeconds"] == 0


async def test_auth_2_concurrent_replay_cannot_leave_live_successor(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    """AUTH-2: simultaneous rotation/replay cannot escape family revocation."""
    session = await sign_in(client)
    results = await asyncio.gather(
        *(
            client.post(
                "/api/v1/auth/refresh", json={"refresh_token": session["refresh_token"]}
            )
            for _ in range(5)
        )
    )
    assert sorted(result.status_code for result in results) == [200, 401, 401, 401, 401]
    assert await database.refresh_tokens.count_documents({"revoked_at": None}) == 0


async def test_auth_4_logout_and_foreign_family(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    """AUTH-4: logout revokes its family and cannot revoke someone else's session."""
    first = await sign_in(client)
    second = await sign_in(client, "l250003@lhr.nu.edu.pk")
    assert (
        await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": second["refresh_token"]},
            headers=authorization(first),
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": first["refresh_token"]},
            headers=authorization(first),
        )
    ).status_code == 204
    assert (
        await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]}
        )
    ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": "unknown"},
            headers=authorization(first),
        )
    ).status_code == 204
    assert (
        await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": second["refresh_token"]}
        )
    ).status_code == 200


async def test_auth_3_disable_and_role_change_apply_immediately(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    """AUTH-3/A4/A8: database role and active state override previously issued JWTs."""
    session = await sign_in(client)
    await database.users.update_many({}, {"$set": {"role": "admin"}})
    assert (await client.get("/api/v1/me", headers=authorization(session))).json()[
        "role"
    ] == "admin"
    user = await users.by_email(database, "l250001@lhr.nu.edu.pk")
    assert isinstance(user, UserRecord) and require_admin(user) is user
    user.role = "student"
    with pytest.raises(DomainError, match="admin"):
        require_admin(user)
    await database.users.update_many({}, {"$set": {"is_active": False}})
    assert (
        await client.get("/api/v1/me", headers=authorization(session))
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": session["refresh_token"]}
        )
    ).status_code == 401
    assert (
        await client.post("/api/v1/auth/login", json={"email": "l250001@lhr.nu.edu.pk"})
    ).status_code == 403
    assert await database.refresh_tokens.count_documents({"revoked_at": None}) == 0


@pytest.mark.parametrize("case", ["expired", "deleted", "disabled", "unknown"])
async def test_auth_2_refresh_rejections(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]], case: str
) -> None:
    session = await sign_in(client)
    raw = session["refresh_token"]
    if case == "expired":
        await database.refresh_tokens.update_many(
            {}, {"$set": {"expires_at": datetime.now(UTC) - timedelta(seconds=1)}}
        )
    elif case == "deleted":
        await database.users.delete_many({})
        assert (
            await client.get("/api/v1/me", headers=authorization(session))
        ).status_code == 401
    elif case == "disabled":
        await database.users.update_many({}, {"$set": {"is_active": False}})
    else:
        raw = "unknown"
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": raw})
    assert response.status_code == (403 if case == "disabled" else 401)


@pytest.mark.parametrize("name", ["x", " " * 4, "x" * 41, "Ali\nRaza"])
async def test_auth_1_name_validation(client: AsyncClient, name: str) -> None:
    session = await sign_in(client)
    response = await client.patch(
        "/api/v1/me", json={"name": name}, headers=authorization(session)
    )
    assert (
        response.status_code == 422
        and response.json()["error"]["code"] == "validation_error"
    )


async def test_auth_1_invalid_email_never_creates_user(
    client: AsyncClient, database: AsyncDatabase[dict[str, object]]
) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": "someone@gmail.com"}
    )
    assert (
        response.status_code == 422
        and response.json()["error"]["code"] == "invalid_email"
    )
    assert await database.users.count_documents({}) == 0
    assert (
        await client.post("/api/v1/auth/login", json={"email": "x" * 257})
    ).status_code == 422


async def test_auth_1_login_rate_limits(client: AsyncClient) -> None:
    """AUTH-1/A9: sixth normalized email attempt and eleventh IP attempt are limited."""
    for _ in range(5):
        await sign_in(client)
    response = await client.post(
        "/api/v1/auth/login", json={"email": " L250001@LHR.NU.EDU.PK "}
    )
    assert response.status_code == 429 and response.headers["retry-after"] == "60"
    limiter.reset()
    for number in range(10):
        await sign_in(client, f"l25{number:04d}@lhr.nu.edu.pk")
    assert (
        await client.post("/api/v1/auth/login", json={"email": "l250100@lhr.nu.edu.pk"})
    ).status_code == 429


async def test_auth_1_new_account_hourly_limit(
    client: AsyncClient,
    database: AsyncDatabase[dict[str, object]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """AUTH-1: new account quota is independent from the minute quotas."""
    clock = time.time()
    monkeypatch.setattr("limits.storage.memory.time.time", lambda: clock)
    for number in range(20):
        if number % 5 == 0:
            clock += 61
        await sign_in(client, f"l25{number:04d}@lhr.nu.edu.pk")
    clock += 61
    assert (
        await client.post("/api/v1/auth/login", json={"email": "l250100@lhr.nu.edu.pk"})
    ).status_code == 429
    assert await database.users.count_documents({}) == 20


async def test_auth_3_bad_bearer(client: AsyncClient) -> None:
    for token in ["Bearer malformed", "Basic abc"]:
        response = await client.get("/api/v1/me", headers={"Authorization": token})
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"
