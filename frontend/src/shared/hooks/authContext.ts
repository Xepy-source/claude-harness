import { createContext } from 'react'
import type { User } from '../api/types'

export interface AuthState {
  /** 로그인하지 않았으면 null */
  user: User | null
  /** 앱을 처음 열어 로그인 상태를 확인하는 동안 true */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
