import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { adminUser, jsonResponse, meHandler, mockApi, normalUser } from '../../test/mockApi'
import { renderApp } from '../../test/renderApp'

async function submitLogin(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('이메일'), email)
  await user.type(screen.getByLabelText('비밀번호'), password)
  await user.click(screen.getByRole('button', { name: '로그인' }))
}

test('관리자가 로그인하면 사용자 관리 화면으로 간다', async () => {
  const fetchMock = mockApi({
    'GET /api/auth/me': meHandler(null),
    'POST /api/auth/login': () => jsonResponse(200, adminUser),
  })
  renderApp('/login')

  await submitLogin('admin@example.com', 'admin-password')

  expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
  const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login')
  expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
    email: 'admin@example.com',
    password: 'admin-password',
  })
})

test('일반 사용자가 로그인하면 마이페이지로 간다', async () => {
  mockApi({
    'GET /api/auth/me': meHandler(null),
    'POST /api/auth/login': () => jsonResponse(200, normalUser),
  })
  renderApp('/login')

  await submitLogin('user@example.com', 'user-password')

  expect(await screen.findByRole('heading', { name: '마이페이지' })).toBeInTheDocument()
})

test('로그인에 실패하면 서버 메시지를 보여주고 다시 시도할 수 있다', async () => {
  mockApi({
    'GET /api/auth/me': meHandler(null),
    'POST /api/auth/login': () =>
      jsonResponse(401, { detail: '이메일 또는 비밀번호가 올바르지 않습니다.' }),
  })
  renderApp('/login')

  await submitLogin('admin@example.com', 'wrong-password')

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '이메일 또는 비밀번호가 올바르지 않습니다.',
  )
  expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled()
})

test('서버 오류가 나면 일반 오류 메시지를 보여준다', async () => {
  mockApi({
    'GET /api/auth/me': meHandler(null),
    'POST /api/auth/login': () => jsonResponse(500, { detail: 'Internal Server Error' }),
  })
  renderApp('/login')

  await submitLogin('admin@example.com', 'admin-password')

  expect(await screen.findByRole('alert')).toHaveTextContent('로그인 중 문제가 발생했습니다.')
})
