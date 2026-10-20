from typing import Protocol

import httpx

from app.config import get_settings
from app.errors import Unavailable


class EmailSender(Protocol):
    async def send_code(self, email: str, code: str) -> None: ...


class MailjetEmailSender:
    async def send_code(self, email: str, code: str) -> None:
        settings = get_settings()
        if (
            not settings.mailjet_api_key
            or not settings.mailjet_secret_key
            or not settings.email_sender
        ):
            raise Unavailable()
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.post(
                    "https://api.mailjet.com/v3.1/send",
                    auth=httpx.BasicAuth(
                        settings.mailjet_api_key.get_secret_value(),
                        settings.mailjet_secret_key.get_secret_value(),
                    ),
                    json={
                        "Messages": [
                            {
                                "From": {
                                    "Name": "E-DUMP",
                                    "Email": settings.email_sender,
                                },
                                "To": [{"Email": email}],
                                "Subject": "Your E-DUMP sign-in code",
                                "TextPart": (
                                    f"Your E-DUMP verification code is {code}.\n\n"
                                    "It expires in 10 minutes and works once. "
                                    "Do not share this code.\n\n"
                                    "If you did not request it, ignore this email."
                                ),
                                "TrackOpens": "disabled",
                                "TrackClicks": "disabled",
                            }
                        ],
                    },
                )
                response.raise_for_status()
                payload = response.json()
                messages = (
                    payload.get("Messages") if isinstance(payload, dict) else None
                )
                if (
                    not isinstance(messages, list)
                    or len(messages) != 1
                    or messages[0].get("Status") != "success"
                ):
                    raise Unavailable()
        except (httpx.HTTPError, ValueError, AttributeError):
            # Provider responses can contain recipient details. Never expose them.
            raise Unavailable() from None
