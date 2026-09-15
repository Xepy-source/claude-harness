import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { USERS_PAGE_SIZE, listUsers } from '../../../shared/api/adminUsers'
import type { Role, UserListResponse } from '../../../shared/api/types'
import { useApiErrorMessage } from '../../../shared/hooks/useApiError'
import { UserCreateDialog } from './components/UserCreateDialog'
import { UserEditDialog } from './components/UserEditDialog'
import { ROLE_LABELS, ROLE_OPTIONS, formatDate, formatDateTime } from './constants'
import styles from './UserListPage.module.scss'

/** 추가, 저장, 삭제 안내 문구를 보여주는 시간 */
const NOTICE_DURATION_MS = 10_000

/** 지금 열려 있는 팝업 */
type OpenDialog = { kind: 'create' } | { kind: 'edit'; userId: number } | null

/** URL의 status 값과 API의 is_active 값 */
const STATUS_FILTERS = { active: true, inactive: false } as const
type StatusFilter = keyof typeof STATUS_FILTERS

/** URL 쿼리(?q=&role=&status=&page=)에 담는 목록 상태. 빈 문자열은 거르지 않음을 뜻한다. */
interface ListState {
  q: string
  role: Role | ''
  status: StatusFilter | ''
  page: number
}

function readListState(params: URLSearchParams): ListState {
  const role = params.get('role') ?? ''
  const status = params.get('status') ?? ''
  return {
    q: params.get('q') ?? '',
    // 알 수 없는 값은 무시하고 전체로 본다.
    role: ROLE_OPTIONS.includes(role as Role) ? (role as Role) : '',
    status: status in STATUS_FILTERS ? (status as StatusFilter) : '',
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

function listParams({ q, role, status, page }: ListState): Record<string, string> {
  return {
    ...(q ? { q } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  }
}

/**
 * 사용자 목록. 최근 가입자부터 보여준다.
 * 검색어, 역할/상태 필터, 페이지는 URL 쿼리에 담아 새로고침해도 유지한다.
 * 사용자 추가와 수정은 이 화면 위에 뜨는 팝업(UserCreateDialog, UserEditDialog)으로 한다.
 */
export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const listState = readListState(searchParams)
  const { q, role, status, page } = listState
  const toMessage = useApiErrorMessage()

  const [draft, setDraft] = useState(q)
  const [result, setResult] = useState<UserListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 같은 문구가 다시 떠도 시간을 새로 세도록 매번 새 객체로 넣는다.
  const [notice, setNotice] = useState<{ text: string } | null>(null)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  // 값이 바뀌면 같은 조건으로 목록을 다시 불러온다.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setDraft(q)
  }, [q])

  useEffect(() => {
    if (!notice) {
      return
    }
    const timer = window.setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    let cancelled = false
    setError(null)
    listUsers({ q, role: role || undefined, isActive: status ? STATUS_FILTERS[status] : undefined, page })
      .then((data) => {
        if (cancelled) {
          return
        }
        const lastPage = Math.max(1, Math.ceil(data.total / USERS_PAGE_SIZE))
        if (page > lastPage) {
          // 마지막 페이지의 사용자를 모두 지우면 빈 페이지가 되므로 마지막 페이지로 옮긴다.
          setSearchParams(listParams({ q, role, status, page: lastPage }), { replace: true })
          return
        }
        setResult(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(toMessage(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [q, role, status, page, reloadKey, toMessage, setSearchParams])

  const closeDialog = useCallback(() => {
    setDialog(null)
  }, [])

  const finishDialog = useCallback((message: string) => {
    setDialog(null)
    setNotice({ text: message })
    setReloadKey((key) => key + 1)
  }, [])

  function openDialog(next: Exclude<OpenDialog, null>) {
    setNotice(null)
    setDialog(next)
  }

  /** 검색어나 필터를 바꾸면 첫 페이지부터 다시 본다. */
  function applyConditions(changes: Partial<Omit<ListState, 'page'>>) {
    setNotice(null)
    setSearchParams(listParams({ ...listState, ...changes, page: 1 }))
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    applyConditions({ q: draft.trim() })
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / USERS_PAGE_SIZE)) : 1
  // No.는 전체 개수부터 거꾸로 센다. 가장 오래된 가입자가 1번이다.
  const firstRowNumber = result ? result.total - (page - 1) * USERS_PAGE_SIZE : 0
  const filtered = Boolean(q || role || status)

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>사용자 관리</h1>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => openDialog({ kind: 'create' })}
        >
          사용자 추가
        </button>
      </div>

      <div className={styles.toolbar}>
        <form className={styles.search} role="search" onSubmit={handleSearch}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="이메일 또는 이름 검색"
            placeholder="이메일 또는 이름"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className={styles.searchButton}>
            검색
          </button>
        </form>
        <div className={styles.filters}>
          <select
            className={styles.filter}
            aria-label="역할 필터"
            value={role}
            onChange={(event) => applyConditions({ role: event.target.value as Role | '' })}
          >
            <option value="">모든 역할</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
          <select
            className={styles.filter}
            aria-label="상태 필터"
            value={status}
            onChange={(event) =>
              applyConditions({ status: event.target.value as StatusFilter | '' })
            }
          >
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>
      </div>

      {notice && (
        <p role="status" className={styles.notice}>
          {notice.text}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!result && !error && <p className={styles.muted}>불러오는 중...</p>}

      {result && (
        <>
          <p className={styles.muted}>총 {result.total}명</p>
          {result.items.length === 0 ? (
            <p className={styles.empty}>
              {filtered ? '조건에 맞는 사용자가 없습니다.' : '사용자가 없습니다.'}
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.indexColumn}>No.</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>마지막 로그인</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user, index) => (
                  <tr key={user.id}>
                    <td className={styles.indexColumn}>{firstRowNumber - index}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.nameButton}
                        onClick={() => openDialog({ kind: 'edit', userId: user.id })}
                      >
                        {user.name}
                      </button>
                    </td>
                    <td>{user.email}</td>
                    <td>{ROLE_LABELS[user.role]}</td>
                    <td>
                      <span className={user.is_active ? styles.active : styles.inactive}>
                        {user.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>{user.last_login_at ? formatDateTime(user.last_login_at) : '-'}</td>
                    <td>{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <nav className={styles.pagination} aria-label="페이지">
            <button
              type="button"
              onClick={() => setSearchParams(listParams({ ...listState, page: page - 1 }))}
              disabled={page <= 1}
            >
              이전
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setSearchParams(listParams({ ...listState, page: page + 1 }))}
              disabled={page >= totalPages}
            >
              다음
            </button>
          </nav>
        </>
      )}

      {dialog?.kind === 'create' && (
        <UserCreateDialog
          onClose={closeDialog}
          onCreated={(user) => finishDialog(`${user.name} 사용자를 추가했습니다.`)}
        />
      )}
      {dialog?.kind === 'edit' && (
        <UserEditDialog
          userId={dialog.userId}
          onClose={closeDialog}
          onSaved={(user) => finishDialog(`${user.name} 사용자 정보를 저장했습니다.`)}
          onDeleted={(user) => finishDialog(`${user.name} 사용자를 삭제했습니다.`)}
        />
      )}
    </section>
  )
}
