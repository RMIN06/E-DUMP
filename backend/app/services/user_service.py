from pymongo.asynchronous.database import AsyncDatabase

from app.errors import DomainError
from app.models.user import User, UserRecord
from app.repositories import users


async def update_name(
    database: AsyncDatabase[dict[str, object]], user: UserRecord, name: str
) -> User:
    updated = await users.set_name(database, user.id, name)
    if updated is None:
        raise DomainError("unauthorized", "Sign in to continue.", 401)
    return User.from_record(updated)
