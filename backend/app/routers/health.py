from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.asynchronous.database import AsyncDatabase

from app.deps import get_db
from app.models.common import ErrorResponse, Health
from app.services.health_service import check_ready

router = APIRouter(tags=["ops"])


@router.get("/healthz", response_model=Health)
async def healthz() -> Health:
    """Public liveness, explicitly exempt from authentication in Architecture §4."""
    return Health()


@router.get("/readyz", response_model=Health, responses={503: {"model": ErrorResponse}})
async def readyz(
    database: Annotated[AsyncDatabase[dict[str, object]], Depends(get_db)],
) -> Health:
    """Public readiness, explicitly exempt from authentication in Testing §B2."""
    await check_ready(database)
    return Health()
