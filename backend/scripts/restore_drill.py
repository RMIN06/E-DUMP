"""Restore a private backup into a fresh local database and compare it to Atlas."""

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
from pymongo import AsyncMongoClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings  # noqa: E402
from app.integrations.r2 import R2Storage  # noqa: E402


async def main(key: str) -> None:
    settings = get_settings()
    local_uri = os.environ.get("TEST_MONGODB_URI", "mongodb://127.0.0.1:27018")
    target = urlsplit(local_uri)
    if target.scheme != "mongodb" or target.hostname not in {"127.0.0.1", "localhost"}:
        raise SystemExit("Restore drills must target a local MongoDB instance.")
    if not key.startswith("backups/") or not key.endswith(".archive.gz"):
        raise SystemExit("Choose a compressed archive under backups/.")
    executable = shutil.which("mongorestore")
    if not executable or not settings.mongodb_uri:
        raise SystemExit("Install Database Tools and configure the source database.")
    name = f"edump_restore_drill_{uuid4().hex}"
    url = await R2Storage(settings).download_url(
        key, "backup.gz", "application/gzip", 600
    )
    with tempfile.TemporaryDirectory(prefix="edump-restore-") as folder:
        archive = Path(folder) / "backup.archive.gz"
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise SystemExit("Private backup download failed.")
            archive.write_bytes(response.content)
        result = await asyncio.to_thread(
            subprocess.run,
            [
                executable,
                f"--uri={local_uri}",
                f"--archive={archive}",
                "--gzip",
                f"--nsInclude={settings.mongodb_db}.*",
                f"--nsFrom={settings.mongodb_db}.*",
                f"--nsTo={name}.*",
                "--stopOnError",
            ],
            capture_output=True,
            timeout=600,
            check=False,
        )
        if result.returncode:
            raise SystemExit("Local restore failed; the source database was untouched.")
    async with (
        AsyncMongoClient(settings.mongodb_uri) as source,
        AsyncMongoClient(local_uri) as local,
    ):
        source_db = source[settings.mongodb_db]
        restored = local[name]
        try:
            names = await source_db.list_collection_names()
            for collection in names:
                assert await source_db[collection].count_documents(
                    {}
                ) == await restored[collection].count_documents({}), (
                    f"Count differs: {collection}"
                )
                original_indexes = await source_db[collection].index_information()
                restored_indexes = await restored[collection].index_information()
                assert original_indexes == restored_indexes, (
                    f"Indexes differ: {collection}"
                )
            print(
                f"Restore drill passed: {len(names)} collection counts "
                "and index definitions match."
            )
        finally:
            await local.drop_database(name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: uv run python scripts/restore_drill.py backups/...archive.gz"
        )
    asyncio.run(main(sys.argv[1]))
