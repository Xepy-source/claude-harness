import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { adminUser, meHandler, mockApi, normalUser } from './test/mockApi'
import { renderApp } from './test/renderApp'

describe('로그인하지 않은 사용자', () => {
  test.each(['/', '/admin', '/admin/users', '/mypage', '/unknown'])(
    '%s에 들어가면 로그인 화면으로 간다',
    async (path) => {
      mockApi({ 'GET /api/auth/me': meHandler(null) })
      renderApp(path)

      expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    },
  )
})

describe('관리자', () => {
  test.each(['/', '/login', '/admin', '/admin/users'])(
    '%s에 들어가면 사용자 관리 화면으로 간다',
    async (path) => {
      mockApi({ 'GET /api/auth/me': meHandler(adminUser) })
      renderApp(path)

      expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
      expect(screen.getByText(adminUser.name)).toBeInTheDocument()
    },
  )

  test('로그아웃하면 로그인 화면으로 간다', async () => {
    const fetchMock = mockApi({
      'GET /api/auth/me': meHandler(adminUser),
      'POST /api/auth/logout': () => new Response(null, { status: 204 }),
    })
    renderApp('/admin/users')

    await userEvent.click(await screen.findByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('일반 사용자', () => {
  test.each(['/', '/login', '/admin', '/admin/users', '/mypage'])(
    '%s에 들어가면 마이페이지로 간다',
    async (path) => {
      mockApi({ 'GET /api/auth/me': meHandler(normalUser) })
      renderApp(path)

      expect(await screen.findByRole('heading', { name: '마이페이지' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: '사용자 관리' })).not.toBeInTheDocument()
    },
  )

  test('마이페이지에서 로그아웃하면 로그인 화면으로 간다', async () => {
    mockApi({
      'GET /api/auth/me': meHandler(normalUser),
      'POST /api/auth/logout': () => new Response(null, { status: 204 }),
    })
    renderApp('/mypage')

    await userEvent.click(await screen.findByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })
})
