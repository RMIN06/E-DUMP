from fastapi import APIRouter

from app.deps import CurrentUser, Database
from app.models.user import NameRequest, User
from app.services import user_service

router = APIRouter(prefix="/api/v1/me", tags=["me"])


@router.get("", response_model=User)
async def me(user: CurrentUser) -> User:
    return User.from_record(user)


@router.patch("", response_model=User)
async def update_me(body: NameRequest, user: CurrentUser, database: Database) -> User:
    return await user_service.update_name(database, user, body.name)
