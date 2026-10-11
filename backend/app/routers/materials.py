from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query, Request
from pydantic import ValidationError
from starlette.datastructures import UploadFile

from app.deps import (
    CurrentUser,
    Database,
    MaterialLock,
    ObjectStorage,
    Push,
    limiter,
    user_rate_key,
)
from app.errors import DomainError
from app.models.material import (
    Download,
    Material,
    MaterialCreate,
    MaterialKind,
    MaterialPage,
    Removed,
)
from app.models.report import ReportCreate, ReportReceipt
from app.services import material_service, push_service

router = APIRouter(prefix="/api/v1", tags=["materials"])


@router.get("/subjects/{slug}/materials", response_model=MaterialPage)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def list_materials(
    request: Request,
    user: CurrentUser,
    database: Database,
    slug: str,
    kind: MaterialKind | None = None,
    chapter: Annotated[int | None, Query(ge=0, le=99)] = None,
    q: Annotated[str, Query(max_length=100)] = "",
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 20,
) -> MaterialPage:
    return await material_service.list_materials(
        database, slug, kind, chapter, q, cursor, limit
    )


@router.post("/subjects/{slug}/materials", response_model=Material, status_code=201)
@limiter.shared_limit("20/hour", scope="uploads", key_func=user_rate_key)
async def upload_material(
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser,
    database: Database,
    storage: ObjectStorage,
    lock: MaterialLock,
    push: Push,
    slug: str,
) -> Material:
    async with request.form(max_files=1, max_fields=5, max_part_size=1024) as form:
        upload = form.get("file")
        fields: dict[str, object] = {}
        for name, value in form.multi_items():
            if name != "file":
                if name in fields or isinstance(value, UploadFile):
                    raise DomainError(
                        "validation_error",
                        "Submit one file and one value per field.",
                        422,
                    )
                fields[name] = (
                    None
                    if name in ("chapter", "description") and value == ""
                    else value
                )
        if not isinstance(upload, UploadFile):
            raise DomainError("validation_error", "Choose one file to upload.", 422)
        try:
            data = MaterialCreate.model_validate(fields)
        except ValidationError as exc:
            raise DomainError(
                "validation_error", "Check the submitted fields.", 422
            ) from exc
        item = await material_service.upload_material(
            database, storage, lock, user, slug, upload, data
        )
        background.add_task(push_service.send_material, database, push, item)
        return item


@router.get("/materials/{id}", response_model=Material)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def material_detail(
    request: Request, user: CurrentUser, database: Database, id: str
) -> Material:
    return await material_service.detail(database, id)


@router.get("/materials/{id}/download", response_model=Download)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def download_material(
    request: Request,
    user: CurrentUser,
    database: Database,
    storage: ObjectStorage,
    id: str,
) -> Download:
    return await material_service.download(database, storage, id)


@router.delete("/materials/{id}", response_model=Removed)
async def remove_material(
    request: Request,
    user: CurrentUser,
    database: Database,
    storage: ObjectStorage,
    lock: MaterialLock,
    id: str,
) -> Removed:
    await material_service.remove_material(database, storage, lock, user, id)
    return Removed()


@router.post("/materials/{id}/report", response_model=ReportReceipt, status_code=201)
@limiter.shared_limit("5/hour", scope="reports", key_func=user_rate_key)
async def report_material(
    request: Request, user: CurrentUser, database: Database, id: str, data: ReportCreate
) -> ReportReceipt:
    return await material_service.report_material(database, user, id, data)
