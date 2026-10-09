import logging

from app.integrations.push import PushClient
from app.models.announcement import AnnouncementRecord
from app.repositories import devices, subjects
from app.repositories.files import Database

logger = logging.getLogger(__name__)


async def send(
    database: Database, client: PushClient, announcement: AnnouncementRecord
) -> None:
    try:
        tokens = await devices.recipients(database, announcement.author_id)
        subject = (
            await subjects.by_slug(database, announcement.subject_slug)
            if announcement.subject_slug
            else None
        )
        title = announcement.type.capitalize()
        if subject:
            title += f" · {subject.short_name}"
        for start in range(0, len(tokens), 100):
            try:
                expired = await client.send(
                    [
                        {
                            "to": token,
                            "title": title,
                            "body": announcement.title,
                            "sound": "default",
                            "data": {"announcement_id": str(announcement.id)},
                        }
                        for token in tokens[start : start + 100]
                    ]
                )
                if expired:
                    await devices.delete_tokens(database, expired)
            except Exception:
                logger.warning(
                    "Push batch failed; the announcement remains available in Updates."
                )
    except Exception:
        logger.warning(
            "Push delivery failed; the announcement remains available in Updates."
        )
