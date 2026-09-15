import { vi } from 'vitest'
import type { User } from '../shared/api/types'

type Handler = (init?: RequestInit) => Response

export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * fetch를 가짜로 바꾼다. 키는 "METHOD 경로" (예: "GET /api/auth/me").
 * 등록하지 않은 요청은 에러를 던진다. setup.ts가 테스트마다 원래 fetch로 되돌린다.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? `${input.pathname}${input.search}`
          : input.url
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url}`
    const handler = handlers[key]
    if (!handler) {
      throw new Error(`mockApi에 등록되지 않은 요청: ${key}`)
    }
    return handler(init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** GET /api/auth/me 응답. user가 null이면 로그인하지 않은 상태(401). */
export function meHandler(user: User | null): Handler {
  return () =>
    user ? jsonResponse(200, user) : jsonResponse(401, { detail: '로그인이 필요합니다.' })
}

export const adminUser: User = {
  id: 1,
  email: 'admin@example.com',
  name: '관리자',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

export const normalUser: User = {
  ...adminUser,
  id: 2,
  email: 'user@example.com',
  name: '사용자',
  role: 'user',
}
