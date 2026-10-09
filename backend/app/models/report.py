from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReportReason = Literal[
    "wrong_subject", "inappropriate", "copyright", "duplicate", "other"
]


class ReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: ReportReason
    note: str | None = Field(default=None, max_length=200)


class ReportReceipt(BaseModel):
    id: str
    status: Literal["open"] = "open"
