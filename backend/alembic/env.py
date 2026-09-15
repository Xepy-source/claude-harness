from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

import app.models  # noqa: F401  모델을 SQLModel.metadata에 등록한다.
from alembic import context
from app.config import settings

config = context.config

# 테스트는 configure_logger=False를 넘겨 pytest 로그 설정을 덮어쓰지 않게 한다.
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

# 호출자(예: 테스트)가 URL을 지정하지 않으면 .env의 개발 DB를 쓴다.
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
