import logging
from typing import Protocol

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class PushClient(Protocol):
    async def send(self, messages: list[dict[str, object]]) -> list[str]: ...


class ExpoPushClient:
    async def send(self, messages: list[dict[str, object]]) -> list[str]:
        headers = {"Accept": "application/json"}
        token = get_settings().expo_push_access_token
        if token:
            headers["Authorization"] = f"Bearer {token.get_secret_value()}"
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send", json=messages, headers=headers
            )
            response.raise_for_status()
            data = response.json().get("data")
        if not isinstance(data, list) or len(data) != len(messages):
            raise ValueError("Invalid push response.")
        expired: list[str] = []
        for message, ticket in zip(messages, data, strict=True):
            if isinstance(ticket, dict) and ticket.get("status") == "error":
                details = ticket.get("details", {})
                if (
                    isinstance(details, dict)
                    and details.get("error") == "DeviceNotRegistered"
                ):
                    expired.append(str(message["to"]))
                else:
                    logger.warning(
                        "Expo rejected a notification; Updates remains available."
                    )
        return expired
