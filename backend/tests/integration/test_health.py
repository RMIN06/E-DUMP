import os
from collections.abc import AsyncIterator
from typing import cast
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import ConnectionFailure

from app.config import get_settings
from app.db.client import lifespan
from app.deps import get_db
from app.main import create_app


@pytest.fixture
def api() -> FastAPI:
    return create_app()


@pytest.fixture
async def client(api: FastAPI) -> AsyncIterator[AsyncClient]:
    async with lifespan(api):
        async with AsyncClient(
            transport=ASGITransport(app=api), base_url="http://test"
        ) as test_client:
            yield test_client


@pytest.mark.parametrize("authorization", [None, "Bearer student", "Bearer admin"])
@pytest.mark.parametrize("path", ["/healthz", "/readyz"])
async def test_public_ops_matrix(
    api: FastAPI, client: AsyncClient, path: str, authorization: str | None
) -> None:
    """PRD §9 availability: both M0 routes explicitly allow anonymous access."""
    database = AsyncMock()
    api.dependency_overrides[get_db] = lambda: database
    headers = {"Authorization": authorization} if authorization else {}
    response = await client.get(path, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "Access-Control-Allow-Origin" not in response.headers
    assert database.command.await_count == (1 if path == "/readyz" else 0)


async def test_liveness_without_database(client: AsyncClient) -> None:
    """PRD §9 availability: no dependency is needed for process liveness."""
    assert (await client.get("/healthz")).status_code == 200


async def test_readiness_unconfigured(client: AsyncClient) -> None:
    response = await client.get("/readyz")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "unavailable"


async def test_ready_database_dependency(api: FastAPI, client: AsyncClient) -> None:
    database = AsyncMock()
    api.state.db = database
    assert (await client.get("/readyz")).status_code == 200
    database.command.assert_awaited_once_with("ping")


async def test_readiness_failure_redacts_database_details(
    api: FastAPI, client: AsyncClient
) -> None:
    database = AsyncMock()
    database.command.side_effect = ConnectionFailure("private connection details")
    api.dependency_overrides[get_db] = lambda: database
    response = await client.get("/readyz")
    assert response.status_code == 503
    assert "private connection details" not in response.text
    assert response.json()["error"]["details"] == {}


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
async def test_production_documentation_disabled(
    monkeypatch: pytest.MonkeyPatch, path: str
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        assert (await client.get(path)).status_code == 404


async def test_development_openapi_exposes_only_current_milestones(
    client: AsyncClient,
) -> None:
    assert set((await client.get("/openapi.json")).json()["paths"]) == {
        "/healthz",
        "/readyz",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/me",
        "/api/v1/subjects",
        "/api/v1/subjects/{slug}",
        "/api/v1/schedule",
        "/api/v1/subjects/{slug}/materials",
        "/api/v1/materials/{id}",
        "/api/v1/materials/{id}/download",
        "/api/v1/materials/{id}/report",
        "/api/v1/announcements",
        "/api/v1/announcements/attachments",
        "/api/v1/announcements/upcoming",
        "/api/v1/announcements/unread-count",
        "/api/v1/announcements/{id}",
        "/api/v1/announcements/{id}/attachments/{file_id}/download",
        "/api/v1/me/devices",
        "/api/v1/me/web-devices",
        "/api/v1/me/web-push-key",
        "/api/v1/me/devices/{token}",
        "/api/v1/me/seen-updates",
        "/api/v1/admin/users",
        "/api/v1/admin/users/{id}",
        "/api/v1/admin/reports",
        "/api/v1/admin/reports/{id}",
    }
    assert (await client.get("/docs")).status_code == 200
    assert (await client.get("/api/v1/subjects")).status_code == 401


async def test_database_lifecycle(monkeypatch: pytest.MonkeyPatch) -> None:
    database = AsyncMock()
    mongo = AsyncMock()
    mongo.__getitem__.return_value = database
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017")
    get_settings.cache_clear()
    monkeypatch.setattr("app.db.client.AsyncMongoClient", lambda *args, **kwargs: mongo)
    app = create_app()
    async with lifespan(app):
        assert app.state.db is database
    mongo.close.assert_awaited_once()


@pytest.mark.skipif(not os.getenv("TEST_MONGODB_URI"), reason="MongoDB 7 runs in CI")
async def test_real_mongo_ping() -> None:
    """PRD §9 availability: readiness also exercises real MongoDB 7 in CI."""
    async with AsyncMongoClient(os.environ["TEST_MONGODB_URI"]) as mongo:
        database = cast(AsyncDatabase[dict[str, object]], mongo["edump_m0_test"])
        from app.services.health_service import check_ready

        await check_ready(database)
