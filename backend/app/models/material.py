from datetime import datetime
from typing import Literal

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator

MaterialKind = Literal["slides", "notes", "assignment", "past_paper", "book", "other"]


class MaterialCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=100)
    kind: MaterialKind
    chapter: int | None = Field(default=None, ge=0, le=99)
    description: str | None = Field(default=None, max_length=200)

    @field_validator("title", "description", mode="before")
    @classmethod
    def clean_text(cls, value: object) -> object:
        if isinstance(value, str):
            if any(
                ord(char) < 32 and char not in "\n\t" or ord(char) == 127
                for char in value
            ):
                raise ValueError("Control characters are not allowed.")
            return value.strip()
        return value


class Material(BaseModel):
    id: str
    subject_slug: str
    file_id: str
    title: str
    kind: MaterialKind
    chapter: int | None
    description: str | None
    uploader_id: str
    uploader_name: str
    original_name: str
    mime_type: str
    size_bytes: int
    created_at: datetime
    updated_at: datetime


class MaterialRecord(MaterialCreate):
    model_config = ConfigDict(
        arbitrary_types_allowed=True, populate_by_name=True, extra="ignore"
    )
    id: ObjectId = Field(alias="_id")
    subject_slug: str
    file_id: ObjectId
    uploader_id: ObjectId
    uploader_name_snapshot: str
    file_sha256: str
    search_text: str
    status: Literal["active", "removed"]
    created_at: datetime
    updated_at: datetime


class MaterialPage(BaseModel):
    items: list[Material]
    next_cursor: str | None
    chapters: list[int]


class Download(BaseModel):
    url: str
    expires_in: int
    filename: str
    mime_type: str
    size_bytes: int


class Removed(BaseModel):
    status: Literal["removed"] = "removed"
