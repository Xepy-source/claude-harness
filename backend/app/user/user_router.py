from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.auth_router import CurrentAdmin, get_current_admin
from app.db.db import SessionDep
from app.db.models import User, UserRole
from app.user import user_crud
from app.user.user_schema import UserCreate, UserList, UserPublic, UserUpdate

# 라우터 전체를 관리자 전용으로 막는다. 핸들러에서 요청한 관리자가 필요하면 CurrentAdmin을 받는다.
router = APIRouter(
    prefix="/api/admin/users",
    tags=["admin: users"],
    dependencies=[Depends(get_current_admin)],
)


def get_user_or_404(session: SessionDep, user_id: int) -> User:
    user = user_crud.get_user(session, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "사용자를 찾을 수 없습니다.")
    return user


@router.get("", response_model=UserList)
def list_users(
    session: SessionDep,
    q: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict[str, object]:
    users, total = user_crud.list_users(
        session, q=q, role=role, is_active=is_active, page=page, size=size
    )
    return {"items": users, "total": total}


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, session: SessionDep) -> User:
    try:
        return user_crud.create_user(
            session, email=body.email, name=body.name, password=body.password, role=body.role
        )
    except user_crud.EmailAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 등록된 이메일입니다.") from None


@router.get("/{user_id}", response_model=UserPublic)
def read_user(user_id: int, session: SessionDep) -> User:
    return get_user_or_404(session, user_id)


@router.patch("/{user_id}", response_model=UserPublic)
def update_user(user_id: int, body: UserUpdate, admin: CurrentAdmin, session: SessionDep) -> User:
    user = get_user_or_404(session, user_id)
    try:
        return user_crud.update_user(
            session, user, actor=admin, **body.model_dump(exclude_unset=True)
        )
    except user_crud.SelfModificationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, admin: CurrentAdmin, session: SessionDep) -> None:
    user = get_user_or_404(session, user_id)
    try:
        user_crud.delete_user(session, user, actor=admin)
    except user_crud.SelfModificationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None
