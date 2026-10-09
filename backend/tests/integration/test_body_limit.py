from collections.abc import AsyncIterator

from httpx import ASGITransport, AsyncClient

from app.main import create_app


async def test_auth_1_json_body_limit_with_length() -> None:
    """AUTH-1: reject oversized JSON before parsing or hitting the database."""
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            content=b"x" * 65537,
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "validation_error"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "no-store"


async def test_auth_1_streamed_json_body_limit() -> None:
    """AUTH-1: a missing Content-Length does not bypass the JSON body cap."""

    async def body() -> AsyncIterator[bytes]:
        for _ in range(17):
            yield b"x" * 4096

    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/auth/login",
            content=body(),
            headers={"Content-Type": "application/json"},
        )
    assert response.status_code == 413
