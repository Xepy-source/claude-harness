#!/usr/bin/env bash
# 전체 검증. 사람과 에이전트가 같은 명령으로 "완료"를 판단한다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== backend: ruff =="
cd "$ROOT/backend"
uv run ruff check .
uv run ruff format --check .

echo "== backend: pytest =="
uv run pytest -q

echo "== frontend: eslint =="
cd "$ROOT/frontend"
npm run lint --silent

echo "== frontend: vitest =="
npm test --silent

echo "== frontend: build =="
npm run build --silent

echo "All checks passed."
