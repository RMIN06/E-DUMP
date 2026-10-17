import asyncio
import logging
from datetime import UTC, datetime

from app.integrations.push import PushClient
from app.repositories import announcements
from app.repositories.files import Database
from app.services import push_service

logger = logging.getLogger(__name__)


async def sweep(
    database: Database, client: PushClient, now: datetime | None = None
) -> None:
    for item in await announcements.reminder_candidates(
        database, now or datetime.now(UTC)
    ):
        send_at = now or datetime.now(UTC)
        if item.due_at is None or item.due_at <= send_at:
            continue
        if await announcements.claim_reminder(database, item):
            # Claim first: an ambiguous provider failure must not broadcast twice.
            await push_service.send_reminder(database, client, item, send_at)


async def run(database: Database, client: PushClient) -> None:
    while True:
        try:
            await sweep(database, client)
        except Exception:
            logger.warning("Deadline check failed; retrying on the next minute.")
        await asyncio.sleep(60)
