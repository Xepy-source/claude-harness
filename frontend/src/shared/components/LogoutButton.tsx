import { useAuth } from '../hooks/useAuth'
import styles from './LogoutButton.module.scss'

/** 로그아웃하면 인증 가드가 /login으로 보낸다. 서버 요청이 실패해도 화면에서는 로그아웃된다. */
export function LogoutButton() {
  const { logout } = useAuth()

  return (
    <button type="button" className={styles.button} onClick={() => void logout().catch(() => {})}>
      로그아웃
    </button>
  )
}
