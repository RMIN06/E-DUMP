from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DeviceWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expo_push_token: str = Field(pattern=r"^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{1,200}\]$")
    platform: Literal["android", "ios"]
    notifications_enabled: bool
