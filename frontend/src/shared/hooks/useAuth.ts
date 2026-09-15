import { useContext } from 'react'
import type { Role } from '../api/types'
import { AuthContext, type AuthState } from './authContext'

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.')
  }
  return auth
}

/** 로그인 후 role별 첫 화면 */
export function homePathFor(role: Role): string {
  return role === 'admin' ? '/admin/users' : '/mypage'
}
