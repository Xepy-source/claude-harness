import { LogoutButton } from '../../shared/components/LogoutButton'
import { useAuth } from '../../shared/hooks/useAuth'
import styles from './MyPage.module.scss'

/** 일반 사용자의 첫 화면. 내용은 아직 정해지지 않아 준비 중 안내만 보여준다. */
export function MyPage() {
  const { user } = useAuth()

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>마이페이지</h1>
        <p>{user?.name}님, 안녕하세요.</p>
        <p className={styles.description}>마이페이지는 준비 중입니다.</p>
        <LogoutButton />
      </div>
    </main>
  )
}
