import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '../App'
import { AuthProvider } from '../shared/components/AuthProvider'

/** path에서 앱을 렌더링한다. 실제 앱과 같은 라우트와 인증 가드를 쓴다. */
export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}
