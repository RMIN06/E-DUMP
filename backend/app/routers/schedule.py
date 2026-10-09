from fastapi import APIRouter, Request

from app.deps import CurrentUser, Database, limiter, user_rate_key
from app.models.schedule import ScheduleSlot
from app.services import schedule_service

router = APIRouter(prefix="/api/v1/schedule", tags=["schedule"])


@router.get("", response_model=list[ScheduleSlot])
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def get_schedule(
    request: Request, user: CurrentUser, database: Database
) -> list[ScheduleSlot]:
    return await schedule_service.list_schedule(database)
