import asyncio
import base64
import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import cast

import jwt
from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.config import get_settings
from app.errors import DomainError, Unavailable
from app.models.auth import LoginResponse, RefreshRecord, Tokens
from app.models.user import User, UserRecord
from app.repositories import refresh_tokens, users

type Database = AsyncDatabase[dict[str, object]]
EMAIL_MESSAGE = "Use your student email, like l25xxxx@lhr.nu.edu.pk"


def normalize_email(value: str) -> str:
    if not value.isascii() or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise DomainError("invalid_email", EMAIL_MESSAGE, 422)
    email = value.strip(" ").lower()
    if len(email) > 64 or any(c.isspace() for c in email):
        raise DomainError("invalid_email", EMAIL_MESSAGE, 422)
    return email


def is_allowed_email(email: str) -> bool:
    return re.fullmatch(get_settings().allowed_email_regex, email, re.ASCII) is not None


def allowed_email(value: str) -> str:
    email = normalize_email(value)
    if not is_allowed_email(email):
        raise DomainError("invalid_email", EMAIL_MESSAGE, 422)
    return email


def token_secret() -> bytes:
    setting = get_settings().jwt_secret
    try:
        secret = (
            base64.b64decode(setting.get_secret_value(), validate=True)
            if setting
            else b""
        )
    except ValueError:
        raise Unavailable() from None
    if len(secret) < 32:
        raise Unavailable()
    return secret


def access_token(user_id: ObjectId) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": now,
            "exp": now + timedelta(minutes=get_settings().access_token_ttl_min),
            "typ": "access",
        },
        token_secret(),
        algorithm="HS256",
    )


def decode_access(token: str) -> ObjectId:
    try:
        claims = cast(
            dict[str, object],
            jwt.decode(
                token,
                token_secret(),
                algorithms=["HS256"],
                options={"require": ["sub", "iat", "exp", "typ"]},
            ),
        )
        subject = claims["sub"]
        if (
            claims["typ"] != "access"
            or not isinstance(subject, str)
            or not ObjectId.is_valid(subject)
        ):
            raise ValueError()
        if type(claims["iat"]) is not int or type(claims["exp"]) is not int:
            raise ValueError()
        if claims["exp"] <= claims["iat"]:
            raise ValueError()
        return ObjectId(subject)
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise DomainError("unauthorized", "Sign in to continue.", 401) from None


def hash_refresh(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def issue_tokens(
    database: Database,
    user: UserRecord,
    family_id: str | None = None,
    user_agent: str = "",
    token_id: ObjectId | None = None,
) -> Tokens:
    access = access_token(user.id)
    raw = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    record = RefreshRecord(
        _id=token_id or ObjectId(),
        user_id=user.id,
        token_hash=hash_refresh(raw),
        family_id=family_id or secrets.token_urlsafe(32),
        expires_at=now + timedelta(days=get_settings().refresh_token_ttl_days),
        created_at=now,
        user_agent=user_agent[:256],
    )
    await refresh_tokens.insert(database, record)
    return Tokens(access_token=access, refresh_token=raw)


async def is_new_email(database: Database, value: str) -> bool:
    return await users.by_email(database, allowed_email(value)) is None


async def login_with_email(
    database: Database, value: str, lock: asyncio.Lock, user_agent: str = ""
) -> LoginResponse:
    email = allowed_email(value)
    token_secret()
    async with lock:
        existing = await users.by_email(database, email)
        if existing and not existing.is_active:
            await refresh_tokens.revoke_user(database, existing.id, datetime.now(UTC))
            raise DomainError("account_disabled", "Contact a class admin.", 403)
        admins = {
            item.strip().lower()
            for item in get_settings().admin_emails.split(",")
            if item.strip()
        }
        user = await users.login(database, email, email in admins, datetime.now(UTC))
        tokens = await issue_tokens(database, user, user_agent=user_agent)
        return LoginResponse(
            **tokens.model_dump(),
            user=User.from_record(user),
            needs_name=user.name is None,
        )


async def revoke_family(database: Database, family_id: str) -> None:
    await refresh_tokens.revoke_family(database, family_id, datetime.now(UTC))


async def rotate_refresh(
    database: Database, raw: str, lock: asyncio.Lock, user_agent: str = ""
) -> Tokens:
    # One API worker: serialize rotation and reuse revocation across Mongo awaits.
    # CAS alone can allow a successor insert after another request revokes a family.
    async with lock:
        record = await refresh_tokens.by_hash(database, hash_refresh(raw))
        if record is None:
            raise DomainError("invalid_token", "Sign in again.", 401)
        if (
            record.revoked_at
            or record.replaced_by
            or record.expires_at <= datetime.now(UTC)
        ):
            await revoke_family(database, record.family_id)
            raise DomainError("invalid_token", "Sign in again.", 401)
        user = await users.by_id(database, record.user_id)
        if user is None:
            await revoke_family(database, record.family_id)
            raise DomainError("invalid_token", "Sign in again.", 401)
        if not user.is_active:
            await refresh_tokens.revoke_user(database, user.id, datetime.now(UTC))
            raise DomainError("account_disabled", "Contact a class admin.", 403)
        replacement = ObjectId()
        if not await refresh_tokens.replace(
            database, record.id, replacement, datetime.now(UTC)
        ):
            await revoke_family(database, record.family_id)
            raise DomainError("invalid_token", "Sign in again.", 401)
        return await issue_tokens(
            database, user, record.family_id, user_agent, replacement
        )


async def logout(
    database: Database, user: UserRecord, raw: str, lock: asyncio.Lock
) -> None:
    async with lock:
        record = await refresh_tokens.by_hash(database, hash_refresh(raw))
        if record and record.user_id != user.id:
            raise DomainError(
                "forbidden", "This session belongs to another account.", 403
            )
        if record:
            await revoke_family(database, record.family_id)


async def current_user(
    database: Database, token: str, lock: asyncio.Lock
) -> UserRecord:
    user = await users.by_id(database, decode_access(token))
    if user is None:
        raise DomainError("unauthorized", "Sign in to continue.", 401)
    if not user.is_active:
        async with lock:
            await refresh_tokens.revoke_user(database, user.id, datetime.now(UTC))
        raise DomainError("account_disabled", "Contact a class admin.", 403)
    return user
