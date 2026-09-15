# 백엔드 규칙

## 파일 생성 규칙

### 폴더 구조

```
backend/app/
  main.py              앱 진입점. 각 기능의 라우터를 include한다.
  db/                  DB 관련 파일
    db.py              엔진, SessionDep
    models.py          모든 테이블 모델 (SQLModel, table=True)
  <기능>/              기능 하나당 폴더 하나. 예: user/, auth/
    <기능>_router.py
    <기능>_crud.py
    <기능>_schema.py
  utils/               기능 폴더와 db/에 속하지 않는 파일. 예: config.py, security.py, cli.py
backend/tests/
  test_<기능>_router.py, test_<기능>_crud.py
  test_<모듈>.py       db/, utils/ 파일의 테스트. 예: test_models.py, test_security.py
  test_structure.py    이 문서의 파일 생성 규칙을 검사한다
```

### 파일 역할

- `<기능>_router.py`: 프론트엔드 요청을 직접 받는 함수와 요청 처리용 의존성. `APIRouter`를 정의하고 요청 검증, 응답 변환, HTTP 상태 코드만 다룬다. DB는 crud 함수를 통해서만 쓴다.
- `<기능>_crud.py`: DB에 직접 접근하는 함수와 그에 딸린 규칙 판단(예: 이메일 중복 확인, 관리자 자기 삭제 금지). HTTP를 모르므로 `HTTPException`을 쓰지 않고, 규칙 위반은 `...Error` 예외로 알린다. router가 이 예외를 HTTP 상태 코드로 바꾼다.
- `<기능>_schema.py`: 요청/응답 클래스. 예: `LoginRequest`, `UserPublic`. DB 테이블 모델은 여기 두지 않고 `db/models.py`에 둔다.

### 규칙

- 기능 폴더에는 `__init__.py`와 위 세 파일만 둔다. 세 파일 중 필요 없는 파일은 만들지 않는다. 예: 자기 테이블이 없는 `auth/`에는 `auth_crud.py`가 없다.
- 파일 이름의 `<기능>`은 폴더 이름과 같게 한다. 예: `user/user_router.py`
- 폴더와 파일 이름은 소문자 snake_case로 쓴다.
- `app/` 바로 아래에는 `main.py`와 `__init__.py`만 둔다. 그 외 Python 파일은 기능 폴더, `db/`, `utils/` 중 하나에 둔다.
- 다른 기능의 DB 접근이 필요하면 그 기능의 crud 함수를 import한다. 예: `auth_router.py`가 `user_crud.get_user_by_email`을 쓴다.
- router 파일은 `sqlmodel`/`sqlalchemy`를 import하지 않고 `session.xxx()`를 직접 호출하지 않는다. crud 파일은 `fastapi`/`starlette`를 import하지 않는다.

위 규칙 중 폴더/파일 배치, 이름, router와 crud의 import는 `tests/test_structure.py`가 검사한다.

### 편집 주의

- `.py` 파일을 고치면 훅이 곧바로 `ruff check --fix`와 `ruff format`을 실행해 쓰지 않는 import를 지운다. 새 import는 그것을 쓰는 코드와 같은 편집에서 추가하거나, 코드를 먼저 넣고 import를 나중에 추가한다.

## API 규칙

- 관리자 전용 API는 경로를 `/api/admin`으로 시작하고, 라우터에 `dependencies=[Depends(get_current_admin)]`를 걸어 라우터 전체를 막는다. 핸들러에서 요청한 관리자가 필요하면 `CurrentAdmin`을 받는다. 로그인하지 않으면 401, 관리자가 아니면 403인지 테스트한다.
- 로그인한 사용자라면 누구나 쓰는 API는 `CurrentUser`로 받는다. `get_current_user`, `CurrentUser`, `get_current_admin`, `CurrentAdmin`은 `auth/auth_router.py`에 있다.
- API 응답에는 테이블 모델(`User`)을 그대로 내보내지 않고 `response_model=UserPublic` 같은 schema 클래스를 쓴다. `password_hash`가 노출되면 안 된다.

## 테스트 픽스처 (`tests/conftest.py`)

- `session`: 테스트 DB 세션. 테스트가 끝나면 테이블을 비운다.
- `client`: 로그인하지 않은 API 클라이언트
- `admin_client`: 관리자로 로그인한 API 클라이언트 (`admin`, `admin_password` 픽스처와 함께 쓴다)
- `user_client`: 일반 사용자로 로그인한 API 클라이언트 (`user`, `user_password` 픽스처와 함께 쓴다)
- 한 테스트에서 `admin_client`와 `user_client`를 같이 쓰지 않는다. 둘은 같은 클라이언트라서 나중에 로그인한 쪽의 쿠키가 남는다.
