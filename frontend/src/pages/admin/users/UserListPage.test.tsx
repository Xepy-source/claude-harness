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
  // 로컬 시각으로 만들어 테스트 환경의 시간대와 관계없이 '2026-03-05 14:30'으로 보인다.
  last_login_at: new Date(2026, 2, 5, 14, 30).toISOString(),
  created_at: '2026-03-04T10:00:00+09:00',
})

function rowOf(name: string) {
  return screen.getByRole('button', { name }).closest('tr')!
}

test('사용자 목록을 번호, 마지막 로그인 시간과 함께 표로 보여준다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [adminUser, member], total: 2 }),
  })
  renderApp('/admin/users')

  await screen.findByRole('button', { name: '김철수' })
  const headers = within(screen.getByRole('table')).getAllByRole('columnheader')
  expect(headers.map((th) => th.textContent)).toEqual([
    'No.',
    '이름',
    '이메일',
    '역할',
    '상태',
    '마지막 로그인',
    '가입일',
  ])

  const memberCells = within(rowOf('김철수')).getAllByRole('cell').map((td) => td.textContent)
  expect(memberCells).toEqual([
    '2',
    '김철수',
    'kim@example.com',
    '사용자',
    '비활성',
    '2026-03-05 14:30',
    '2026-03-04',
  ])
  expect(within(rowOf('관리자')).getAllByRole('cell')[0]).toHaveTextContent('1')
  expect(within(rowOf('관리자')).getAllByRole('cell')[5]).toHaveTextContent('-')
  expect(screen.queryByRole('link', { name: '김철수' })).not.toBeInTheDocument()
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

test('URL의 검색어와 페이지로 불러오고, 번호는 이전 페이지에서 이어진다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('q=kim&page=2&size=20')]: () => jsonResponse(200, { items: [member], total: 21 }),
  })
  renderApp('/admin/users?q=kim&page=2')

  await screen.findByRole('button', { name: '김철수' })
  expect(within(rowOf('김철수')).getAllByRole('cell')[0]).toHaveTextContent('21')
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

  expect(await screen.findByRole('button', { name: '김철수' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: '페이지' })).toHaveTextContent('2 / 3')
})

test('페이지가 전체 페이지 수를 넘으면 마지막 페이지로 옮긴다', async () => {
  const fetchMock = mockApi({
    ...loggedInAsAdmin,
    [listKey('q=kim&page=3&size=20')]: () => jsonResponse(200, { items: [], total: 21 }),
    [listKey('q=kim&page=2&size=20')]: () => jsonResponse(200, { items: [member], total: 21 }),
  })
  renderApp('/admin/users?q=kim&page=3')

  expect(await screen.findByRole('button', { name: '김철수' })).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: '페이지' })).toHaveTextContent('2 / 2')
  expect(screen.queryByText('사용자가 없습니다.')).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/auth/me',
    '/api/admin/users?q=kim&page=3&size=20',
    '/api/admin/users?q=kim&page=2&size=20',
  ])
})

test('없어진 수정 화면 주소로 들어오면 목록으로 보낸다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [member], total: 1 }),
  })
  renderApp('/admin/users/2')

  expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

test('사용자 추가는 다른 화면으로 가지 않고 팝업으로 연다', async () => {
  mockApi({
    ...loggedInAsAdmin,
    [listKey('page=1&size=20')]: () => jsonResponse(200, { items: [adminUser], total: 1 }),
  })
  renderApp('/admin/users')

  expect(screen.queryByRole('link', { name: '사용자 추가' })).not.toBeInTheDocument()
  await userEvent.click(await screen.findByRole('button', { name: '사용자 추가' }))

  expect(screen.getByRole('dialog', { name: '사용자 추가' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
})
