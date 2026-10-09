from fastapi import APIRouter, Request

from app.deps import CurrentUser, Database, limiter, user_rate_key
from app.models.subject import Subject
from app.services import subject_service

router = APIRouter(prefix="/api/v1/subjects", tags=["subjects"])


@router.get("", response_model=list[Subject])
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def list_subjects(
    request: Request, user: CurrentUser, database: Database
) -> list[Subject]:
    return await subject_service.list_subjects(database)


@router.get("/{slug}", response_model=Subject)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def get_subject(
    slug: str, request: Request, user: CurrentUser, database: Database
) -> Subject:
    return await subject_service.get_subject(database, slug)
