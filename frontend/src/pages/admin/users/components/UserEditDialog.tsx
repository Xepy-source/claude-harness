import { useEffect, useState, type FormEvent } from 'react'
import { deleteUser, getUser, updateUser, type UserUpdateInput } from '../../../../shared/api/adminUsers'
import type { Role, User } from '../../../../shared/api/types'
import { useApiErrorMessage } from '../../../../shared/hooks/useApiError'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, ROLE_LABELS, ROLE_OPTIONS } from '../constants'
import { Dialog } from './Dialog'
import { FormField } from './FormField'
import styles from './UserEditDialog.module.scss'

interface UserEditDialogProps {
  userId: number
  onClose: () => void
  /** 저장에 성공하면 저장된 사용자와 함께 호출된다. 팝업을 닫는 것은 부모가 한다. */
  onSaved: (user: User) => void
  /** 삭제에 성공하면 지운 사용자와 함께 호출된다. 팝업을 닫는 것은 부모가 한다. */
  onDeleted: (user: User) => void
}

/** 사용자 목록 화면 위에 뜨는 사용자 수정/삭제 팝업. 바꾼 항목만 PATCH로 보낸다. */
export function UserEditDialog({ userId, onClose, onSaved, onDeleted }: UserEditDialogProps) {
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

  useEffect(() => {
    let cancelled = false
    getUser(userId)
      .then((user) => {
        if (!cancelled) {
          setLoaded(user)
          setName(user.name)
          setRole(user.role)
          setIsActive(user.is_active)
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
  }, [userId, toMessage])

  if (loadError || !loaded) {
    return (
      <Dialog title="사용자 수정" onClose={onClose}>
        {loadError ? (
          <p role="alert" className={styles.error}>
            {loadError}
          </p>
        ) : (
          <p className={styles.muted}>불러오는 중...</p>
        )}
      </Dialog>
    )
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
      const saved = await updateUser(current.id, changes)
      if (isSelf) {
        // 상단에 보이는 내 이름을 새로 고친다.
        void refresh().catch(() => {})
      }
      onSaved(saved)
    } catch (err) {
      setError(toMessage(err))
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
      onDeleted(current)
    } catch (err) {
      setError(toMessage(err))
      setPending(false)
    }
  }

  return (
    <Dialog title="사용자 수정" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="이메일">
          <input className={styles.input} type="email" value={current.email} readOnly />
        </FormField>
        <FormField label="이름">
          <input
            className={styles.input}
            required
            autoFocus
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
          <p className={styles.muted}>
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
          <button
            type="button"
            className={styles.danger}
            disabled={pending || isSelf}
            onClick={handleDelete}
          >
            삭제
          </button>
          <div className={styles.actionGroup}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              취소
            </button>
            <button type="submit" className={styles.primary} disabled={pending}>
              {pending ? '처리 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
