import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { USERS_PAGE_SIZE, listUsers } from '../../../shared/api/adminUsers'
import type { UserListResponse } from '../../../shared/api/types'
import { useApiErrorMessage } from '../../../shared/hooks/useApiError'
import { ROLE_LABELS, formatDate } from './constants'
import styles from './UserListPage.module.scss'

/** 사용자 목록. 검색어와 페이지는 URL(?q=&page=)에 담아 새로고침해도 유지한다. */
export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const toMessage = useApiErrorMessage()

  const [draft, setDraft] = useState(q)
  const [result, setResult] = useState<UserListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(q)
  }, [q])

  useEffect(() => {
    let cancelled = false
    setError(null)
    listUsers({ q, page })
      .then((data) => {
        if (!cancelled) {
          setResult(data)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(toMessage(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [q, page, toMessage])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = draft.trim()
    setSearchParams(next ? { q: next } : {})
  }

  function goToPage(nextPage: number) {
    setSearchParams(q ? { q, page: String(nextPage) } : { page: String(nextPage) })
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / USERS_PAGE_SIZE)) : 1

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>사용자 관리</h1>
        <Link to="/admin/users/new" className={styles.addButton}>
          사용자 추가
        </Link>
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
                  <th>이름</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/admin/users/${user.id}`} className={styles.nameLink}>
                        {user.name}
                      </Link>
                    </td>
                    <td>{user.email}</td>
                    <td>{ROLE_LABELS[user.role]}</td>
                    <td>
                      <span className={user.is_active ? styles.active : styles.inactive}>
                        {user.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <nav className={styles.pagination} aria-label="페이지">
            <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
              이전
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
              다음
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
