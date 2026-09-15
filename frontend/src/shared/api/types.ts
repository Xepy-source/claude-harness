export type Role = 'admin' | 'user'

/** 백엔드 UserPublic 응답 */
export interface User {
  id: number
  email: string
  name: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

/** 백엔드 UserList 응답 */
export interface UserListResponse {
  items: User[]
  total: number
}
