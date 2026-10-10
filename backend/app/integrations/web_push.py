import asyncio
import json
import logging
from typing import Any, cast

from pywebpush import WebPushException, webpush

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send(subscription: dict[str, object], message: dict[str, object]) -> bool:
    settings = get_settings()
    if not settings.web_push_private_key:
        return False
    try:
        await asyncio.to_thread(
            webpush,
            subscription_info=cast(Any, subscription),
            data=json.dumps(message),
            vapid_private_key=settings.web_push_private_key.get_secret_value(),
            vapid_claims={"sub": "mailto:l250716@lhr.nu.edu.pk"},
            ttl=3600,
            timeout=15,
        )
    except WebPushException as error:
        if error.response is not None and error.response.status_code in (404, 410):
            return True
        logger.warning("Browser push failed; Updates remains available.")
    return False
