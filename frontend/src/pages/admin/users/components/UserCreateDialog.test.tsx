import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { adminUser, jsonResponse, makeUser, meHandler, mockApi } from '../../../../test/mockApi'
import { renderApp } from '../../../../test/renderApp'

const LIST_URL = '/api/admin/users?page=1&size=20'
const baseHandlers = {
  'GET /api/auth/me': meHandler(adminUser),
  [`GET ${LIST_URL}`]: () => jsonResponse(200, { items: [adminUser], total: 1 }),
}

async function openDialog() {
  const user = userEvent.setup()
  renderApp('/admin/users')
  await user.click(await screen.findByRole('button', { name: '사용자 추가' }))
  return { user, dialog: screen.getByRole('dialog', { name: '사용자 추가' }) }
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText('이메일'), 'new@example.com')
  await user.type(within(dialog).getByLabelText('이름'), '신규')
  await user.type(within(dialog).getByLabelText('비밀번호'), 'new-password')
  await user.selectOptions(within(dialog).getByLabelText('역할'), 'admin')
  await user.click(within(dialog).getByRole('button', { name: '추가' }))
}

test('목록 화면에서 팝업을 열고, 이메일 칸에 바로 입력할 수 있다', async () => {
  mockApi(baseHandlers)
  const { dialog } = await openDialog()

  expect(within(dialog).getByLabelText('이메일')).toHaveFocus()
  expect(screen.getByRole('heading', { name: '사용자 관리' })).toBeInTheDocument()
})

test('추가에 성공하면 팝업을 닫고 안내와 함께 목록을 다시 불러온다', async () => {
  const fetchMock = mockApi({
    ...baseHandlers,
    'POST /api/admin/users': () =>
      jsonResponse(201, makeUser({ id: 3, email: 'new@example.com', name: '신규', role: 'admin' })),
  })
  const { user, dialog } = await openDialog()

  await fillAndSubmit(user, dialog)

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('신규 사용자를 추가했습니다.')
  const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
    email: 'new@example.com',
    name: '신규',
    password: 'new-password',
    role: 'admin',
  })
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter(([url]) => url === LIST_URL)).toHaveLength(2),
  )
})

test('이메일이 중복되면 팝업 안에 서버 메시지를 보여주고 열어 둔다', async () => {
  mockApi({
    ...baseHandlers,
    'POST /api/admin/users': () => jsonResponse(409, { detail: '이미 등록된 이메일입니다.' }),
  })
  const { user, dialog } = await openDialog()

  await fillAndSubmit(user, dialog)

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('이미 등록된 이메일입니다.')
  expect(screen.getByRole('dialog', { name: '사용자 추가' })).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: '추가' })).toBeEnabled()
})

test('입력 검증 오류(422)는 알아볼 수 있는 메시지로 보여준다', async () => {
  mockApi({
    ...baseHandlers,
    'POST /api/admin/users': () =>
      jsonResponse(422, { detail: [{ loc: ['body', 'name'], msg: 'String too short' }] }),
  })
  const { user, dialog } = await openDialog()

  await fillAndSubmit(user, dialog)

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('입력값을 확인하세요.')
})

test.each(['취소', '닫기'])('%s 버튼을 누르면 요청 없이 팝업을 닫는다', async (buttonName) => {
  const fetchMock = mockApi(baseHandlers)
  const { user, dialog } = await openDialog()

  await user.type(within(dialog).getByLabelText('이메일'), 'new@example.com')
  await user.click(within(dialog).getByRole('button', { name: buttonName }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
})

test('Esc를 누르면 팝업을 닫는다', async () => {
  mockApi(baseHandlers)
  const { user } = await openDialog()

  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
