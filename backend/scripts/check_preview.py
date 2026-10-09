"""Read-only checks against the deployed production API; no test accounts created."""

import asyncio
import sys

import httpx


async def check(base: str) -> None:
    if not base.startswith("https://"):
        raise SystemExit("Preview API must use HTTPS.")
    async with httpx.AsyncClient(base_url=base.rstrip("/"), timeout=90) as client:
        for path in ("/healthz", "/readyz"):
            response = await client.get(path)
            assert response.status_code == 200, f"{path} is unavailable"
            assert response.headers.get("x-content-type-options") == "nosniff"
        for path in ("/docs", "/redoc", "/openapi.json"):
            assert (await client.get(path)).status_code == 404, "Production docs exposed"
        for path in ("/me", "/subjects", "/announcements", "/admin/users"):
            response = await client.get(f"/api/v1{path}")
            assert response.status_code == 401, f"Anonymous access allowed: {path}"
            assert "Traceback" not in response.text
        response = await client.post("/api/v1/auth/login", json={"email": "someone@gmail.com"})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_email"
    print("HTTPS, health, readiness, production docs and anonymous access checks passed.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: uv run python scripts/check_preview.py https://API_HOST")
    asyncio.run(check(sys.argv[1]))
