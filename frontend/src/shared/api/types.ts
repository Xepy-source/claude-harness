export type Role = 'admin' | 'user'

/** 백엔드 UserPublic 응답 */
export interface User {
  id: number
  email: string
  name: string
  role: Role
  is_active: boolean
  /** 로그인한 적이 없으면 null */
  last_login_at: string | null
  created_at: string
  updated_at: string
}

/** 백엔드 UserList 응답 */
export interface UserListResponse {
  items: User[]
  total: number
}
