import pytest
from sqlmodel import Session

from app.db.models import UserRole
from app.user.user_crud import get_user_by_email
from app.utils.cli import main
from app.utils.security import verify_password


def run_create_admin(session: Session, email: str, name: str = "대표") -> int:
    return main(
        ["create-admin", "--email", email, "--name", name],
        session_factory=lambda: session,
        password_prompt=lambda: "admin-password",
    )


def test_create_admin(session: Session, capsys: pytest.CaptureFixture[str]) -> None:
    assert run_create_admin(session, "Boss@Example.com") == 0

    user = get_user_by_email(session, "boss@example.com")
    assert user is not None
    assert user.role == UserRole.ADMIN
    assert verify_password("admin-password", user.password_hash)
    assert "boss@example.com" in capsys.readouterr().out


def test_create_admin_rejects_duplicate_email(
    session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    assert run_create_admin(session, "boss@example.com") == 0
    assert run_create_admin(session, "BOSS@example.com") == 1
    assert "이미 등록된 이메일" in capsys.readouterr().err


def test_create_admin_rejects_invalid_email(
    session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    assert run_create_admin(session, "not-an-email") == 1
    assert "이메일 형식" in capsys.readouterr().err
