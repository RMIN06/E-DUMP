from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field

from app.models.user import User


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(max_length=256)


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: str = Field(min_length=1, max_length=256)


class Tokens(BaseModel):
    access_token: str
    refresh_token: str


class LoginResponse(Tokens):
    user: User
    needs_name: bool


class RefreshRecord(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True)
    id: ObjectId = Field(alias="_id")
    user_id: ObjectId
    token_hash: str
    family_id: str
    expires_at: datetime
    revoked_at: datetime | None = None
    replaced_by: ObjectId | None = None
    created_at: datetime
    user_agent: str
