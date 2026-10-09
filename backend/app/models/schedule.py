from pydantic import BaseModel, Field, model_validator


class ScheduleSeed(BaseModel):
    subject_slug: str = Field(min_length=1, max_length=50)
    weekday: int = Field(ge=1, le=7)
    start: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    venue: str = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def ordered_times(self) -> "ScheduleSeed":
        if self.start >= self.end:
            raise ValueError("Class must end after it starts.")
        return self


class ScheduleSlot(ScheduleSeed):
    id: str
    subject_name: str
    short_name: str
    teacher: str | None
