import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { LogoutButton } from './LogoutButton'
import styles from './AdminLayout.module.scss'

/** /admin 아래 화면의 공통 틀. 라우터에서 <RequireAuth role="admin"> 안에 둔다. */
export function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>claude_harness 관리자</span>
        <nav className={styles.nav}>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
          >
            사용자 관리
          </NavLink>
        </nav>
        <div className={styles.account}>
          <span className={styles.userName}>{user?.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
