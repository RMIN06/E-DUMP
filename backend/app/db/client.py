import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from pymongo import AsyncMongoClient

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.integrations.r2 import R2Storage
from app.tasks.housekeeping import run


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    client: AsyncMongoClient[dict[str, object]] | None = None
    app.state.db = None
    task: asyncio.Task[None] | None = None
    if settings.mongodb_uri:
        client = AsyncMongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            timeoutMS=2500,
            tz_aware=True,
        )
        app.state.db = client[settings.mongodb_db]
    try:
        if app.state.db is not None:
            await ensure_indexes(app.state.db)
            if (
                settings.r2_account_id
                and settings.r2_access_key_id
                and settings.r2_secret_access_key
            ):
                task = asyncio.create_task(
                    run(app.state.db, R2Storage(settings), app.state.material_lock)
                )
        yield
    finally:
        if task is not None:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        if client is not None:
            await client.close()
