import logging
from datetime import datetime
from typing import cast

from bson import ObjectId

from app.integrations import web_push
from app.integrations.push import PushClient
from app.models.announcement import AnnouncementRecord
from app.models.material import Material
from app.repositories import devices, subjects
from app.repositories.files import Database

logger = logging.getLogger(__name__)


async def send_reminder(
    database: Database,
    client: PushClient,
    announcement: AnnouncementRecord,
    now: datetime,
) -> None:
    if announcement.due_at is None or announcement.due_at <= now:
        return
    try:
        subject = (
            await subjects.by_slug(database, announcement.subject_slug)
            if announcement.subject_slug
            else None
        )
        title = "Deadline reminder · " + announcement.type.capitalize()
        if subject:
            title += f" · {subject.short_name}"
        seconds = int((announcement.due_at - now).total_seconds())
        remaining = "1 day left" if seconds >= 86_340 else "Less than 1 day left"
        await _deliver(
            database,
            client,
            announcement.author_id,
            title,
            f"{remaining}: {announcement.title}",
            {"announcement_id": str(announcement.id)},
            ttl=max(1, seconds),
        )
    except Exception:
        logger.warning(
            "Deadline reminder delivery failed; the update remains available."
        )


async def send(
    database: Database, client: PushClient, announcement: AnnouncementRecord
) -> None:
    try:
        subject = (
            await subjects.by_slug(database, announcement.subject_slug)
            if announcement.subject_slug
            else None
        )
        title = announcement.type.capitalize()
        if subject:
            title += f" · {subject.short_name}"
        await _deliver(
            database,
            client,
            announcement.author_id,
            title,
            announcement.title,
            {"announcement_id": str(announcement.id)},
        )
    except Exception:
        logger.warning(
            "Push delivery failed; the announcement remains available in Updates."
        )


async def send_material(
    database: Database, client: PushClient, material: Material
) -> None:
    try:
        subject = await subjects.by_slug(database, material.subject_slug)
        title = f"Material · {subject.short_name}" if subject else "New material"
        await _deliver(
            database,
            client,
            ObjectId(material.uploader_id),
            title,
            material.title,
            {"material_id": material.id},
        )
    except Exception:
        logger.warning("Push delivery failed; the uploaded material remains available.")


async def _deliver(
    database: Database,
    client: PushClient,
    author_id: ObjectId,
    title: str,
    body: str,
    data: dict[str, str],
    ttl: int | None = None,
) -> None:
    tokens = await devices.recipients(database, author_id)
    for start in range(0, len(tokens), 100):
        try:
            expired = await client.send(
                [
                    {
                        "to": token,
                        "title": title,
                        "body": body,
                        "sound": "default",
                        "priority": "high",
                        "channelId": "default",
                        "data": data,
                        **({"ttl": ttl} if ttl is not None else {}),
                    }
                    for token in tokens[start : start + 100]
                ]
            )
            if expired:
                await devices.delete_tokens(database, expired)
        except Exception:
            logger.warning("Push batch failed; class content remains available.")
    for device in await devices.web_recipients(database, author_id):
        try:
            subscription = cast(dict[str, object], device["subscription"])
            message: dict[str, object] = {"title": title, "body": body, **data}
            expired_web = (
                await web_push.send(subscription, message, ttl=ttl)
                if ttl is not None
                else await web_push.send(subscription, message)
            )
            if expired_web:
                await devices.delete_tokens(database, [str(device["expo_push_token"])])
        except Exception:
            logger.warning("Browser push failed; class content remains available.")
