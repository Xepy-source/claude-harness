import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { UserEditPage } from './pages/admin/users/UserEditPage'
import { UserListPage } from './pages/admin/users/UserListPage'
import { LoginPage } from './pages/login/LoginPage'
import { MyPage } from './pages/mypage/MyPage'
import { AdminLayout } from './shared/components/AdminLayout'
import { AuthProvider } from './shared/components/AuthProvider'
import { LoadingScreen } from './shared/components/LoadingScreen'
import { RequireAuth } from './shared/components/RequireAuth'
import { homePathFor, useAuth } from './shared/hooks/useAuth'

/** "/"는 로그인 상태와 role에 맞는 첫 화면으로 보낸다. */
function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}

/** 전체 라우트. 경로 규칙은 docs/spec.md의 화면 절을 따른다. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/:userId" element={<UserEditPage />} />
      </Route>
      <Route
        path="/mypage"
        element={
          <RequireAuth>
            <MyPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
