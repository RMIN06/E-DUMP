"""Create a compressed MongoDB archive in the existing private R2 bucket."""

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.integrations.r2 import R2Storage  # noqa: E402


async def main() -> None:
    settings = get_settings()
    executable = shutil.which("mongodump")
    if not executable or not settings.mongodb_uri:
        raise SystemExit("Install MongoDB Database Tools and configure MONGODB_URI.")
    storage = R2Storage(settings)
    with tempfile.TemporaryDirectory(prefix="edump-backup-") as folder:
        config = Path(folder) / "connection.json"
        config.write_text(json.dumps({"uri": settings.mongodb_uri}), encoding="utf-8")
        os.chmod(config, 0o600)
        archive = Path(folder) / "database.archive.gz"
        result = await asyncio.to_thread(
            subprocess.run,
            [
                executable,
                f"--config={config}",
                f"--db={settings.mongodb_db}",
                f"--archive={archive}",
                "--gzip",
            ],
            capture_output=True,
            timeout=600,
            check=False,
        )
        if result.returncode or not archive.exists() or not archive.stat().st_size:
            raise SystemExit(
                "Database backup failed; no archive published. Check database access."
            )
        stamp = datetime.now(UTC).strftime("%Y/%m/%d/%H%M%S")
        key = f"backups/{stamp}.archive.gz"
        with archive.open("rb") as body:
            await storage.put(key, body, "application/gzip")
    print(f"Private database backup uploaded: {key}")


if __name__ == "__main__":
    asyncio.run(main())
