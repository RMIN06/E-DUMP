from typing import Literal

from pydantic import BaseModel, Field


class SubjectSeed(BaseModel):
    slug: str = Field(pattern=r"^[a-z]+(?:-[a-z]+)*$", max_length=50)
    name: str = Field(min_length=1, max_length=150)
    short_name: str = Field(min_length=1, max_length=40)
    credits: int | None = Field(default=None, ge=0, le=10)
    teacher: str | None = Field(default=None, max_length=100)
    kind: Literal["theory", "lab"]
    sort_order: int = Field(ge=0)
    aliases: list[str] = Field(default_factory=list)


class Subject(SubjectSeed):
    id: str
    material_count: int = 0
