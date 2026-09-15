import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db.models import User, UserRole
from app.user.user_crud import create_user

USERS_URL = "/api/admin/users"

ALL_ENDPOINTS = [
    ("get", USERS_URL),
    ("post", USERS_URL),
    ("get", f"{USERS_URL}/1"),
    ("patch", f"{USERS_URL}/1"),
    ("delete", f"{USERS_URL}/1"),
]


def make_member(session: Session, email: str = "member@example.com", name: str = "회원") -> User:
    return create_user(session, email=email, name=name, password="member-password")


@pytest.mark.parametrize(("method", "path"), ALL_ENDPOINTS)
def test_requires_login(client: TestClient, method: str, path: str) -> None:
    assert client.request(method, path, json={}).status_code == 401


@pytest.mark.parametrize(("method", "path"), ALL_ENDPOINTS)
def test_forbids_normal_user(user_client: TestClient, method: str, path: str) -> None:
    assert user_client.request(method, path, json={}).status_code == 403


def test_forbids_admin_demoted_after_login(
    admin_client: TestClient, session: Session, admin: User
) -> None:
    admin.role = UserRole.USER
    session.add(admin)
    session.commit()

    assert admin_client.get(USERS_URL).status_code == 403


def test_list_users(admin_client: TestClient, session: Session) -> None:
    make_member(session)

    response = admin_client.get(USERS_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert [item["email"] for item in body["items"]] == ["admin@example.com", "member@example.com"]
    assert all("password_hash" not in item for item in body["items"])


def test_list_users_search_and_paging(admin_client: TestClient, session: Session) -> None:
    for i in range(3):
        make_member(session, email=f"kim{i}@example.com", name=f"김{i}")
    make_member(session, email="lee@example.com", name="이")

    response = admin_client.get(USERS_URL, params={"q": "kim", "page": 2, "size": 2})

    body = response.json()
    assert body["total"] == 3
    assert [item["email"] for item in body["items"]] == ["kim2@example.com"]


@pytest.mark.parametrize("params", [{"size": 101}, {"size": 0}, {"page": 0}])
def test_list_users_validates_paging(admin_client: TestClient, params: dict[str, int]) -> None:
    assert admin_client.get(USERS_URL, params=params).status_code == 422


def test_create_user(admin_client: TestClient) -> None:
    response = admin_client.post(
        USERS_URL, json={"email": "New@Example.com", "name": "신규", "password": "new-password"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "user"
    assert body["is_active"] is True
    assert "password" not in body
    assert "password_hash" not in body


def test_create_user_rejects_duplicate_email(admin_client: TestClient) -> None:
    response = admin_client.post(
        USERS_URL, json={"email": "ADMIN@example.com", "name": "중복", "password": "new-password"}
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "not-an-email", "name": "이름", "password": "new-password"},
        {"email": "a@example.com", "name": "", "password": "new-password"},
        {"email": "a@example.com", "name": "이름", "password": "short"},
        {"email": "a@example.com", "name": "이름", "password": "new-password", "role": "owner"},
    ],
)
def test_create_user_validates_input(admin_client: TestClient, payload: dict[str, str]) -> None:
    assert admin_client.post(USERS_URL, json=payload).status_code == 422


def test_read_user(admin_client: TestClient, session: Session) -> None:
    member = make_member(session)

    response = admin_client.get(f"{USERS_URL}/{member.id}")

    assert response.status_code == 200
    assert response.json()["email"] == member.email


def test_read_missing_user(admin_client: TestClient) -> None:
    assert admin_client.get(f"{USERS_URL}/9999").status_code == 404


def test_update_user(admin_client: TestClient, session: Session) -> None:
    member = make_member(session)

    response = admin_client.patch(
        f"{USERS_URL}/{member.id}", json={"name": "변경", "role": "admin", "is_active": False}
    )

    assert response.status_code == 200
    body = response.json()
    assert (body["name"], body["role"], body["is_active"]) == ("변경", "admin", False)


def test_update_user_keeps_unsent_fields(admin_client: TestClient, session: Session) -> None:
    member = make_member(session)

    response = admin_client.patch(f"{USERS_URL}/{member.id}", json={"name": "변경"})

    body = response.json()
    assert (body["name"], body["role"], body["is_active"]) == ("변경", "user", True)


def test_update_user_password(admin_client: TestClient, session: Session) -> None:
    member = make_member(session)

    response = admin_client.patch(f"{USERS_URL}/{member.id}", json={"password": "changed-password"})
    assert response.status_code == 200

    login = admin_client.post(
        "/api/auth/login", json={"email": member.email, "password": "changed-password"}
    )
    assert login.status_code == 200


@pytest.mark.parametrize("payload", [{"is_active": False}, {"role": "user"}])
def test_admin_cannot_demote_or_deactivate_self(
    admin_client: TestClient, admin: User, payload: dict[str, object]
) -> None:
    assert admin_client.patch(f"{USERS_URL}/{admin.id}", json=payload).status_code == 400


def test_admin_can_rename_self(admin_client: TestClient, admin: User) -> None:
    response = admin_client.patch(f"{USERS_URL}/{admin.id}", json={"name": "새 이름"})

    assert response.status_code == 200
    assert response.json()["name"] == "새 이름"


def test_update_missing_user(admin_client: TestClient) -> None:
    assert admin_client.patch(f"{USERS_URL}/9999", json={"name": "x"}).status_code == 404


def test_delete_user(admin_client: TestClient, session: Session) -> None:
    member = make_member(session)
    member_id = member.id

    assert admin_client.delete(f"{USERS_URL}/{member_id}").status_code == 204
    assert admin_client.get(f"{USERS_URL}/{member_id}").status_code == 404


def test_admin_cannot_delete_self(admin_client: TestClient, admin: User) -> None:
    assert admin_client.delete(f"{USERS_URL}/{admin.id}").status_code == 400


def test_delete_missing_user(admin_client: TestClient) -> None:
    assert admin_client.delete(f"{USERS_URL}/9999").status_code == 404
