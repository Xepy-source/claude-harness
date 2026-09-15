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
```

### 파일 역할

- `<기능>_router.py`: 프론트엔드 요청을 직접 받는 함수. `APIRouter`를 정의하고 요청 검증, 응답 변환, HTTP 상태 코드만 다룬다. DB 쿼리를 직접 쓰지 않고 crud 함수를 호출한다.
- `<기능>_crud.py`: DB에 직접 접근하는 함수와 그에 딸린 규칙 판단(예: 이메일 중복 확인, 관리자 자기 삭제 금지). HTTP를 모르므로 `HTTPException`을 쓰지 않고, 규칙 위반은 `...Error` 예외로 알린다. router가 이 예외를 HTTP 상태 코드로 바꾼다.
- `<기능>_schema.py`: 요청/응답 클래스. 예: `LoginRequest`, `UserPublic`. DB 테이블 모델은 여기 두지 않고 `db/models.py`에 둔다.

### 규칙

- 기능 폴더에는 `__init__.py`와 위 세 파일만 둔다. 세 파일 중 필요 없는 파일은 만들지 않는다. 예: 자기 테이블이 없는 `auth/`에는 `auth_crud.py`가 없어도 된다.
- 파일 이름의 `<기능>`은 폴더 이름과 같게 한다. 예: `user/user_router.py`
- 폴더와 파일 이름은 소문자 snake_case로 쓴다.
- `app/` 바로 아래에는 `main.py`와 `__init__.py`만 둔다. 그 외 Python 파일은 기능 폴더, `db/`, `utils/` 중 하나에 둔다.
- 다른 기능의 DB 접근이 필요하면 그 기능의 crud 함수를 import한다. 예: `auth_router.py`가 `user_crud.get_user_by_email`을 쓴다.

> 현재 코드(`app/auth.py`, `app/users.py`, `app/db.py` 등)는 아직 이 구조로 옮기지 않은 상태다. 옮기기 전까지 새 파일은 이 규칙대로 만든다.

## API 규칙

- 관리 API는 `CurrentAdmin` 의존성(auth 기능)으로 보호하고, 로그인하지 않은 요청이 401을 받는지 테스트한다.
- API 응답에는 테이블 모델(`User`)을 그대로 내보내지 않고 `response_model=UserPublic` 같은 schema 클래스를 쓴다. `password_hash`가 노출되면 안 된다.

## 테스트 픽스처 (`tests/conftest.py`)

- `session`: 테스트 DB 세션. 테스트가 끝나면 테이블을 비운다.
- `client`: 로그인하지 않은 API 클라이언트
- `admin_client`: 관리자로 로그인한 API 클라이언트 (`admin`, `admin_password` 픽스처와 함께 쓴다)
