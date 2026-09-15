# 관리자 페이지 스펙

## 목표

관리자가 로그인해서 사용자 계정을 조회, 추가, 수정, 삭제하는 웹 페이지.

## 기술 선택

- DB: 로컬 PostgreSQL 18 (Postgres.app, `localhost:5432`), SQLModel, Alembic 마이그레이션, psycopg 3
- 인증: 이메일 + 비밀번호. 비밀번호는 argon2로 해시(pwdlib). JWT를 httpOnly 쿠키로 전달
- 설정: pydantic-settings로 `backend/.env`에서 읽음
- 프론트엔드: Sass 1.99.x (CSS Modules), react-router 7

## 데이터 모델: User

| 필드            | 타입                | 설명                                 |
| --------------- | ------------------- | ------------------------------------ |
| `id`            | int, PK             |                                      |
| `email`         | str, unique         | 로그인 ID. 소문자로 저장             |
| `name`          | str                 |                                      |
| `password_hash` | str                 | API 응답에 절대 포함하지 않음        |
| `role`          | `admin` \| `user`   |                                      |
| `is_active`     | bool, 기본 true     | false면 로그인 불가                  |
| `created_at`    | datetime (UTC)      |                                      |
| `updated_at`    | datetime (UTC)      |                                      |

## 권한

- `role=admin`이고 `is_active=true`인 사용자만 로그인하고 관리 API를 호출할 수 있다.
- 로그인 실패는 이유(없는 이메일, 틀린 비밀번호, 비활성 계정, 관리자 아님)와 관계없이 같은 메시지의 401로 응답한다. 가입 여부를 추측할 수 없게 하기 위해서다.
- 로그인 후 계정이 비활성화되면 401, `user`로 변경되면 403으로 응답한다.
- 로그인 토큰의 유효 시간은 8시간(`JWT_EXPIRE_MINUTES`)이다.
- 첫 관리자 계정은 CLI로 만든다: `uv run python -m app.cli create-admin --email <이메일> --name <이름>` (비밀번호는 입력 프롬프트로 받는다)
- 관리자는 자기 자신을 삭제, 비활성화, `user`로 변경할 수 없다. 관리자가 0명이 되는 상황을 막기 위해서다.

## API

모든 경로는 `/api`로 시작한다. 로그인 필요는 401, 권한 없음은 403, 없는 리소스는 404, 이메일 중복은 409, 입력 오류는 422.

| 메서드 | 경로               | 설명                                                              |
| ------ | ------------------ | ----------------------------------------------------------------- |
| POST   | `/api/auth/login`  | `{email, password}` → 쿠키 설정, 로그인한 사용자 반환             |
| POST   | `/api/auth/logout` | 쿠키 삭제                                                         |
| GET    | `/api/auth/me`     | 현재 로그인한 관리자                                              |
| GET    | `/api/users`       | 목록. `q`(이메일/이름 검색), `page`, `size`(기본 20) → `{items, total}` |
| POST   | `/api/users`       | 생성 `{email, name, password, role}`                              |
| GET    | `/api/users/{id}`  | 상세                                                              |
| PATCH  | `/api/users/{id}`  | 수정 `{name?, role?, is_active?, password?}`                      |
| DELETE | `/api/users/{id}`  | 삭제                                                              |

## 화면

관리자 화면은 모두 `/admin`으로 시작한다. 이후 다른 영역(예: `/mypage`)이 추가될 수 있다.

| 경로               | 내용                                                    |
| ------------------ | ------------------------------------------------------- |
| `/admin/login`     | 로그인 폼. 이미 로그인 상태면 `/admin/users`로 이동     |
| `/admin/users`     | 사용자 표, 검색, 페이지네이션, 추가 버튼                |
| `/admin/users/new` | 추가 폼                                                 |
| `/admin/users/:id` | 수정 폼, 삭제 버튼(확인 후 삭제)                        |

- `/admin`으로 들어오면 `/admin/users`로 보낸다.
- 로그인하지 않은 상태로 `/admin/login` 외의 `/admin` 경로에 들어가면 `/admin/login`으로 보낸다.

## 테스트

- 개발 DB는 `naralab_xepy`, 테스트 DB는 `harness_test`다. 계정은 `naralab_xepy`, 비밀번호 없음.
- 백엔드 테스트는 개발 DB를 절대 건드리지 않는다. `harness_test`가 없으면 테스트 픽스처가 만들고, 테스트마다 테이블을 비운다.
- 테스트 실행 전에 Postgres.app이 실행 중이어야 한다.

## 구현 순서

각 단계는 테스트를 포함하고, `./scripts/check.sh` 통과를 확인한 뒤 멈춘다. 커밋은 사용자가 변경을 검토한 뒤 직접 한다.

1. DB 기반: DB 연결 설정, User 모델, Alembic, 테스트 DB 픽스처
2. 인증 API: login/logout/me, create-admin CLI
3. 사용자 CRUD API
4. 프론트엔드 기반: Sass, 라우터, 로그인 화면, 인증 가드
5. 사용자 목록/추가/수정/삭제 화면

## 이번 범위에서 제외

회원가입, 비밀번호 재설정 메일, 세분화된 권한, 감사 로그
