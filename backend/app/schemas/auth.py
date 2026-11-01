from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_serializer


class LoginInput(BaseModel):
    username: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
    password: Annotated[str, Field(min_length=1, max_length=1024)]


class RegisterInput(BaseModel):
    username: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=64)]
    password: Annotated[str, Field(min_length=8, max_length=128)]


class SessionInfo(BaseModel):
    username: str
    expires_at: datetime

    @field_serializer("expires_at")
    def _utc(self, value: datetime) -> str:
        return value.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")
