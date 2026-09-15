from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import User, UserRole
from app.security import hash_password


class EmailAlreadyExistsError(Exception):
    pass


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == normalize_email(email))).first()


def create_user(
    session: Session,
    *,
    email: str,
    name: str,
    password: str,
    role: UserRole = UserRole.USER,
) -> User:
    email = normalize_email(email)
    if get_user_by_email(session, email) is not None:
        raise EmailAlreadyExistsError(email)

    user = User(email=email, name=name, password_hash=hash_password(password), role=role)
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:  # 동시에 같은 이메일로 만든 경우
        session.rollback()
        raise EmailAlreadyExistsError(email) from exc
    session.refresh(user)
    return user
