from datetime import UTC, datetime, timedelta

import jwt

from app.utils.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("secret-password")

    assert hashed != "secret-password"
    assert verify_password("secret-password", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_roundtrip() -> None:
    assert decode_access_token(create_access_token(42)) == 42


def test_expired_token_is_rejected() -> None:
    token = create_access_token(42, expires_in=timedelta(seconds=-1))

    assert decode_access_token(token) is None


def test_token_signed_with_other_key_is_rejected() -> None:
    payload = {"sub": "42", "exp": datetime.now(UTC) + timedelta(minutes=5)}
    token = jwt.encode(payload, "another-secret-key-another-secret-key", algorithm="HS256")

    assert decode_access_token(token) is None


def test_garbage_token_is_rejected() -> None:
    assert decode_access_token("not-a-token") is None
