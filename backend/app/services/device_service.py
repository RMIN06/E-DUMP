from datetime import UTC, datetime

from app.models.device import DeviceWrite
from app.models.user import UserRecord
from app.repositories import announcements, devices, users
from app.repositories.files import Database


async def register(database: Database, user: UserRecord, data: DeviceWrite) -> None:
    await devices.register(database, user.id, data)


async def unregister(database: Database, user: UserRecord, token: str) -> None:
    await devices.unregister(database, user.id, token)


async def seen(database: Database, user: UserRecord) -> None:
    await users.seen_updates(database, user.id, datetime.now(UTC))


async def unread(database: Database, user: UserRecord) -> int:
    return await announcements.unread(database, user.last_seen_updates_at)
