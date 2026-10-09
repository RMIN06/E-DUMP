from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.report import ReportReason


class UserPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["student", "admin"] | None = None
    is_active: bool | None = Field(default=None, strict=True)

    @model_validator(mode="after")
    def changes(self) -> "UserPatch":
        if not self.model_fields_set or any(
            getattr(self, field) is None for field in self.model_fields_set
        ):
            raise ValueError("Submit a role or account status.")
        return self


class ReportAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["remove_material", "dismiss"]


class AdminReport(BaseModel):
    id: str
    material_id: str
    material_title: str
    material_removed: bool
    reporter_name: str
    reason: ReportReason
    note: str | None
    status: Literal["open", "resolved", "dismissed"]
    resolved_by: str | None
    created_at: datetime
