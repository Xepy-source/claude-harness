from collections.abc import Sequence

from sqlalchemy import func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.db.models import User, UserRole, utcnow
from app.utils.security import hash_password

CANNOT_DEMOTE_SELF = "자기 자신은 비활성화하거나 일반 사용자로 바꿀 수 없습니다."
CANNOT_DELETE_SELF = "자기 자신은 삭제할 수 없습니다."


class EmailAlreadyExistsError(Exception):
    pass


class SelfModificationError(Exception):
    """관리자가 자기 자신을 삭제, 비활성화, 일반 사용자로 바꾸려 할 때."""


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)


def get_user_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == normalize_email(email))).first()


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_users(
    session: Session, *, q: str | None = None, page: int = 1, size: int = 20
) -> tuple[Sequence[User], int]:
    """이메일이나 이름에 q가 들어간 사용자를 id 순으로 반환한다. (한 페이지 목록, 전체 개수)"""
    statement = select(User)
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        statement = statement.where(
            or_(
                col(User.email).ilike(pattern, escape="\\"),
                col(User.name).ilike(pattern, escape="\\"),
            )
        )

    total = session.exec(select(func.count()).select_from(statement.subquery())).one()
    users = session.exec(
        statement.order_by(col(User.id)).offset((page - 1) * size).limit(size)
    ).all()
    return users, total


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


def update_user(
    session: Session,
    user: User,
    *,
    actor: User,
    name: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    password: str | None = None,
) -> User:
    """None인 값은 바꾸지 않는다. actor는 변경을 요청한 관리자다."""
    demotes_self = (role is not None and role != UserRole.ADMIN) or is_active is False
    if user.id == actor.id and demotes_self:
        raise SelfModificationError(CANNOT_DEMOTE_SELF)

    if name is not None:
        user.name = name
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    if password is not None:
        user.password_hash = hash_password(password)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def delete_user(session: Session, user: User, *, actor: User) -> None:
    if user.id == actor.id:
        raise SelfModificationError(CANNOT_DELETE_SELF)
    session.delete(user)
    session.commit()


def record_login(session: Session, user: User) -> User:
    """로그인 성공 시각을 남긴다. 계정 정보를 바꾼 것이 아니므로 updated_at은 그대로 둔다."""
    session.exec(
        update(User)
        .where(col(User.id) == user.id)
        .values(last_login_at=utcnow(), updated_at=User.updated_at)
    )
    session.commit()
    session.refresh(user)
    return user
