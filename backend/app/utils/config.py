from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    database_url: str
    test_database_url: str
    jwt_secret_key: str
    jwt_expire_minutes: int = 60 * 8
    # HTTPS로 배포할 때 true로 바꾼다.
    cookie_secure: bool = False


settings = Settings()
