from datetime import datetime
from typing import Literal

from bson import ObjectId
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

AnnouncementType = Literal["quiz", "task", "datesheet", "general"]


class AnnouncementWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: AnnouncementType
    title: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=2000)
    subject_slug: str | None = Field(default=None, max_length=80)
    due_at: AwareDatetime | None = None
    file_ids: list[str] = Field(default_factory=list, max_length=3)

    @field_validator("title", "body")
    @classmethod
    def clean(cls, value: str) -> str:
        value = value.strip()
        if not value or any(ord(c) < 32 and c not in "\n\t" or ord(c) == 127 for c in value):
            raise ValueError("Enter plain text.")
        return value

    @field_validator("file_ids")
    @classmethod
    def valid_files(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value) or any(not ObjectId.is_valid(item) for item in value):
            raise ValueError("Invalid attachments.")
        return value


class AnnouncementPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: AnnouncementType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=100)
    body: str | None = Field(default=None, min_length=1, max_length=2000)
    subject_slug: str | None = Field(default=None, max_length=80)
    due_at: AwareDatetime | None = None
    file_ids: list[str] | None = Field(default=None, max_length=3)
    pinned: bool | None = None

    @model_validator(mode="after")
    def non_null_fields(self) -> "AnnouncementPatch":
        for field in ("type", "title", "body", "file_ids", "pinned"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError("This field cannot be null.")
        return self


class Attachment(BaseModel):
    file_id: str
    original_name: str
    mime_type: str
    size_bytes: int


class Announcement(BaseModel):
    id: str
    type: AnnouncementType
    title: str
    body: str
    subject_slug: str | None
    due_at: datetime | None
    file_ids: list[str]
    attachments: list[Attachment]
    pinned: bool
    author_id: str
    author_name: str
    created_at: datetime
    updated_at: datetime


class AnnouncementRecord(AnnouncementWrite):
    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True, extra="ignore")
    id: ObjectId = Field(alias="_id")
    pinned: bool = False
    author_id: ObjectId
    author_name_snapshot: str
    created_at: datetime
    updated_at: datetime


class AnnouncementPage(BaseModel):
    items: list[Announcement]
    next_cursor: str | None


class UnreadCount(BaseModel):
    count: int
