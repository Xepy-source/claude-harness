"""backend/CLAUDE.md의 파일 생성 규칙을 검사한다."""

import ast
import re
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parent.parent / "app"
SHARED_DIRS = {"db", "utils"}
FEATURE_FILE_SUFFIXES = ("_router.py", "_crud.py", "_schema.py")
SNAKE_CASE = re.compile(r"^[a-z][a-z0-9_]*$")


def entries(directory: Path) -> list[Path]:
    """캐시와 숨김 파일(.DS_Store 등)을 뺀 항목."""
    return sorted(
        p for p in directory.iterdir() if p.name != "__pycache__" and not p.name.startswith(".")
    )


def feature_dirs() -> list[Path]:
    return [p for p in entries(APP_DIR) if p.is_dir() and p.name not in SHARED_DIRS]


def source_files(pattern: str) -> list[Path]:
    return sorted(p for p in APP_DIR.rglob(pattern) if "__pycache__" not in p.parts)


def imported_modules(path: Path) -> set[str]:
    modules = set()
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, ast.ImportFrom) and node.module:
            modules.update(f"{node.module}.{alias.name}" for alias in node.names)
        elif isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
    return modules


def test_app_root_has_only_main() -> None:
    allowed = {"__init__.py", "main.py"}
    files = {p.name for p in entries(APP_DIR) if p.is_file()}

    assert files <= allowed, f"app/ 바로 아래에는 main.py만 둔다. 옮길 파일: {files - allowed}"


@pytest.mark.parametrize("feature", feature_dirs(), ids=lambda p: p.name)
def test_feature_folder_has_only_allowed_files(feature: Path) -> None:
    allowed = {"__init__.py"} | {f"{feature.name}{suffix}" for suffix in FEATURE_FILE_SUFFIXES}
    names = {p.name for p in entries(feature)}

    assert names <= allowed, f"{feature.name}/에 둘 수 없는 항목: {names - allowed}"


def test_names_are_snake_case() -> None:
    bad = [
        str(p.relative_to(APP_DIR))
        for p in APP_DIR.rglob("*")
        if "__pycache__" not in p.parts
        and not p.name.startswith(".")
        and p.name != "__init__.py"
        and not SNAKE_CASE.match(p.stem)
    ]

    assert not bad, f"폴더와 파일 이름은 소문자 snake_case로 쓴다: {bad}"


@pytest.mark.parametrize("router", source_files("*_router.py"), ids=lambda p: p.name)
def test_router_does_not_touch_db_directly(router: Path) -> None:
    tree = ast.parse(router.read_text())
    session_calls = [
        f"session.{node.func.attr}() (line {node.lineno})"
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "session"
    ]
    db_imports = {
        name
        for name in imported_modules(router)
        if name.split(".")[0] in {"sqlmodel", "sqlalchemy"}
    }

    assert not session_calls, (
        f"router에서 DB를 직접 쓰지 말고 crud 함수를 호출한다: {session_calls}"
    )
    assert not db_imports, f"router는 sqlmodel/sqlalchemy를 import하지 않는다: {db_imports}"


@pytest.mark.parametrize("crud", source_files("*_crud.py"), ids=lambda p: p.name)
def test_crud_does_not_depend_on_http(crud: Path) -> None:
    http_imports = {
        name for name in imported_modules(crud) if name.split(".")[0] in {"fastapi", "starlette"}
    }

    assert not http_imports, f"crud는 HTTP를 모른다. ...Error 예외를 쓴다: {http_imports}"
