import base64
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator


class WebKeys(BaseModel):
    model_config = ConfigDict(extra="forbid")
    p256dh: str = Field(max_length=100)
    auth: str = Field(max_length=30)

    @field_validator("p256dh", "auth")
    @classmethod
    def validate_key(cls, value: str, info: ValidationInfo) -> str:
        try:
            raw = base64.b64decode(
                value + "=" * (-len(value) % 4), altchars=b"-_", validate=True
            )
        except ValueError as error:
            raise ValueError("Invalid subscription key.") from error
        if len(raw) != (65 if info.field_name == "p256dh" else 16) or (
            len(raw) == 65 and raw[0] != 4
        ):
            raise ValueError("Invalid subscription key.")
        return value


class WebSubscription(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str = Field(max_length=2048)
    keys: WebKeys

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, value: str) -> str:
        url = urlsplit(value)
        host = url.hostname or ""
        allowed = (
            host == "fcm.googleapis.com"
            or host == "updates.push.services.mozilla.com"
            or host.endswith(".push.apple.com")
            or host.endswith(".notify.windows.com")
        )
        if (
            url.scheme != "https"
            or url.port not in (None, 443)
            or url.username
            or url.password
            or url.fragment
            or not allowed
        ):
            raise ValueError("Unsupported push service.")
        return value


class WebDeviceWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    platform: Literal["web"] = "web"
    subscription: WebSubscription
    notifications_enabled: bool
