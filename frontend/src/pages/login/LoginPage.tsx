import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { ApiError } from '../../shared/api/client'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { homePathFor, useAuth } from '../../shared/hooks/useAuth'
import styles from './LoginPage.module.scss'

const UNKNOWN_ERROR = '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.'

/** 관리자와 일반 사용자가 함께 쓰는 로그인 화면. 로그인하면 role별 첫 화면으로 이동한다. */
export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <LoadingScreen />
  }
  if (user) {
    return <Navigate to={homePathFor(user.role)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      // 성공하면 user가 채워지고, 위의 Navigate가 첫 화면으로 보낸다.
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? err.message : UNKNOWN_ERROR)
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>로그인</h1>
        <label className={styles.field}>
          <span className={styles.label}>이메일</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>비밀번호</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </main>
  )
}
