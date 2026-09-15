import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Role } from '../api/types'
import { homePathFor, useAuth } from '../hooks/useAuth'
import { LoadingScreen } from './LoadingScreen'

interface RequireAuthProps {
  /** 지정하면 이 role만 들어올 수 있다. 다른 role은 자기 첫 화면으로 보낸다. */
  role?: Role
  children: ReactNode
}

/** 로그인하지 않았으면 /login으로 보내는 인증 가드 */
export function RequireAuth({ role, children }: RequireAuthProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (role && user.role !== role) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return children
}
