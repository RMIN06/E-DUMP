import asyncio
import logging
from datetime import UTC, datetime, timedelta

from app.integrations.r2 import Storage
from app.repositories import files, materials
from app.repositories.materials import Database

logger = logging.getLogger(__name__)


async def sweep(database: Database, storage: Storage, lock: asyncio.Lock) -> None:
    async with lock:
        for file in await files.stale_pending(
            database, datetime.now(UTC) - timedelta(hours=24)
        ):
            if await materials.referenced(database, file.id):
                await files.set_status(database, file.id, "ready")
            else:
                await storage.delete(file.key)
                await files.remove(database, file.id)


async def run(database: Database, storage: Storage, lock: asyncio.Lock) -> None:
    while True:
        await asyncio.sleep(3600)
        try:
            await sweep(database, storage, lock)
        except Exception:
            logger.warning("File cleanup failed; retrying on the next hourly run.")
