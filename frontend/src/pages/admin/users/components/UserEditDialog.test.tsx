import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { adminUser, jsonResponse, makeUser, meHandler, mockApi } from '../../../../test/mockApi'
import { renderApp } from '../../../../test/renderApp'

const LIST_URL = '/api/admin/users?page=1&size=20'
const member = makeUser({ id: 2, email: 'member@example.com', name: '회원', role: 'user' })
const memberUrl = '/api/admin/users/2'

const baseHandlers = {
  'GET /api/auth/me': meHandler(adminUser),
  [`GET ${LIST_URL}`]: () => jsonResponse(200, { items: [adminUser, member], total: 2 }),
  [`GET ${memberUrl}`]: () => jsonResponse(200, member),
}

/** 목록에서 이름을 눌러 수정 팝업을 열고, 폼이 채워질 때까지 기다린다. */
async function openDialog(name = '회원') {
  const user = userEvent.setup()
  renderApp('/admin/users')
  await user.click(await screen.findByRole('button', { name }))
  const dialog = screen.getByRole('dialog', { name: '사용자 수정' })
  await within(dialog).findByLabelText('이름')
  return { user, dialog }
}

function callsOf(fetchMock: ReturnType<typeof mockApi>, method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

function patchBodyOf(fetchMock: ReturnType<typeof mockApi>) {
  const [call] = callsOf(fetchMock, 'PATCH')
  return call ? JSON.parse(String(call[1]?.body)) : undefined
}

test('목록 화면 위에 팝업을 열고 사용자 정보로 폼을 채운다', async () => {
  mockApi(baseHandlers)
  const { dialog } = await openDialog()

  expect(within(dialog).getByLabelText('이름')).toHaveValue('회원')
  expect(within(dialog).getByLabelText('이름')).toHaveFocus()
  expect(within(dialog).getByLabelText('이메일')).toHaveValue('member@example.com')
  expect(within(dialog).getByLabelText('이메일')).toHaveAttribute('readonly')
  expect(within(dialog).getByLabelText('역할')).toHaveValue('user')
  expect(within(dialog).getByLabelText('활성 계정')).toBeChecked()
  expect(within(dialog).getByRole('button', { name: '삭제' })).toBeEnabled()
  expect(screen.getByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
})

test('바꾼 항목만 저장하고, 팝업을 닫은 뒤 안내와 함께 목록을 다시 불러온다', async () => {
  const fetchMock = mockApi({
    ...baseHandlers,
    [`PATCH ${memberUrl}`]: () => jsonResponse(200, { ...member, name: '새이름', is_active: false }),
  })
  const { user, dialog } = await openDialog()

  const nameInput = within(dialog).getByLabelText('이름')
  await user.clear(nameInput)
  await user.type(nameInput, '새이름')
  await user.click(within(dialog).getByLabelText('활성 계정'))
  await user.click(within(dialog).getByRole('button', { name: '저장' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('새이름 사용자 정보를 저장했습니다.')
  expect(patchBodyOf(fetchMock)).toEqual({ name: '새이름', is_active: false })
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter(([url]) => url === LIST_URL)).toHaveLength(2),
  )
})

test('새 비밀번호를 입력하면 그것만 보낸다', async () => {
  const fetchMock = mockApi({
    ...baseHandlers,
    [`PATCH ${memberUrl}`]: () => jsonResponse(200, member),
  })
  const { user, dialog } = await openDialog()

  await user.type(within(dialog).getByLabelText('새 비밀번호'), 'changed-password')
  await user.click(within(dialog).getByRole('button', { name: '저장' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(patchBodyOf(fetchMock)).toEqual({ password: 'changed-password' })
})

test('바뀐 내용이 없으면 요청을 보내지 않고 팝업을 열어 둔다', async () => {
  const fetchMock = mockApi(baseHandlers)
  const { user, dialog } = await openDialog()

  await user.click(within(dialog).getByRole('button', { name: '저장' }))

  expect(await within(dialog).findByRole('status')).toHaveTextContent('바뀐 내용이 없습니다.')
  expect(patchBodyOf(fetchMock)).toBeUndefined()
  expect(screen.getByRole('dialog', { name: '사용자 수정' })).toBeInTheDocument()
})

test('저장이 거부되면 팝업 안에 서버 메시지를 보여주고 열어 둔다', async () => {
  mockApi({
    ...baseHandlers,
    [`PATCH ${memberUrl}`]: () => jsonResponse(400, { detail: '허용되지 않는 변경입니다.' }),
  })
  const { user, dialog } = await openDialog()

  await user.selectOptions(within(dialog).getByLabelText('역할'), 'admin')
  await user.click(within(dialog).getByRole('button', { name: '저장' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('허용되지 않는 변경입니다.')
  expect(within(dialog).getByRole('button', { name: '저장' })).toBeEnabled()
})

test('확인 후 삭제하고, 팝업을 닫은 뒤 안내와 함께 목록을 다시 불러온다', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const fetchMock = mockApi({
    ...baseHandlers,
    [`DELETE ${memberUrl}`]: () => new Response(null, { status: 204 }),
  })
  const { user, dialog } = await openDialog()

  await user.click(within(dialog).getByRole('button', { name: '삭제' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('회원 사용자를 삭제했습니다.')
  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('member@example.com'))
  expect(callsOf(fetchMock, 'DELETE').map(([url]) => url)).toEqual([memberUrl])
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter(([url]) => url === LIST_URL)).toHaveLength(2),
  )
})

test('삭제 확인을 취소하면 요청을 보내지 않고 팝업을 열어 둔다', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  const fetchMock = mockApi(baseHandlers)
  const { user, dialog } = await openDialog()

  await user.click(within(dialog).getByRole('button', { name: '삭제' }))

  expect(screen.getByRole('dialog', { name: '사용자 수정' })).toBeInTheDocument()
  expect(callsOf(fetchMock, 'DELETE')).toHaveLength(0)
})

test('자기 자신은 역할, 활성 상태, 삭제를 바꿀 수 없고 이름을 바꾸면 내 정보를 새로 고친다', async () => {
  const fetchMock = mockApi({
    ...baseHandlers,
    'GET /api/admin/users/1': () => jsonResponse(200, adminUser),
    'PATCH /api/admin/users/1': () => jsonResponse(200, { ...adminUser, name: '새 관리자' }),
  })
  const { user, dialog } = await openDialog(adminUser.name)

  expect(within(dialog).getByLabelText('역할')).toBeDisabled()
  expect(within(dialog).getByLabelText('활성 계정')).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: '삭제' })).toBeDisabled()
  expect(within(dialog).getByText(/자기 자신은 역할과 활성 상태를/)).toBeInTheDocument()

  const nameInput = within(dialog).getByLabelText('이름')
  await user.clear(nameInput)
  await user.type(nameInput, '새 관리자')
  await user.click(within(dialog).getByRole('button', { name: '저장' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(patchBodyOf(fetchMock)).toEqual({ name: '새 관리자' })
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/me')).toHaveLength(2),
  )
})

test('그사이 삭제된 사용자면 팝업 안에 오류를 보여준다', async () => {
  const user = userEvent.setup()
  mockApi({
    ...baseHandlers,
    [`GET ${memberUrl}`]: () => jsonResponse(404, { detail: '사용자를 찾을 수 없습니다.' }),
  })
  renderApp('/admin/users')

  await user.click(await screen.findByRole('button', { name: '회원' }))

  const dialog = screen.getByRole('dialog', { name: '사용자 수정' })
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('사용자를 찾을 수 없습니다.')
})

test('취소 버튼을 누르면 요청 없이 팝업을 닫는다', async () => {
  const fetchMock = mockApi(baseHandlers)
  const { user, dialog } = await openDialog()

  await user.type(within(dialog).getByLabelText('새 비밀번호'), 'changed-password')
  await user.click(within(dialog).getByRole('button', { name: '취소' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(callsOf(fetchMock, 'PATCH')).toHaveLength(0)
})
