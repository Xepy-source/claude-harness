import styles from './UserListPage.module.scss'

/** 사용자 목록 화면. 표, 검색, 페이지네이션은 5단계에서 만든다. */
export function UserListPage() {
  return (
    <section>
      <h1 className={styles.title}>사용자 관리</h1>
      <p className={styles.description}>사용자 목록은 다음 단계에서 추가됩니다.</p>
    </section>
  )
}
