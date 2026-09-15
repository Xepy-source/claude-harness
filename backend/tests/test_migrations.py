from alembic.config import Config
from sqlalchemy import Engine

from alembic import command


def test_migrations_match_models(engine: Engine, alembic_cfg: Config) -> None:
    """모델을 바꾸고 마이그레이션을 만들지 않으면 실패한다."""
    command.check(alembic_cfg)


def test_downgrade_then_upgrade(engine: Engine, alembic_cfg: Config) -> None:
    command.downgrade(alembic_cfg, "base")
    command.upgrade(alembic_cfg, "head")
