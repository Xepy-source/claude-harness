from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, SQLModel

from app.db.models import UserRole

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


class UserPublic(SQLModel):
    """API 응답용 사용자. password_hash를 포함하지 않는다."""

    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserList(SQLModel):
    items: list[UserPublic]
    total: int


class UserCreate(SQLModel):
    email: EmailStr = Field(max_length=255)
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    role: UserRole = UserRole.USER


class UserUpdate(SQLModel):
    """보내지 않은 필드는 바꾸지 않는다."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(
        default=None, min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH
    )
