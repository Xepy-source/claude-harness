from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy import Engine, make_url, text
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  모델을 SQLModel.metadata에 등록한다.
from alembic import command
from app.config import settings
from app.db import get_session
from app.main import app as fastapi_app
from app.models import User, UserRole
from app.users import create_user

BACKEND_DIR = Path(__file__).resolve().parent.parent


def make_alembic_config(url: str) -> Config:
    config = Config(BACKEND_DIR / "alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    config.attributes["configure_logger"] = False
    return config


def ensure_test_database() -> None:
    test_url = make_url(settings.test_database_url)
    if test_url.database == make_url(settings.database_url).database:
        pytest.exit(
            "TEST_DATABASE_URL이 개발 DB와 같습니다. "
            "테스트는 테이블을 비우므로 다른 DB를 지정하세요.",
            returncode=1,
        )

    admin_dsn = test_url.set(drivername="postgresql", database="postgres").render_as_string(
        hide_password=False
    )
    try:
        with psycopg.connect(admin_dsn, autocommit=True, connect_timeout=3) as conn:
            exists = conn.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (test_url.database,)
            ).fetchone()
            if not exists:
                conn.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(test_url.database))
                )
    except psycopg.OperationalError as exc:
        pytest.exit(
            f"PostgreSQL({test_url.host}:{test_url.port})에 연결할 수 없습니다. "
            f"Postgres.app이 실행 중인지 확인하세요.\n{exc}",
            returncode=1,
        )


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    """테스트 DB 스키마를 새로 만들고 마이그레이션을 head까지 적용한다."""
    ensure_test_database()
    engine = create_engine(settings.test_database_url)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    command.upgrade(make_alembic_config(settings.test_database_url), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def alembic_cfg() -> Config:
    return make_alembic_config(settings.test_database_url)


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    """테스트가 끝나면 모든 테이블을 비운다."""
    with Session(engine) as session:
        yield session
        session.rollback()

    tables = ", ".join(f'"{table.name}"' for table in SQLModel.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    """API 요청이 테스트와 같은 DB 세션을 쓰는 클라이언트."""
    fastapi_app.dependency_overrides[get_session] = lambda: session
    with TestClient(fastapi_app) as client:
        yield client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def admin_password() -> str:
    return "admin-password"


@pytest.fixture
def admin(session: Session, admin_password: str) -> User:
    return create_user(
        session,
        email="admin@example.com",
        name="관리자",
        password=admin_password,
        role=UserRole.ADMIN,
    )


@pytest.fixture
def admin_client(client: TestClient, admin: User, admin_password: str) -> TestClient:
    """관리자로 로그인한 클라이언트."""
    response = client.post(
        "/api/auth/login", json={"email": admin.email, "password": admin_password}
    )
    assert response.status_code == 200, response.text
    return client
