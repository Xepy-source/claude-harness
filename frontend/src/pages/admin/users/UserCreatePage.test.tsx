import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { adminUser, jsonResponse, makeUser, meHandler, mockApi } from '../../../test/mockApi'
import { renderApp } from '../../../test/renderApp'

const loggedInAsAdmin = { 'GET /api/auth/me': meHandler(adminUser) }
const listPage1 = {
  'GET /api/admin/users?page=1&size=20': () => jsonResponse(200, { items: [adminUser], total: 1 }),
}

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('이메일'), 'new@example.com')
  await user.type(screen.getByLabelText('이름'), '신규')
  await user.type(screen.getByLabelText('비밀번호'), 'new-password')
  await user.selectOptions(screen.getByLabelText('역할'), 'admin')
  await user.click(screen.getByRole('button', { name: '추가' }))
}

test('입력한 정보로 사용자를 만들고 목록으로 돌아간다', async () => {
  const fetchMock = mockApi({
    ...loggedInAsAdmin,
    ...listPage1,
    'POST /api/admin/users': () =>
      jsonResponse(201, makeUser({ id: 3, email: 'new@example.com', name: '신규', role: 'admin' })),
  })
  renderApp('/admin/users/new')

  await fillAndSubmit()

  expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
  const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
    email: 'new@example.com',
    name: '신규',
    password: 'new-password',
    role: 'admin',
  })
})

test('이메일이 중복되면 서버 메시지를 보여주고 화면에 머문다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    'POST /api/admin/users': () => jsonResponse(409, { detail: '이미 등록된 이메일입니다.' }),
  })
  renderApp('/admin/users/new')

  await fillAndSubmit()

  expect(await screen.findByRole('alert')).toHaveTextContent('이미 등록된 이메일입니다.')
  expect(screen.getByRole('heading', { name: '사용자 추가' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '추가' })).toBeEnabled()
})

test('입력 검증 오류(422)는 알아볼 수 있는 메시지로 보여준다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    'POST /api/admin/users': () =>
      jsonResponse(422, { detail: [{ loc: ['body', 'name'], msg: 'String should have at least 1 character' }] }),
  })
  renderApp('/admin/users/new')

  await fillAndSubmit()

  expect(await screen.findByRole('alert')).toHaveTextContent('입력값을 확인하세요.')
})

test('취소하면 목록으로 돌아간다', async () => {
  mockApi({ ...loggedInAsAdmin, ...listPage1 })
  renderApp('/admin/users/new')

  await userEvent.click(await screen.findByRole('link', { name: '취소' }))

  expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
})
