import { useState, type FormEvent } from 'react'
import { createUser } from '../../../../shared/api/adminUsers'
import type { Role, User } from '../../../../shared/api/types'
import { useApiErrorMessage } from '../../../../shared/hooks/useApiError'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, ROLE_LABELS, ROLE_OPTIONS } from '../constants'
import { Dialog } from './Dialog'
import { FormField } from './FormField'
import styles from './UserCreateDialog.module.scss'

interface UserCreateDialogProps {
  onClose: () => void
  /** 추가에 성공하면 만든 사용자와 함께 호출된다. 팝업을 닫는 것은 부모가 한다. */
  onCreated: (user: User) => void
}

/** 사용자 목록 화면 위에 뜨는 사용자 추가 팝업 */
export function UserCreateDialog({ onClose, onCreated }: UserCreateDialogProps) {
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
      onCreated(await createUser({ email, name: name.trim(), password, role }))
    } catch (err) {
      setError(toMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Dialog title="사용자 추가" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField label="이메일">
          <input
            className={styles.input}
            type="email"
            required
            autoFocus
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
          <button type="button" className={styles.secondary} onClick={onClose}>
            취소
          </button>
          <button type="submit" className={styles.primary} disabled={submitting}>
            {submitting ? '추가 중...' : '추가'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
