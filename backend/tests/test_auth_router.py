from datetime import timedelta

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db.models import User
from app.utils.security import create_access_token


def login(client: TestClient, email: str, password: str) -> httpx.Response:
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_login_sets_httponly_cookie_and_returns_admin(
    client: TestClient, admin: User, admin_password: str
) -> None:
    response = login(client, admin.email, admin_password)

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == admin.email
    assert body["role"] == "admin"
    assert "password_hash" not in body
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith("access_token=")
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()


def test_login_allows_normal_user(client: TestClient, user: User, user_password: str) -> None:
    response = login(client, user.email, user_password)

    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_login_email_is_case_insensitive(
    client: TestClient, admin: User, admin_password: str
) -> None:
    assert login(client, "  ADMIN@Example.com ", admin_password).status_code == 200


@pytest.mark.parametrize(
    ("email", "password"),
    [("admin@example.com", "wrong-password"), ("nobody@example.com", "admin-password")],
)
def test_login_rejects_bad_credentials(
    client: TestClient, admin: User, email: str, password: str
) -> None:
    response = login(client, email, password)

    assert response.status_code == 401
    assert "set-cookie" not in response.headers


def test_login_rejects_inactive_user(
    client: TestClient, session: Session, user: User, user_password: str
) -> None:
    user.is_active = False
    session.add(user)
    session.commit()

    assert login(client, user.email, user_password).status_code == 401


def test_me_requires_login(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_invalid_token(client: TestClient) -> None:
    client.cookies.set("access_token", "not-a-token")

    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_expired_token(client: TestClient, admin: User) -> None:
    assert admin.id is not None
    client.cookies.set(
        "access_token", create_access_token(admin.id, expires_in=timedelta(seconds=-1))
    )

    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_logged_in_admin(admin_client: TestClient, admin: User) -> None:
    response = admin_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["id"] == admin.id
    assert response.json()["role"] == "admin"


def test_me_returns_logged_in_normal_user(user_client: TestClient, user: User) -> None:
    response = user_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["id"] == user.id
    assert response.json()["role"] == "user"


def test_me_rejects_user_deactivated_after_login(
    user_client: TestClient, session: Session, user: User
) -> None:
    user.is_active = False
    session.add(user)
    session.commit()

    assert user_client.get("/api/auth/me").status_code == 401


def test_login_records_last_login_time(
    client: TestClient, session: Session, admin: User, admin_password: str
) -> None:
    assert admin.last_login_at is None

    response = login(client, admin.email, admin_password)

    assert response.json()["last_login_at"] is not None
    session.refresh(admin)
    assert admin.last_login_at is not None


def test_failed_login_does_not_record_login_time(
    client: TestClient, session: Session, admin: User
) -> None:
    login(client, admin.email, "wrong-password")

    session.refresh(admin)
    assert admin.last_login_at is None


def test_logout_clears_cookie(admin_client: TestClient) -> None:
    response = admin_client.post("/api/auth/logout")

    assert response.status_code == 204
    assert admin_client.get("/api/auth/me").status_code == 401
