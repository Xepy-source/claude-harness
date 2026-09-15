import { ApiError, apiFetch } from './client'
import type { User } from './types'

export function login(email: string, password: string): Promise<User> {
  return apiFetch<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' })
}

/** 로그인하지 않았으면 null을 반환한다. */
export async function fetchMe(): Promise<User | null> {
  try {
    return await apiFetch<User>('/api/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}
