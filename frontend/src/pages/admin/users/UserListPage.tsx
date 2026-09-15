import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { USERS_PAGE_SIZE, listUsers } from '../../../shared/api/adminUsers'
import type { UserListResponse } from '../../../shared/api/types'
import { useApiErrorMessage } from '../../../shared/hooks/useApiError'
import { UserCreateDialog } from './components/UserCreateDialog'
import { UserEditDialog } from './components/UserEditDialog'
import { ROLE_LABELS, formatDate, formatDateTime } from './constants'
import styles from './UserListPage.module.scss'

/** 지금 열려 있는 팝업 */
type OpenDialog = { kind: 'create' } | { kind: 'edit'; userId: number } | null

function listParams(q: string, page: number): Record<string, string> {
  return {
    ...(q ? { q } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  }
}

/**
 * 사용자 목록. 검색어와 페이지는 URL(?q=&page=)에 담아 새로고침해도 유지한다.
 * 사용자 추가와 수정은 이 화면 위에 뜨는 팝업(UserCreateDialog, UserEditDialog)으로 한다.
 */
export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const toMessage = useApiErrorMessage()

  const [draft, setDraft] = useState(q)
  const [result, setResult] = useState<UserListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  // 값이 바뀌면 같은 검색어와 페이지로 목록을 다시 불러온다.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setDraft(q)
  }, [q])

  useEffect(() => {
    let cancelled = false
    setError(null)
    listUsers({ q, page })
      .then((data) => {
        if (cancelled) {
          return
        }
        const lastPage = Math.max(1, Math.ceil(data.total / USERS_PAGE_SIZE))
        if (page > lastPage) {
          // 마지막 페이지의 사용자를 모두 지우면 빈 페이지가 되므로 마지막 페이지로 옮긴다.
          setSearchParams(listParams(q, lastPage), { replace: true })
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
  }, [q, page, reloadKey, toMessage, setSearchParams])

  const closeDialog = useCallback(() => {
    setDialog(null)
  }, [])

  const finishDialog = useCallback((message: string) => {
    setDialog(null)
    setNotice(message)
    setReloadKey((key) => key + 1)
  }, [])

  function openDialog(next: Exclude<OpenDialog, null>) {
    setNotice(null)
    setDialog(next)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    setSearchParams(listParams(draft.trim(), 1))
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / USERS_PAGE_SIZE)) : 1
  const firstRowNumber = (page - 1) * USERS_PAGE_SIZE + 1

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

      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
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
              {q ? `'${q}'에 해당하는 사용자가 없습니다.` : '사용자가 없습니다.'}
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
                    <td className={styles.indexColumn}>{firstRowNumber + index}</td>
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
              onClick={() => setSearchParams(listParams(q, page - 1))}
              disabled={page <= 1}
            >
              이전
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setSearchParams(listParams(q, page + 1))}
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
