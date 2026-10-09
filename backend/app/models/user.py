from datetime import datetime
from typing import Literal

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRecord(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True)
    id: ObjectId = Field(alias="_id")
    email: str
    name: str | None = None
    role: Literal["student", "admin"]
    is_active: bool
    roll_no: str
    created_at: datetime
    last_login_at: datetime
    last_seen_updates_at: datetime | None = None


class User(BaseModel):
    id: str
    email: str
    name: str | None
    role: Literal["student", "admin"]
    is_active: bool
    roll_no: str
    created_at: datetime
    last_login_at: datetime
    last_seen_updates_at: datetime | None

    @classmethod
    def from_record(cls, record: UserRecord) -> "User":
        return cls.model_validate(record.model_dump() | {"id": str(record.id)})


class NameRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=40)

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, value: object) -> object:
        if isinstance(value, str):
            if any(ord(character) < 32 or ord(character) == 127 for character in value):
                raise ValueError("Name cannot contain control characters.")
            return value.strip()
        return value
