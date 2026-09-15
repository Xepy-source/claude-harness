import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Dialog } from './Dialog'

function renderDialog(onClose = vi.fn()) {
  render(
    <Dialog title="테스트 팝업" onClose={onClose}>
      <p>내용</p>
    </Dialog>,
  )
  return { onClose, dialog: screen.getByRole('dialog', { name: '테스트 팝업' }) }
}

test('제목 줄을 끌면 팝업이 따라 움직이고, 놓으면 멈춘다', () => {
  const { dialog } = renderDialog()

  fireEvent.mouseDown(screen.getByRole('heading', { name: '테스트 팝업' }), {
    button: 0,
    clientX: 100,
    clientY: 100,
  })
  fireEvent.mouseMove(window, { clientX: 160, clientY: 130 })
  fireEvent.mouseUp(window)

  expect(dialog).toHaveStyle({ left: '60px', top: '30px' })

  fireEvent.mouseMove(window, { clientX: 400, clientY: 400 })
  expect(dialog).toHaveStyle({ left: '60px', top: '30px' })
})

test('화면 밖으로 끝까지 끌려 나가지 않는다', () => {
  const { dialog } = renderDialog()

  fireEvent.mouseDown(screen.getByRole('heading', { name: '테스트 팝업' }), {
    button: 0,
    clientX: 0,
    clientY: 0,
  })
  fireEvent.mouseMove(window, { clientX: 99999, clientY: -99999 })

  expect(dialog).toHaveStyle({ left: `${window.innerWidth / 2}px`, top: `${-window.innerHeight / 2}px` })
})

test('닫기 버튼을 누르면 끌지 않고 닫는다', () => {
  const { dialog, onClose } = renderDialog()
  const closeButton = screen.getByRole('button', { name: '닫기' })

  fireEvent.mouseDown(closeButton, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(window, { clientX: 200, clientY: 200 })
  fireEvent.click(closeButton)

  expect(dialog).toHaveStyle({ left: '0px', top: '0px' })
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('Esc를 누르면 닫는다', () => {
  const { onClose } = renderDialog()

  fireEvent.keyDown(window, { key: 'Escape' })

  expect(onClose).toHaveBeenCalledTimes(1)
})
