import { apiFetch } from './client'
import type { Role, User, UserListResponse } from './types'

const BASE_URL = '/api/admin/users'

export const USERS_PAGE_SIZE = 20

export interface UserListQuery {
  q?: string
  /** 없으면 모든 역할 */
  role?: Role
  /** 없으면 활성, 비활성 모두 */
  isActive?: boolean
  page?: number
  size?: number
}

export interface UserCreateInput {
  email: string
  name: string
  password: string
  role: Role
}

/** 보낸 필드만 바뀐다. */
export type UserUpdateInput = Partial<{
  name: string
  role: Role
  is_active: boolean
  password: string
}>

/** 최근 가입자부터 온다. 요청 URL은 항상 q, role, is_active(각각 있을 때), page, size 순서다. */
export function listUsers({
  q,
  role,
  isActive,
  page = 1,
  size = USERS_PAGE_SIZE,
}: UserListQuery = {}) {
  const params = new URLSearchParams()
  if (q) {
    params.set('q', q)
  }
  if (role) {
    params.set('role', role)
  }
  if (isActive !== undefined) {
    params.set('is_active', String(isActive))
  }
  params.set('page', String(page))
  params.set('size', String(size))
  return apiFetch<UserListResponse>(`${BASE_URL}?${params}`)
}

export function getUser(id: number) {
  return apiFetch<User>(`${BASE_URL}/${id}`)
}

export function createUser(input: UserCreateInput) {
  return apiFetch<User>(BASE_URL, { method: 'POST', body: JSON.stringify(input) })
}

export function updateUser(id: number, input: UserUpdateInput) {
  return apiFetch<User>(`${BASE_URL}/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteUser(id: number) {
  return apiFetch<void>(`${BASE_URL}/${id}`, { method: 'DELETE' })
}
