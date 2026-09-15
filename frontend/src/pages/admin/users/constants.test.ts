import { expect, test } from 'vitest'
import { formatDate, formatDateTime } from './constants'

test('formatDate는 날짜 부분만 남긴다', () => {
  expect(formatDate('2026-03-04T10:00:00+09:00')).toBe('2026-03-04')
})

test('formatDateTime은 로컬 시간대 기준 "년-월-일 시:분"으로 바꾼다', () => {
  // 로컬 시각으로 만든 Date를 ISO(UTC)로 바꿔 넣으므로 테스트 환경의 시간대와 관계없이 같다.
  const iso = new Date(2026, 2, 4, 9, 5).toISOString()

  expect(formatDateTime(iso)).toBe('2026-03-04 09:05')
})
