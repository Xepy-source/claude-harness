import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows ok when backend is healthy', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }))),
  )
  render(<App />)
  expect(await screen.findByText('Backend: ok')).toBeInTheDocument()
})

test('shows error when backend is unreachable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
  render(<App />)
  expect(await screen.findByText('Backend: error')).toBeInTheDocument()
})
