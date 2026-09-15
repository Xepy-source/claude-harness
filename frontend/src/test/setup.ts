import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  // mockApi가 바꾼 fetch와 vi.spyOn(window, 'confirm') 등을 원래대로 되돌린다.
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
