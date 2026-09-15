"""관리 명령.

사용법: uv run python -m app.cli create-admin --email admin@example.com --name 관리자
"""

import argparse
import getpass
import sys
from collections.abc import Callable, Sequence

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlmodel import Session

from app.db import engine
from app.models import UserRole
from app.users import EmailAlreadyExistsError, create_user

MIN_PASSWORD_LENGTH = 8

_email_adapter = TypeAdapter(EmailStr)


def prompt_password() -> str:
    password = getpass.getpass("비밀번호: ")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise SystemExit(f"비밀번호는 {MIN_PASSWORD_LENGTH}자 이상이어야 합니다.")
    if getpass.getpass("비밀번호 확인: ") != password:
        raise SystemExit("비밀번호가 일치하지 않습니다.")
    return password


def main(
    argv: Sequence[str] | None = None,
    *,
    session_factory: Callable[[], Session] = lambda: Session(engine),
    password_prompt: Callable[[], str] = prompt_password,
) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create_admin = commands.add_parser("create-admin", help="관리자 계정을 만든다.")
    create_admin.add_argument("--email", required=True)
    create_admin.add_argument("--name", required=True)
    args = parser.parse_args(argv)

    try:
        email = _email_adapter.validate_python(args.email)
    except ValidationError:
        print(f"이메일 형식이 올바르지 않습니다: {args.email}", file=sys.stderr)
        return 1

    password = password_prompt()
    with session_factory() as session:
        try:
            user = create_user(
                session, email=email, name=args.name, password=password, role=UserRole.ADMIN
            )
        except EmailAlreadyExistsError:
            print(f"이미 등록된 이메일입니다: {email}", file=sys.stderr)
            return 1
        print(f"관리자 계정을 만들었습니다: {user.email} (id={user.id})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
