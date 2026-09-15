# claude_harness

React(프론트엔드) + FastAPI(백엔드)로 만드는 웹 서비스. 첫 기능은 관리자가 로그인해서 사용자 계정을 관리하는 관리자 페이지(`/admin`)이며, 프로젝트는 계속 커진다. 로그인은 관리자와 일반 사용자가 같은 화면과 API를 쓰고, 로그인 후 `role`에 따라 화면이 나뉜다.

기능 작업 전에 [docs/spec.md](docs/spec.md)를 읽는다. 데이터 모델, API, 화면, 구현 순서가 정리되어 있다.

## 구조

- `backend/`: FastAPI 앱. uv로 관리하며 Python 3.12를 쓴다. 파일 배치와 백엔드 규칙은 [backend/CLAUDE.md](backend/CLAUDE.md)를 따른다.
  - 모든 API 경로는 `/api`로 시작하고, 관리자 전용 API는 `/api/admin`으로 시작한다.
  - `alembic/versions/`: DB 마이그레이션
- `frontend/`: Vite 6 + React 19 + TypeScript + Sass. 파일 배치와 프론트엔드 규칙은 [frontend/CLAUDE.md](frontend/CLAUDE.md)를 따른다.
  - 개발 서버가 `/api` 요청을 `http://localhost:8000`으로 프록시한다.
- DB: 로컬 PostgreSQL 18 (Postgres.app, `localhost:5432`). 개발 DB `naralab_xepy`, 테스트 DB `harness_test`. 접속 정보는 `backend/.env`에서 읽는다.
  - 개발 DB의 관리자 계정은 `backend/.env`의 `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`에 있다. 개발 서버에서 로그인을 직접 확인할 때 쓰고, 값을 문서나 코드에 옮겨 적지 않는다.
- `docs/spec.md`: 기능 스펙
- `scripts/check.sh`: 백엔드와 프론트엔드 전체 검증

## 명령

백엔드 (`backend/`에서):

- 실행: `uv run uvicorn app.main:app --reload` (포트 8000)
- 테스트: `uv run pytest`
- 린트/포맷: `uv run ruff check --fix . && uv run ruff format .`
- 의존성 추가: `uv add <pkg>` (개발용은 `uv add --dev <pkg>`)
- 마이그레이션 생성: `uv run alembic revision --autogenerate -m "<설명>"` → 생성된 파일을 읽고 확인한다.
- 마이그레이션 적용(개발 DB): `uv run alembic upgrade head`
- 관리자 계정 생성(개발 DB): `uv run python -m app.utils.cli create-admin --email <이메일> --name <이름>` (비밀번호는 프롬프트로 입력)

테이블 모델을 바꾸면 반드시 마이그레이션도 만든다. 빠뜨리면 `tests/test_migrations.py`가 실패한다. 테스트는 Postgres.app이 실행 중이어야 돌아간다.

프론트엔드 (`frontend/`에서):

- 실행: `npm run dev` (포트 3000). 로그인 등 API를 쓰려면 백엔드도 8000 포트에서 실행 중이어야 한다.
- 테스트: `npm test`
- 린트: `npm run lint`
- 빌드(타입 체크 포함): `npm run build`

## 작업 규칙

- 작업이 끝났다고 보고하기 전에 `./scripts/check.sh`를 실행해 통과를 확인한다. 실패하면 고치고, 고치지 못했으면 실패 출력을 그대로 보고한다.
- 새 API 엔드포인트에는 pytest 테스트를, 새 UI 동작에는 vitest 테스트를 함께 추가한다.
- 작업이 끝나면 `./scripts/check.sh` 통과를 확인한 뒤 커밋하고 `develop` 브랜치에 push한다.
  - `develop` 브랜치에서만 작업한다. `main`에는 커밋하거나 push하지 않는다.
  - 검증이 실패한 상태로는 커밋하지 않는다. `git push --force`는 쓰지 않는다.
  - `backend/.env` 같은 비밀 파일은 커밋하지 않는다.
- 스펙과 다르게 구현해야 할 이유가 생기면 먼저 사용자에게 묻고, 합의되면 `docs/spec.md`를 고친다.
- 시스템 Python(3.9)이나 pip를 쓰지 않는다. Python은 항상 `uv run`으로 실행한다.
- 로컬 Node가 20.13이므로 Node 20.19 이상을 요구하는 패키지(예: Vite 7+, jsdom 26+, react-router 8+, sass 1.100+)는 설치하지 않는다.
