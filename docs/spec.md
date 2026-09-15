# 관리자 페이지 스펙

## 목표

사용자가 로그인하는 웹 서비스의 첫 기능. 관리자는 로그인 후 사용자 계정을 조회, 추가, 수정, 삭제한다.

## 기술 선택

- DB: 로컬 PostgreSQL 18 (Postgres.app, `localhost:5432`), SQLModel, Alembic 마이그레이션, psycopg 3
- 인증: 이메일 + 비밀번호. 비밀번호는 argon2로 해시(pwdlib). JWT를 httpOnly 쿠키로 전달
- 설정: pydantic-settings로 `backend/.env`에서 읽음
- 프론트엔드: Sass 1.99.x (CSS Modules), react-router 7

## 데이터 모델: User

| 필드            | 타입              | 설명                          |
| --------------- | ----------------- | ----------------------------- |
| `id`            | int, PK           |                               |
| `email`         | str, unique       | 로그인 ID. 소문자로 저장      |
| `name`          | str               |                               |
| `password_hash` | str               | API 응답에 절대 포함하지 않음 |
| `role`          | `admin` \| `user` |                               |
| `is_active`     | bool, 기본 true   | false면 로그인 불가           |
| `last_login_at` | datetime (UTC), null 허용 | 마지막 로그인 성공 시각. 로그인해도 `updated_at`은 바뀌지 않음 |
| `created_at`    | datetime (UTC)    |                               |
| `updated_at`    | datetime (UTC)    |                               |

## 로그인과 권한

- 관리자(`admin`)와 일반 사용자(`user`)는 같은 로그인 화면(`/login`)과 같은 로그인 API(`POST /api/auth/login`)를 쓴다.
- `is_active=true`인 사용자만 로그인할 수 있다.
- 로그인 후 `role`에 따라 화면이 나뉜다. `admin`은 `/admin/users`, `user`는 `/mypage`로 간다. `/mypage`는 지금은 준비 중 화면이며 내용은 나중에 정한다.
- 로그인 실패는 이유(없는 이메일, 틀린 비밀번호, 비활성 계정)와 관계없이 같은 메시지의 401로 응답한다. 가입 여부를 추측할 수 없게 하기 위해서다.
- `/api/admin`으로 시작하는 API는 `admin`만 호출할 수 있다. 로그인하지 않았으면 401, `admin`이 아니면 403.
- 로그인 후 계정이 비활성화되면 모든 API에서 401로 응답한다.
- 로그인 토큰의 유효 시간은 8시간(`JWT_EXPIRE_MINUTES`)이다.
- 첫 관리자 계정은 CLI로 만든다: `uv run python -m app.utils.cli create-admin --email <이메일> --name <이름>` (비밀번호는 입력 프롬프트로 받는다)
- 관리자는 자기 자신을 삭제, 비활성화, `user`로 변경할 수 없다(400). 관리자가 0명이 되는 상황을 막기 위해서다.

## API

모든 경로는 `/api`로 시작하고, 관리자 전용 API는 `/api/admin`으로 시작한다.
상태 코드: 로그인 필요 401, 권한 없음 403, 없는 리소스 404, 이메일 중복 409, 입력 오류 422, 허용되지 않는 변경(자기 자신 삭제 등) 400.

| 메서드 | 경로                    | 설명                                                                                          |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`       | 모든 활성 사용자. `{email, password}` → 쿠키 설정, `last_login_at` 기록, 로그인한 사용자(`role` 포함) 반환 |
| POST   | `/api/auth/logout`      | 쿠키 삭제 → 204                                                                               |
| GET    | `/api/auth/me`          | 현재 로그인한 사용자(`role` 포함). 프론트엔드가 이 값으로 화면을 나눈다                        |
| GET    | `/api/admin/users`      | 목록. `q`(이메일/이름 검색), `page`(기본 1), `size`(기본 20, 최대 100) → `{items, total}`, id 순 |
| POST   | `/api/admin/users`      | 생성 `{email, name, password, role?}` → 201. 비밀번호 8자 이상, `role` 기본 `user`            |
| GET    | `/api/admin/users/{id}` | 상세                                                                                          |
| PATCH  | `/api/admin/users/{id}` | 수정 `{name?, role?, is_active?, password?}`. 보내지 않은 필드는 바꾸지 않는다                |
| DELETE | `/api/admin/users/{id}` | 삭제 → 204                                                                                    |

## 화면

| 경로               | 내용                                                        |
| ------------------ | ----------------------------------------------------------- |
| `/login`           | 공통 로그인 폼. 이미 로그인 상태면 `role`에 맞는 첫 화면으로 이동 |
| `/admin/users`     | 사용자 표(No., 이름, 이메일, 역할, 상태, 마지막 로그인, 가입일), 검색, 이전/다음 페이지. No.는 페이지를 넘어 이어진다(2페이지 첫 줄은 21). 마지막 로그인이 없으면 `-`. 검색어와 페이지는 URL 쿼리(`?q=&page=`)에 유지 |
| (팝업) 사용자 추가 | 목록의 **사용자 추가** 버튼으로 목록 화면 위에 연다. 별도 경로는 없다. 이메일, 이름, 비밀번호, 역할 입력. 제목 줄을 끌어 옮길 수 있고 Esc, 닫기, 취소로 닫는다. 추가에 성공하면 팝업을 닫고 안내 문구와 함께 목록을 다시 불러온다 |
| `/admin/users/:id` | 수정 폼(이메일은 읽기 전용, 이름, 역할, 활성 여부, 새 비밀번호). 바꾼 항목만 저장. 삭제 버튼은 확인 후 삭제하고 목록으로 이동. 자기 자신이면 역할, 활성 여부, 삭제를 막는다 |
| `/mypage`          | 일반 사용자 첫 화면. 지금은 준비 중 안내와 로그아웃 버튼만 있다 |

- `/`는 로그인 상태와 `role`에 맞는 첫 화면으로 보낸다. 로그인하지 않았으면 `/login`.
- `/admin`으로 들어오면 `/admin/users`로 보낸다.
- 로그인하지 않은 상태로 `/admin`, `/mypage` 경로에 들어가면 `/login`으로 보낸다.
- `user`가 `/admin` 경로에 들어가면 `/mypage`로 보낸다.
- 정의되지 않은 경로는 `/`로 보낸다.

## 테스트

- 개발 DB는 `naralab_xepy`, 테스트 DB는 `harness_test`다. 계정은 `naralab_xepy`, 비밀번호 없음.
- 백엔드 테스트는 개발 DB를 절대 건드리지 않는다. `harness_test`가 없으면 테스트 픽스처가 만들고, 테스트마다 테이블을 비운다.
- 테스트 실행 전에 Postgres.app이 실행 중이어야 한다.

## 구현 순서

각 단계는 테스트를 포함하고, `./scripts/check.sh` 통과를 확인한 뒤 `develop` 브랜치에 커밋, push하고 멈춘다.

1. (완료) DB 기반: DB 연결 설정, User 모델, Alembic, 테스트 DB 픽스처
2. (완료) 인증 API: login/logout/me, create-admin CLI
3. (완료) 사용자 CRUD API (`/api/admin/users`)
4. (완료) 프론트엔드 기반: Sass, 라우터, 공통 로그인 화면, `role`별 화면 분기, 인증 가드, `/mypage` 준비 중 화면
5. (완료) 관리자 사용자 목록/추가/수정/삭제 화면
6. (완료) 사용자 목록 보강: No. 열, 마지막 로그인 시간(`last_login_at`), 사용자 추가를 팝업으로 변경

## 이번 범위에서 제외

회원가입, 비밀번호 재설정 메일, 세분화된 권한, 감사 로그
