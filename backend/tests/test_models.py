import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.db.models import User, UserRole


def make_user(**overrides: object) -> User:
    data: dict[str, object] = {"email": "a@example.com", "name": "A", "password_hash": "x"}
    return User.model_validate(data | overrides)


def save(session: Session, user: User) -> User:
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_user_defaults(session: Session) -> None:
    user = save(session, make_user())

    assert user.id is not None
    assert user.role == UserRole.USER
    assert user.is_active is True
    assert user.created_at.tzinfo is not None


def test_email_is_unique(session: Session) -> None:
    save(session, make_user())

    session.add(make_user(name="B"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_updated_at_changes_on_update(session: Session) -> None:
    user = save(session, make_user())
    before = user.updated_at

    user.name = "B"
    user = save(session, user)

    assert user.updated_at > before
