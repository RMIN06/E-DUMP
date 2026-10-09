from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.errors import Unavailable
from app.repositories.health import ping


async def check_ready(database: AsyncDatabase[dict[str, object]]) -> None:
    try:
        await ping(database)
    except PyMongoError as exc:
        raise Unavailable() from exc
