import { createContext } from 'react'
import type { User } from '../api/types'

export interface AuthState {
  /** 로그인하지 않았으면 null */
  user: User | null
  /** 앱을 처음 열어 로그인 상태를 확인하는 동안 true */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** /api/auth/me를 다시 불러온다. 자기 정보를 바꾼 뒤 쓴다. */
  refresh: () => Promise<void>
  /** 서버 요청 없이 로그아웃 상태로 만든다. 로그인이 만료됐을 때(401) 쓴다. */
  clearSession: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
