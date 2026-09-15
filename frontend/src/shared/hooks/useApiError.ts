import { useCallback } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from './useAuth'

export const UNKNOWN_ERROR_MESSAGE = '요청 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.'

/**
 * API 오류를 화면에 보여줄 메시지로 바꾸는 함수를 돌려준다.
 * 로그인이 만료됐으면(401) 세션을 비워 인증 가드가 /login으로 보내게 한다.
 */
export function useApiErrorMessage(): (error: unknown) => string {
  const { clearSession } = useAuth()

  return useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiError) || error.status >= 500) {
        return UNKNOWN_ERROR_MESSAGE
      }
      if (error.status === 401) {
        clearSession()
      }
      return error.message
    },
    [clearSession],
  )
}
