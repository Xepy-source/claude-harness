import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { createUser } from '../../../shared/api/adminUsers'
import type { Role } from '../../../shared/api/types'
import { useApiErrorMessage } from '../../../shared/hooks/useApiError'
import { FormField } from './components/FormField'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, ROLE_LABELS, ROLE_OPTIONS } from './constants'
import styles from './UserCreatePage.module.scss'

/** 사용자 추가. 성공하면 목록으로 돌아간다. */
export function UserCreatePage() {
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createUser({ email, name: name.trim(), password, role })
      navigate('/admin/users')
    } catch (err) {
      setError(toMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <Link to="/admin/users" className={styles.back}>
        ← 목록으로
      </Link>
      <h1 className={styles.title}>사용자 추가</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="이메일">
          <input
            className={styles.input}
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormField label="이름">
          <input
            className={styles.input}
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label="비밀번호" hint={`${PASSWORD_MIN_LENGTH}자 이상`}>
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>
        <FormField label="역할">
          <select
            className={styles.input}
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
        </FormField>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={submitting}>
            {submitting ? '추가 중...' : '추가'}
          </button>
          <Link to="/admin/users" className={styles.secondary}>
            취소
          </Link>
        </div>
      </form>
    </section>
  )
}
