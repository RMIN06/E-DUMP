import base64
import secrets
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from bson import ObjectId

from app.config import get_settings
from app.errors import DomainError, Unavailable
from app.services.auth_service import (
    access_token,
    allowed_email,
    decode_access,
    token_secret,
)


@pytest.mark.parametrize("email", ["l251234@lhr.nu.edu.pk", " L251234@LHR.NU.EDU.PK "])
def test_auth_1_normalization(email: str) -> None:
    """AUTH-1: accept only a complete ASCII student address, normalizing case/spaces."""
    assert allowed_email(email) == "l251234@lhr.nu.edu.pk"


@pytest.mark.parametrize(
    "email",
    [
        "l25123@lhr.nu.edu.pk",
        "l261234@lhr.nu.edu.pk",
        "l251234@gmail.com",
        "l251234@lhr.nu.edu.pk.evil.com",
        "x@l251234@lhr.nu.edu.pk",
        "l251234@lhr.nu.edu.pk\n",
        "\tl251234@lhr.nu.edu.pk",
        "l25１234@lhr.nu.edu.pk",
        "l25 1234@lhr.nu.edu.pk",
        "x" * 65,
        "",
    ],
)
def test_auth_1_rejects_invalid_email(email: str) -> None:
    """AUTH-1: suffixes, control characters, look-alikes and whitespace are rejected."""
    with pytest.raises(DomainError, match="Use your student email"):
        allowed_email(email)


def test_auth_2_access_roundtrip() -> None:
    """AUTH-2: access tokens require the expected algorithm and complete claims."""
    user_id = ObjectId()
    assert decode_access(access_token(user_id)) == user_id


@pytest.mark.parametrize(
    "change",
    [
        "expired",
        "future",
        "wrong_secret",
        "none",
        "wrong_algorithm",
        "sub",
        "iat",
        "exp",
        "typ",
        "wrong_type",
        "bad_id",
        "string_iat",
        "string_exp",
        "backwards",
    ],
)
def test_auth_2_invalid_access_claims(change: str) -> None:
    now = datetime.now(UTC)
    claims: dict[str, object] = {
        "sub": str(ObjectId()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
        "typ": "access",
    }
    secret = token_secret()
    algorithm = "HS256"
    if change in {"sub", "iat", "exp", "typ"}:
        claims.pop(change)
    elif change == "expired":
        claims["iat"] = int((now - timedelta(hours=1)).timestamp())
        claims["exp"] = int((now - timedelta(minutes=1)).timestamp())
    elif change == "future":
        claims["iat"] = int((now + timedelta(hours=1)).timestamp())
    elif change == "wrong_secret":
        secret = secrets.token_bytes(32)
    elif change == "none":
        algorithm, secret = "none", b""
    elif change == "wrong_algorithm":
        algorithm = "HS384"
    elif change == "wrong_type":
        claims["typ"] = "refresh"
    elif change == "bad_id":
        claims["sub"] = "not-an-object-id"
    elif change == "string_iat":
        claims["iat"] = str(claims["iat"])
    elif change == "string_exp":
        claims["exp"] = str(claims["exp"])
    elif change == "backwards":
        claims["exp"] = claims["iat"]
    with pytest.raises(DomainError):
        decode_access(
            jwt.encode(
                claims, secret if algorithm != "none" else None, algorithm=algorithm
            )
        )


@pytest.mark.parametrize(
    "secret", ["", "invalid-base64", base64.b64encode(b"short").decode()]
)
def test_auth_2_missing_secret_fails_closed(
    monkeypatch: pytest.MonkeyPatch, secret: str
) -> None:
    monkeypatch.setenv("JWT_SECRET", secret)
    get_settings.cache_clear()
    with pytest.raises(Unavailable):
        token_secret()
