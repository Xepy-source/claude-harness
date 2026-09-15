import type { Role } from '../../../shared/api/types'

export const ROLE_LABELS: Record<Role, string> = {
  admin: '관리자',
  user: '사용자',
}

export const ROLE_OPTIONS: Role[] = ['user', 'admin']

/** 백엔드 user_schema.py의 PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH와 같게 유지한다. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** "2026-03-04T10:00:00+09:00" → "2026-03-04" */
export function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
