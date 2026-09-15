from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, String
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class UserRole(StrEnum):
    ADMIN = "admin"
    USER = "user"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    name: str = Field(max_length=100)
    password_hash: str = Field(max_length=255)
    role: UserRole = Field(default=UserRole.USER, sa_type=String(20))
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"onupdate": utcnow},
    )


class UserPublic(SQLModel):
    """API 응답용 사용자. password_hash를 포함하지 않는다."""

    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
