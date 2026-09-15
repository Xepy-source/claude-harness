from datetime import timedelta

import pytest
from sqlmodel import Session

from app.db.models import User, UserRole
from app.user import user_crud
from app.utils.security import verify_password


def make_user(
    session: Session, email: str, name: str = "회원", role: UserRole = UserRole.USER
) -> User:
    return user_crud.create_user(
        session, email=email, name=name, password="member-password", role=role
    )


def test_create_user_normalizes_email_and_hashes_password(session: Session) -> None:
    user = make_user(session, "  Mixed@Example.COM ")

    assert user.email == "mixed@example.com"
    assert user.password_hash != "member-password"
    assert verify_password("member-password", user.password_hash)


def test_create_user_rejects_duplicate_email(session: Session) -> None:
    make_user(session, "a@example.com")

    with pytest.raises(user_crud.EmailAlreadyExistsError):
        make_user(session, "A@example.com")


def test_list_users_searches_email_and_name(session: Session) -> None:
    make_user(session, "kim@example.com", name="홍길동")
    make_user(session, "lee@example.com", name="김철수")

    by_email, _ = user_crud.list_users(session, q="kim")
    by_name, _ = user_crud.list_users(session, q="김")

    assert [u.email for u in by_email] == ["kim@example.com"]
    assert [u.email for u in by_name] == ["lee@example.com"]


def test_list_users_pages_newest_first(session: Session) -> None:
    for i in range(5):
        make_user(session, f"user{i}@example.com")

    users, total = user_crud.list_users(session, page=2, size=2)

    assert total == 5
    assert [u.email for u in users] == ["user2@example.com", "user1@example.com"]


def test_list_users_orders_by_created_at_not_id(session: Session) -> None:
    older = make_user(session, "older@example.com")
    newer = make_user(session, "newer@example.com")
    # 나중에 만든 사용자(id가 큰 쪽)의 가입 시각을 과거로 돌린다.
    newer.created_at = older.created_at - timedelta(days=1)
    session.add(newer)
    session.commit()

    users, _ = user_crud.list_users(session)

    assert [u.email for u in users] == ["older@example.com", "newer@example.com"]


def test_list_users_breaks_created_at_ties_by_newest_id(session: Session) -> None:
    first = make_user(session, "first@example.com")
    second = make_user(session, "second@example.com")
    second.created_at = first.created_at
    session.add(second)
    session.commit()

    users, _ = user_crud.list_users(session)

    assert [u.email for u in users] == ["second@example.com", "first@example.com"]


def test_list_users_filters_by_role_and_active(session: Session) -> None:
    make_user(session, "admin@example.com", name="김관리", role=UserRole.ADMIN)
    make_user(session, "kim@example.com", name="김회원")
    inactive = make_user(session, "lee@example.com", name="이회원")
    inactive.is_active = False
    session.add(inactive)
    session.commit()

    admins, admin_total = user_crud.list_users(session, role=UserRole.ADMIN)
    inactive_users, _ = user_crud.list_users(session, is_active=False)
    active_members, _ = user_crud.list_users(session, role=UserRole.USER, is_active=True)
    kim_members, _ = user_crud.list_users(session, q="김", role=UserRole.USER)

    assert (admin_total, [u.email for u in admins]) == (1, ["admin@example.com"])
    assert [u.email for u in inactive_users] == ["lee@example.com"]
    assert [u.email for u in active_members] == ["kim@example.com"]
    assert [u.email for u in kim_members] == ["kim@example.com"]


def test_list_users_treats_like_wildcards_literally(session: Session) -> None:
    make_user(session, "percent@example.com", name="100%")
    make_user(session, "plain@example.com", name="100")

    users, total = user_crud.list_users(session, q="%")

    assert total == 1
    assert users[0].name == "100%"


def test_update_user_changes_only_given_fields(session: Session) -> None:
    admin = make_user(session, "admin@example.com", role=UserRole.ADMIN)
    member = make_user(session, "member@example.com")

    updated = user_crud.update_user(session, member, actor=admin, name="새이름")

    assert updated.name == "새이름"
    assert updated.role == UserRole.USER
    assert updated.is_active is True


def test_update_user_rehashes_password(session: Session) -> None:
    admin = make_user(session, "admin@example.com", role=UserRole.ADMIN)
    member = make_user(session, "member@example.com")

    updated = user_crud.update_user(session, member, actor=admin, password="changed-password")

    assert verify_password("changed-password", updated.password_hash)


@pytest.mark.parametrize("changes", [{"is_active": False}, {"role": UserRole.USER}])
def test_update_user_blocks_self_demotion(session: Session, changes: dict[str, object]) -> None:
    admin = make_user(session, "admin@example.com", role=UserRole.ADMIN)

    with pytest.raises(user_crud.SelfModificationError):
        user_crud.update_user(session, admin, actor=admin, **changes)  # type: ignore[arg-type]

    session.refresh(admin)
    assert admin.role == UserRole.ADMIN
    assert admin.is_active is True


def test_delete_user(session: Session) -> None:
    admin = make_user(session, "admin@example.com", role=UserRole.ADMIN)
    member = make_user(session, "member@example.com")
    member_id = member.id
    assert member_id is not None

    user_crud.delete_user(session, member, actor=admin)

    assert user_crud.get_user(session, member_id) is None


def test_record_login_sets_time_without_touching_updated_at(session: Session) -> None:
    user = make_user(session, "member@example.com")
    assert user.last_login_at is None
    updated_before = user.updated_at

    user = user_crud.record_login(session, user)

    assert user.last_login_at is not None
    assert user.last_login_at.tzinfo is not None
    assert user.updated_at == updated_before


def test_delete_user_blocks_self(session: Session) -> None:
    admin = make_user(session, "admin@example.com", role=UserRole.ADMIN)

    with pytest.raises(user_crud.SelfModificationError):
        user_crud.delete_user(session, admin, actor=admin)
