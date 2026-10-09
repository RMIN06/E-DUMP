from pymongo.asynchronous.database import AsyncDatabase


async def ping(database: AsyncDatabase[dict[str, object]]) -> None:
    await database.command("ping")
