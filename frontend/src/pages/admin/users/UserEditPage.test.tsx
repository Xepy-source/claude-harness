import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { adminUser, jsonResponse, makeUser, meHandler, mockApi } from '../../../test/mockApi'
import { renderApp } from '../../../test/renderApp'

const member = makeUser({ id: 2, email: 'member@example.com', name: '회원', role: 'user' })
const memberUrl = '/api/admin/users/2'

const baseHandlers = {
  'GET /api/auth/me': meHandler(adminUser),
  [`GET ${memberUrl}`]: () => jsonResponse(200, member),
  'GET /api/admin/users?page=1&size=20': () => jsonResponse(200, { items: [adminUser], total: 1 }),
}

function patchBodyOf(fetchMock: ReturnType<typeof mockApi>) {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
  return call ? JSON.parse(String(call[1]?.body)) : undefined
}

test('사용자 정보를 불러와 폼을 채운다', async () => {
  mockApi(baseHandlers)
  renderApp('/admin/users/2')

  expect(await screen.findByLabelText('이름')).toHaveValue('회원')
  expect(screen.getByLabelText('이메일')).toHaveValue('member@example.com')
  expect(screen.getByLabelText('이메일')).toHaveAttribute('readonly')
  expect(screen.getByLabelText('역할')).toHaveValue('user')
  expect(screen.getByLabelText('활성 계정')).toBeChecked()
  expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled()
})

test('바꾼 항목만 저장한다', async () => {
  const fetchMock = mockApi({
    ...baseHandlers,
    [`PATCH ${memberUrl}`]: () => jsonResponse(200, { ...member, name: '새이름', is_active: false }),
  })
  renderApp('/admin/users/2')
  const user = userEvent.setup()

  const nameInput = await screen.findByLabelText('이름')
  await user.clear(nameInput)
  await user.type(nameInput, '새이름')
  await user.click(screen.getByLabelText('활성 계정'))
  await user.click(screen.getByRole('button', { name: '저장' }))

  expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.')
  expect(patchBodyOf(fetchMock)).toEqual({ name: '새이름', is_active: false })
  expect(screen.getByLabelText('활성 계정')).not.toBeChecked()
})

test('새 비밀번호를 입력하면 함께 보낸다', async () => {
  const fetchMock = mockApi({
    ...baseHandlers,
    [`PATCH ${memberUrl}`]: () => jsonResponse(200, member),
  })
  renderApp('/admin/users/2')
  const user = userEvent.setup()

  await user.type(await screen.findByLabelText('새 비밀번호'), 'changed-password')
  await user.click(screen.getByRole('button', { name: '저장' }))

  expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.')
  expect(patchBodyOf(fetchMock)).toEqual({ password: 'changed-password' })
  expect(screen.getByLabelText('새 비밀번호')).toHaveValue('')
})

test('바뀐 내용이 없으면 요청을 보내지 않는다', async () => {
  const fetchMock = mockApi(baseHandlers)
  renderApp('/admin/users/2')

  await userEvent.click(await screen.findByRole('button', { name: '저장' }))

  expect(await screen.findByRole('status')).toHaveTextContent('바뀐 내용이 없습니다.')
  expect(patchBodyOf(fetchMock)).toBeUndefined()
})

test('저장이 거부되면 서버 메시지를 보여준다', async () => {
  mockApi({
    ...baseHandlers,
    [`PATCH ${memberUrl}`]: () => jsonResponse(400, { detail: '허용되지 않는 변경입니다.' }),
  })
  renderApp('/admin/users/2')
  const user = userEvent.setup()

  await user.selectOptions(await screen.findByLabelText('역할'), 'admin')
  await user.click(screen.getByRole('button', { name: '저장' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('허용되지 않는 변경입니다.')
})

test('확인 후 삭제하고 목록으로 돌아간다', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const fetchMock = mockApi({
    ...baseHandlers,
    [`DELETE ${memberUrl}`]: () => new Response(null, { status: 204 }),
  })
  renderApp('/admin/users/2')

  await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

  expect(await screen.findByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('member@example.com'))
  expect(fetchMock).toHaveBeenCalledWith(memberUrl, expect.objectContaining({ method: 'DELETE' }))
})

test('삭제 확인을 취소하면 요청을 보내지 않는다', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  const fetchMock = mockApi(baseHandlers)
  renderApp('/admin/users/2')

  await userEvent.click(await screen.findByRole('button', { name: '삭제' }))

  expect(screen.getByRole('heading', { name: '사용자 수정' })).toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
})

test('자기 자신은 역할, 활성 상태, 삭제를 바꿀 수 없고 이름을 바꾸면 내 정보를 새로 고친다', async () => {
  const fetchMock = mockApi({
    'GET /api/auth/me': meHandler(adminUser),
    'GET /api/admin/users/1': () => jsonResponse(200, adminUser),
    'PATCH /api/admin/users/1': () => jsonResponse(200, { ...adminUser, name: '새 관리자' }),
  })
  renderApp('/admin/users/1')
  const user = userEvent.setup()

  expect(await screen.findByLabelText('역할')).toBeDisabled()
  expect(screen.getByLabelText('활성 계정')).toBeDisabled()
  expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
  expect(screen.getByText(/자기 자신은 역할과 활성 상태를/)).toBeInTheDocument()

  const nameInput = screen.getByLabelText('이름')
  await user.clear(nameInput)
  await user.type(nameInput, '새 관리자')
  await user.click(screen.getByRole('button', { name: '저장' }))

  expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.')
  expect(patchBodyOf(fetchMock)).toEqual({ name: '새 관리자' })
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/me')).toHaveLength(2),
  )
})

test('없는 사용자면 오류를 보여준다', async () => {
  mockApi({
    'GET /api/auth/me': meHandler(adminUser),
    'GET /api/admin/users/99': () => jsonResponse(404, { detail: '사용자를 찾을 수 없습니다.' }),
  })
  renderApp('/admin/users/99')

  expect(await screen.findByRole('alert')).toHaveTextContent('사용자를 찾을 수 없습니다.')
})

test('숫자가 아닌 id면 요청 없이 오류를 보여준다', async () => {
  const fetchMock = mockApi({ 'GET /api/auth/me': meHandler(adminUser) })
  renderApp('/admin/users/abc')

  expect(await screen.findByRole('alert')).toHaveTextContent('사용자를 찾을 수 없습니다.')
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me'])
})
