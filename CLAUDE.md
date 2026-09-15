# claude_harness

React(프론트엔드) + FastAPI(백엔드) 웹 프로젝트.

## 구조

- `backend/`: FastAPI 앱. uv로 관리하며 Python 3.12를 쓴다.
  - `app/main.py`: 앱 진입점. 모든 API 경로는 `/api`로 시작한다.
  - `tests/`: pytest 테스트
- `frontend/`: Vite 6 + React 19 + TypeScript
  - 개발 서버가 `/api` 요청을 `http://localhost:8000`으로 프록시한다.
  - 테스트는 컴포넌트 옆에 `*.test.tsx`로 둔다.
- `scripts/check.sh`: 백엔드와 프론트엔드 전체 검증

## 명령

백엔드 (`backend/`에서):

- 실행: `uv run uvicorn app.main:app --reload` (포트 8000)
- 테스트: `uv run pytest`
- 린트/포맷: `uv run ruff check --fix . && uv run ruff format .`
- 의존성 추가: `uv add <pkg>` (개발용은 `uv add --dev <pkg>`)

프론트엔드 (`frontend/`에서):

- 실행: `npm run dev` (포트 3000)
- 테스트: `npm test`
- 린트: `npm run lint`
- 빌드(타입 체크 포함): `npm run build`

## 작업 규칙

- 작업이 끝났다고 보고하기 전에 `./scripts/check.sh`를 실행해 통과를 확인한다. 실패하면 고치고, 고치지 못했으면 실패 출력을 그대로 보고한다.
- 새 API 엔드포인트에는 pytest 테스트를, 새 UI 동작에는 vitest 테스트를 함께 추가한다.
- 시스템 Python(3.9)이나 pip를 쓰지 않는다. Python은 항상 `uv run`으로 실행한다.
- 로컬 Node가 20.13이므로 Node 20.19 이상을 요구하는 패키지(예: Vite 7+, jsdom 26+)는 설치하지 않는다.
