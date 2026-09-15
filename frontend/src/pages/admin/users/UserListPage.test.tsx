import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { adminUser, jsonResponse, makeUser, meHandler, mockApi } from '../../../test/mockApi'
import { renderApp } from '../../../test/renderApp'

const loggedInAsAdmin = { 'GET /api/auth/me': meHandler(adminUser) }
const listKey = (query: string) => `GET /api/admin/users?${query}`

const member = makeUser({
  id: 2,
  email: 'kim@example.com',
  name: '김철수',
  is_active: false,
  created_at: '2026-03-04T10:00:00+09:00',
})

test('사용자 목록을 표로 보여준다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [adminUser, member], total: 2 }),
  })
  renderApp('/admin/users')

  const nameLink = await screen.findByRole('link', { name: '김철수' })
  const row = nameLink.closest('tr')!
  expect(nameLink).toHaveAttribute('href', '/admin/users/2')
  expect(within(row).getByText('kim@example.com')).toBeInTheDocument()
  expect(within(row).getByText('사용자')).toBeInTheDocument()
  expect(within(row).getByText('비활성')).toBeInTheDocument()
  expect(within(row).getByText('2026-03-04')).toBeInTheDocument()
  expect(screen.getByText('총 2명')).toBeInTheDocument()
})

test('검색어로 다시 불러오고, 결과가 없으면 안내한다', async () => {
  const fetchMock = mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [adminUser], total: 1 }),
    [listKey('q=nobody&page=1&size=20')]: () => jsonResponse(200, { items: [], total: 0 }),
  })
  renderApp('/admin/users')
  const user = userEvent.setup()

  await user.type(await screen.findByRole('searchbox', { name: '이메일 또는 이름 검색' }), 'nobody')
  await user.click(screen.getByRole('button', { name: '검색' }))

  expect(await screen.findByText("'nobody'에 해당하는 사용자가 없습니다.")).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?q=nobody&page=1&size=20', expect.anything())
})

test('URL의 검색어와 페이지로 목록을 불러온다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('q=kim&page=2&size=20')]: () => jsonResponse(200, { items: [member], total: 21 }),
  })
  renderApp('/admin/users?q=kim&page=2')

  expect(await screen.findByRole('link', { name: '김철수' })).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: '이메일 또는 이름 검색' })).toHaveValue('kim')
  expect(screen.getByRole('navigation', { name: '페이지' })).toHaveTextContent('2 / 2')
})

test('페이지를 넘길 수 있다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [adminUser], total: 45 }),
    [listKey('page=2&size=20')]: () => jsonResponse(200, { items: [member], total: 45 }),
  })
  renderApp('/admin/users')

  const pagination = await screen.findByRole('navigation', { name: '페이지' })
  expect(pagination).toHaveTextContent('1 / 3')
  expect(within(pagination).getByRole('button', { name: '이전' })).toBeDisabled()

  await userEvent.click(within(pagination).getByRole('button', { name: '다음' }))

  expect(await screen.findByRole('link', { name: '김철수' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: '페이지' })).toHaveTextContent('2 / 3')
})

test('목록을 불러오지 못하면 오류를 보여준다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(500, { detail: 'Internal Server Error' }),
  })
  renderApp('/admin/users')

  expect(await screen.findByRole('alert')).toHaveTextContent('요청 중 문제가 발생했습니다.')
})

test('로그인이 만료됐으면(401) 로그인 화면으로 보낸다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(401, { detail: '로그인이 필요합니다.' }),
  })
  renderApp('/admin/users')

  expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
})

test('사용자 추가 버튼으로 추가 화면에 간다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [adminUser], total: 1 }),
  })
  renderApp('/admin/users')

  await userEvent.click(await screen.findByRole('link', { name: '사용자 추가' }))

  expect(await screen.findByRole('heading', { name: '사용자 추가' })).toBeInTheDocument()
})
