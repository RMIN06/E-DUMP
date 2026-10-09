from datetime import datetime
from typing import Literal

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field


class FileRecord(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True)
    id: ObjectId = Field(alias="_id")
    key: str
    original_name: str
    mime_type: str
    size_bytes: int
    sha256: str
    uploader_id: ObjectId
    status: Literal["pending", "ready", "deleted"]
    created_at: datetime
