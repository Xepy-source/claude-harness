from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.utils.config import settings

ALGORITHM = "HS256"

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _password_hash.verify(password, password_hash)


def create_access_token(user_id: int, *, expires_in: timedelta | None = None) -> str:
    expires_in = expires_in or timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": datetime.now(UTC) + expires_in}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """토큰이 위조됐거나 만료됐으면 None을 반환한다."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
