from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query, Request, Response
from starlette.datastructures import UploadFile

from app.deps import (
    AdminUser,
    CurrentUser,
    Database,
    MaterialLock,
    ObjectStorage,
    Push,
    limiter,
    user_rate_key,
)
from app.errors import DomainError
from app.models.announcement import (
    Announcement,
    AnnouncementPage,
    AnnouncementPatch,
    AnnouncementType,
    AnnouncementWrite,
    Attachment,
    UnreadCount,
)
from app.models.material import Download
from app.services import announcement_service, device_service, push_service

router = APIRouter(prefix="/api/v1/announcements", tags=["announcements"])


@router.get("", response_model=AnnouncementPage)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def list_updates(
    request: Request,
    user: CurrentUser,
    database: Database,
    type: AnnouncementType | None = None,
    subject: Annotated[str | None, Query(max_length=80)] = None,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 20,
) -> AnnouncementPage:
    return await announcement_service.list_updates(
        database, type, subject, cursor, limit
    )


@router.get("/upcoming", response_model=list[Announcement])
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def upcoming(
    request: Request,
    user: CurrentUser,
    database: Database,
    limit: Annotated[int, Query(ge=1, le=3)] = 3,
) -> list[Announcement]:
    return await announcement_service.upcoming(database, limit)


@router.get("/unread-count", response_model=UnreadCount)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def unread(
    request: Request, user: CurrentUser, database: Database
) -> UnreadCount:
    return UnreadCount(count=await device_service.unread(database, user))


@router.post("/attachments", response_model=Attachment, status_code=201)
@limiter.shared_limit("20/hour", scope="uploads", key_func=user_rate_key)
async def upload(
    request: Request,
    user: AdminUser,
    database: Database,
    storage: ObjectStorage,
    lock: MaterialLock,
) -> Attachment:
    async with request.form(max_files=1, max_fields=0) as form:
        upload = form.get("file")
        if len(form.multi_items()) != 1 or not isinstance(upload, UploadFile):
            raise DomainError("validation_error", "Choose one file to upload.", 422)
        return await announcement_service.upload(database, storage, lock, user, upload)


@router.post("", response_model=Announcement, status_code=201)
async def create(
    body: AnnouncementWrite,
    user: AdminUser,
    database: Database,
    lock: MaterialLock,
    push: Push,
    background: BackgroundTasks,
) -> Announcement:
    item = await announcement_service.create(database, lock, user, body)
    background.add_task(push_service.send, database, push, item)
    return await announcement_service.present(database, item)


@router.get("/{id}", response_model=Announcement)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def detail(
    request: Request, user: CurrentUser, database: Database, id: str
) -> Announcement:
    return await announcement_service.detail(database, id)


@router.patch("/{id}", response_model=Announcement)
async def edit(
    body: AnnouncementPatch,
    user: AdminUser,
    database: Database,
    storage: ObjectStorage,
    lock: MaterialLock,
    push: Push,
    background: BackgroundTasks,
    id: str,
    notify: bool = False,
) -> Announcement:
    item = await announcement_service.edit(database, storage, lock, user, id, body)
    if notify:
        background.add_task(push_service.send, database, push, item)
    return await announcement_service.present(database, item)


@router.delete("/{id}", status_code=204)
async def remove(
    user: AdminUser,
    database: Database,
    storage: ObjectStorage,
    lock: MaterialLock,
    id: str,
) -> Response:
    await announcement_service.remove(database, storage, lock, id)
    return Response(status_code=204)


@router.get("/{id}/attachments/{file_id}/download", response_model=Download)
@limiter.shared_limit("60/minute", scope="reads", key_func=user_rate_key)
async def download(
    request: Request,
    user: CurrentUser,
    database: Database,
    storage: ObjectStorage,
    id: str,
    file_id: str,
) -> Download:
    return await announcement_service.download(database, storage, id, file_id)
