from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlmodel import SQLModel

from app.config import settings
from app.db import SessionDep
from app.models import User, UserPublic, UserRole
from app.security import create_access_token, decode_access_token, hash_password, verify_password
from app.users import get_user_by_email

COOKIE_NAME = "access_token"
LOGIN_FAILED = "이메일 또는 비밀번호가 올바르지 않습니다."
# 없는 이메일이어도 해시 검증을 똑같이 수행해서, 응답 시간으로 가입 여부를 알 수 없게 한다.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password")

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(SQLModel):
    email: str
    password: str


def get_current_admin(
    session: SessionDep,
    access_token: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
) -> User:
    user_id = decode_access_token(access_token) if access_token else None
    user = session.get(User, user_id) if user_id is not None else None
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "로그인이 필요합니다.")
    if user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "관리자 권한이 필요합니다.")
    return user


# 관리 API는 이 의존성으로 보호한다: def handler(admin: CurrentAdmin): ...
CurrentAdmin = Annotated[User, Depends(get_current_admin)]


@router.post("/login", response_model=UserPublic)
def login(body: LoginRequest, session: SessionDep, response: Response) -> User:
    user = get_user_by_email(session, body.email)
    password_ok = verify_password(
        body.password, user.password_hash if user else _DUMMY_PASSWORD_HASH
    )
    if user is None or not password_ok or not user.is_active or user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, LOGIN_FAILED)

    response.set_cookie(
        COOKIE_NAME,
        create_access_token(user.id),
        max_age=settings.jwt_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(
        COOKIE_NAME, httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


@router.get("/me", response_model=UserPublic)
def me(admin: CurrentAdmin) -> User:
    return admin
