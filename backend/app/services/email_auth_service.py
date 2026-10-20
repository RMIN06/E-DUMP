import asyncio
import hashlib
import hmac
import secrets
from datetime import UTC, datetime

from app.errors import DomainError
from app.integrations.email import EmailSender
from app.models.auth import CodeChallenge, LoginResponse
from app.repositories import email_codes
from app.repositories.refresh_tokens import Database
from app.services import auth_service


def code_digest(email: str, challenge: str, code: str) -> str:
    return hmac.new(
        auth_service.token_secret(),
        f"email-code\0{email}\0{challenge}\0{code}".encode(),
        hashlib.sha256,
    ).hexdigest()


async def request_code(
    database: Database, value: str, lock: asyncio.Lock, sender: EmailSender
) -> CodeChallenge:
    email = auth_service.allowed_email(value)
    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = secrets.token_urlsafe(32)
    digest = code_digest(email, challenge, code)
    now = datetime.now(UTC)
    async with lock:
        if not await email_codes.reserve(database, email, challenge, digest, now):
            raise DomainError(
                "rate_limited", "Wait before requesting another code.", 429
            )
        if not await email_codes.reserve_daily(database, now):
            raise DomainError(
                "rate_limited", "Email limit reached. Try again tomorrow.", 429
            )
    try:
        await sender.send_code(email, code)
    except Exception:
        await email_codes.delivery(database, email, challenge, False)
        raise
    await email_codes.delivery(database, email, challenge, True)
    return CodeChallenge(challenge_id=challenge)


async def verify_code(
    database: Database,
    value: str,
    challenge: str,
    code: str,
    lock: asyncio.Lock,
    user_agent: str,
) -> LoginResponse:
    email = auth_service.allowed_email(value)
    async with lock:
        record = await email_codes.attempt(
            database, email, challenge, datetime.now(UTC)
        )
        if (
            record is None
            or not hmac.compare_digest(
                str(record["digest"]), code_digest(email, challenge, code)
            )
            or not await email_codes.consume(database, email, challenge)
        ):
            raise DomainError(
                "invalid_code",
                "Code is incorrect or expired. Request a new code if needed.",
                400,
            )
    return await auth_service.login_with_email(database, email, lock, user_agent)
