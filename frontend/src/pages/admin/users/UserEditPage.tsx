import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  deleteUser,
  getUser,
  updateUser,
  type UserUpdateInput,
} from '../../../shared/api/adminUsers'
import type { Role, User } from '../../../shared/api/types'
import { useApiErrorMessage } from '../../../shared/hooks/useApiError'
import { useAuth } from '../../../shared/hooks/useAuth'
import { FormField } from './components/FormField'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, ROLE_LABELS, ROLE_OPTIONS } from './constants'
import styles from './UserEditPage.module.scss'

const NOT_FOUND = '사용자를 찾을 수 없습니다.'

/** 사용자 수정과 삭제. 바꾼 항목만 PATCH로 보낸다. */
export function UserEditPage() {
  const { userId } = useParams()
  const id = Number(userId)
  const invalidId = !Number.isInteger(id) || id < 1
  const navigate = useNavigate()
  const { user: me, refresh } = useAuth()
  const toMessage = useApiErrorMessage()

  const [loaded, setLoaded] = useState<User | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [isActive, setIsActive] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const fillForm = useCallback((user: User) => {
    setLoaded(user)
    setName(user.name)
    setRole(user.role)
    setIsActive(user.is_active)
    setPassword('')
  }, [])

  useEffect(() => {
    if (invalidId) {
      return
    }
    let cancelled = false
    getUser(id)
      .then((user) => {
        if (!cancelled) {
          fillForm(user)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(toMessage(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, invalidId, fillForm, toMessage])

  const backLink = (
    <Link to="/admin/users" className={styles.back}>
      ← 목록으로
    </Link>
  )

  if (invalidId || loadError) {
    return (
      <section className={styles.page}>
        {backLink}
        <p role="alert" className={styles.error}>
          {loadError ?? NOT_FOUND}
        </p>
      </section>
    )
  }
  if (!loaded) {
    return <p className={styles.muted}>불러오는 중...</p>
  }

  const current = loaded
  // 자기 자신은 역할, 활성 상태를 바꾸거나 삭제할 수 없다 (백엔드도 400으로 막는다).
  const isSelf = me?.id === current.id

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const changes: UserUpdateInput = {}
    if (name.trim() !== current.name) {
      changes.name = name.trim()
    }
    if (role !== current.role) {
      changes.role = role
    }
    if (isActive !== current.is_active) {
      changes.is_active = isActive
    }
    if (password) {
      changes.password = password
    }

    setError(null)
    if (Object.keys(changes).length === 0) {
      setNotice('바뀐 내용이 없습니다.')
      return
    }

    setNotice(null)
    setPending(true)
    try {
      fillForm(await updateUser(current.id, changes))
      setNotice('저장했습니다.')
      if (isSelf) {
        // 상단에 보이는 내 이름을 새로 고친다.
        void refresh().catch(() => {})
      }
    } catch (err) {
      setError(toMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`${current.name}(${current.email}) 사용자를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return
    }
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      await deleteUser(current.id)
      navigate('/admin/users', { replace: true })
    } catch (err) {
      setError(toMessage(err))
      setPending(false)
    }
  }

  return (
    <section className={styles.page}>
      {backLink}
      <h1 className={styles.title}>사용자 수정</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="이메일">
          <input className={styles.input} type="email" value={current.email} readOnly />
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
        <FormField label="역할">
          <select
            className={styles.input}
            value={role}
            disabled={isSelf}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
        </FormField>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isActive}
            disabled={isSelf}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          활성 계정
        </label>
        <FormField
          label="새 비밀번호"
          hint={`바꿀 때만 입력하세요. ${PASSWORD_MIN_LENGTH}자 이상`}
        >
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>

        {isSelf && (
          <p className={styles.hint}>
            자기 자신은 역할과 활성 상태를 바꾸거나 삭제할 수 없습니다.
          </p>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={pending}>
            저장
          </button>
          <button
            type="button"
            className={styles.danger}
            disabled={pending || isSelf}
            onClick={handleDelete}
          >
            삭제
          </button>
        </div>
      </form>
    </section>
  )
}
