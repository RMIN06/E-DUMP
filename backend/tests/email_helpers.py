from datetime import UTC, datetime, timedelta

from httpx import AsyncClient, Response

from app.deps import get_db


class FakeEmailSender:
    messages: dict[str, str] = {}

    async def send_code(self, email: str, code: str) -> None:
        self.messages[email] = code


async def verified_login(client: AsyncClient, email: str) -> Response:
    # Other feature tests need sessions without waiting a real minute per login.
    # OTP security tests call the real routes directly without this clock setup.
    database = client._transport.app.dependency_overrides[get_db]()
    normalized = email.strip().lower()
    await database.email_codes.update_one(
        {"_id": normalized},
        {"$set": {"requested_at": datetime.now(UTC) - timedelta(seconds=61)}},
    )
    requested = await client.post("/api/v1/auth/login", json={"email": email})
    if requested.status_code != 200:
        return requested
    return await client.post(
        "/api/v1/auth/verify",
        json={
            "email": email,
            "challenge_id": requested.json()["challenge_id"],
            "code": FakeEmailSender.messages[normalized],
        },
    )
