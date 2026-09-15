# 프론트엔드 규칙

## 파일 생성 규칙

### 폴더 구조

```
frontend/src/
  main.tsx, App.tsx       진입점과 라우터 설정
  pages/
    login/                /login (관리자와 일반 사용자 공통)
      LoginPage.tsx
      LoginPage.module.scss
      LoginPage.test.tsx
      components/         이 페이지에서만 쓰는 하위 컴포넌트
    admin/                URL이 /admin으로 시작하는 페이지
      users/              /admin/users, /admin/users/:id
        UserListPage.tsx  목록. 사용자 추가는 이 화면 위의 팝업으로 한다
        UserEditPage.tsx
        constants.ts      이 폴더에서만 쓰는 상수와 작은 함수
        components/       이 폴더의 페이지들만 쓰는 하위 컴포넌트. 예: FormField.tsx, Dialog.tsx, UserCreateDialog.tsx
    mypage/               (예시) URL이 /mypage로 시작하는 페이지
  shared/                 두 페이지 이상이 함께 쓰는 코드
    components/           공통 컴포넌트. 예: 레이아웃, 버튼
    api/                  백엔드 API 호출 함수
    hooks/                공통 훅. 예: 로그인 상태 확인
    styles/               전역 스타일, Sass 변수와 믹스인
  test/                   테스트 도구: setup.ts, mockApi.ts, renderApp.tsx, structure.test.ts
```

### 규칙

- URL의 첫 경로(`/admin`, `/mypage` 등)마다 `pages/` 아래에 폴더를 하나 만든다. 첫 경로가 다른 페이지는 같은 폴더에 두지 않는다.
- 그 안에서 페이지마다 폴더를 하나 만든다. 같은 리소스를 다루는 페이지(목록, 추가, 수정)는 한 폴더에 둔다.
- 같은 페이지 폴더 안의 페이지들만 쓰는 하위 컴포넌트는 그 폴더의 `components/`에 둔다.
- 팝업은 `pages/admin/users/components/Dialog.tsx`를 쓴다(제목 줄을 끌어 이동, Esc/닫기 버튼으로 닫힘). 다른 페이지 폴더에서도 팝업이 필요해지면 `shared/components/`로 옮긴다.
- 두 페이지 이상에서 쓰는 코드는 `shared/`에 둔다. 한 페이지 폴더의 파일을 다른 페이지 폴더에서 import하지 않는다.
- 폴더 이름은 소문자, 컴포넌트 파일 이름은 PascalCase로 쓴다. 예: `pages/admin/users/UserListPage.tsx`
- 테스트는 대상 파일 옆에 `*.test.tsx`로 둔다.

### 라우팅

- 로그인은 `/login` 하나다. 로그인 후 `/api/auth/me`의 `role`에 따라 첫 화면을 나눈다. 자세한 경로 규칙은 `docs/spec.md`의 화면 절을 따른다.
- 백엔드 API 경로도 화면과 맞춘다. 관리자 화면(`/admin/...`)은 관리자 API(`/api/admin/...`)를 호출한다.
- 라우트는 `App.tsx`의 `AppRoutes`에 모두 정의한다. 관리자 화면은 `/admin` 라우트(`AdminLayout`) 아래 자식 라우트로 추가한다.
- 목록의 검색어, 페이지처럼 새로고침해도 유지해야 하는 화면 상태는 URL 쿼리(`useSearchParams`)에 둔다.

### 인증과 API

- 백엔드 API는 `shared/api/client.ts`의 `apiFetch`로만 호출한다. 기능별 호출 함수는 `shared/api/<기능>.ts`, 응답 타입은 `shared/api/types.ts`에 둔다.
- API 오류는 `ApiError`로 던져진다. `status`로 분기하고, 사용자에게는 `message`(백엔드 detail)나 일반 안내 문구를 보여준다.
- 로그인 상태는 `useAuth()`로 읽는다. 로그인이 필요한 화면은 라우터에서 `<RequireAuth>`로 감싸고, 관리자 전용이면 `role="admin"`을 준다.
- role별 첫 화면은 `shared/hooks/useAuth.ts`의 `homePathFor`가 정한다. 새 role이나 첫 화면이 바뀌면 여기만 고친다.
- 화면에 보여줄 API 오류 메시지는 `useApiErrorMessage()`가 돌려주는 함수로 만든다. 401이면 세션을 비워 로그인 화면으로 보내고, 5xx와 알 수 없는 오류는 일반 안내 문구가 된다. 로그인 화면만 예외로 직접 처리한다.
- 로그인한 사용자가 자기 정보를 바꿨으면 `useAuth().refresh()`로 내 정보를 다시 불러온다.

### 테스트 도구

- 화면 테스트는 `renderApp(path)`로 렌더링한다. 실제 앱과 같은 라우트와 인증 가드를 거친다.
- API 응답은 `mockApi({ 'GET /api/auth/me': meHandler(adminUser), ... })`로 흉내 낸다. 키에는 쿼리 문자열까지 정확히 쓴다(예: `'GET /api/admin/users?page=1&size=20'`). 등록하지 않은 요청은 에러가 난다.
- 테스트용 사용자는 `adminUser`, `normalUser`, `makeUser({...})`를 쓴다.
- `window.confirm` 같은 브라우저 함수는 `vi.spyOn(window, 'confirm').mockReturnValue(true)`로 바꾼다. `setup.ts`가 테스트마다 원래대로 되돌린다.
- `src/test/structure.test.ts`가 파일 생성 규칙(`.css` 금지, 폴더/파일 이름, 페이지 폴더 간 import 금지, `shared/`의 `pages/` import 금지)을 검사한다.

### 스타일

- CSS는 Sass로 작성한다. Tailwind는 쓰지 않는다.
- 컴포넌트마다 같은 이름의 CSS Module 파일(`*.module.scss`)을 둔다. 예: `UserListPage.tsx` → `UserListPage.module.scss`
- 전역 스타일과 공통 변수, 믹스인은 `shared/styles/`에 둔다.
- 입력칸과 버튼은 `shared/styles/_mixins.scss`의 `input`, `button`, `button-primary`, `button-danger` 믹스인으로 스타일을 입힌다. 믹스인을 쓰는 규칙 안에서는 자기 속성을 `@include`보다 먼저 쓴다 (Sass mixed-decls 경고 방지).
- `sass` 패키지는 1.99.x를 쓴다. 1.100 이상은 Node 20.19 이상이 필요하다.
