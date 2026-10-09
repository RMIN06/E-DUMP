"""Check the configured private bucket using one disposable synthetic object."""

import asyncio
import io
import sys
from pathlib import Path
from uuid import uuid4

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.integrations.r2 import R2Storage  # noqa: E402


async def main() -> None:
    storage = R2Storage(get_settings())
    key = "files/live-check/" + uuid4().hex + ".pdf"
    body = b"%PDF-1.7\nDisposable E-DUMP storage verification\n%%EOF"
    try:
        await storage.put(key, io.BytesIO(body), "application/pdf")
        signed = await storage.download_url(
            key, "E-DUMP check.pdf", "application/pdf", 600
        )
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(signed)
            assert response.status_code == 200 and response.content == body
            assert response.headers["content-type"].startswith("application/pdf")
            assert "attachment" in response.headers["content-disposition"]
            assert "X-Amz-Expires=600" in signed
            unsigned = str(httpx.URL(signed).copy_with(query=None))
            denied = await client.get(unsigned)
            print(f"Unsigned S3 request status: {denied.status_code}")
            assert denied.status_code in (400, 403) and denied.content != body
            short = await storage.download_url(key, "check.pdf", "application/pdf", 1)
            await asyncio.sleep(3)
            assert (await client.get(short)).status_code == 403
        print(
            "R2 live check passed: private access, signed download, "
            "MIME, disposition and expiry."
        )
    finally:
        await storage.delete(key)
        print("Disposable verification object removed.")


if __name__ == "__main__":
    asyncio.run(main())
