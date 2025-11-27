import {
    getCurrentISOInGMT7,
    getEndOfDayGMT7,
    getNowInGMT7,
    getStartOfDayGMT7,
    getTodayRangeGMT7,
} from '@/lib/timezone'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Timezone Utils (GMT+7)', () => {
  // Mock system time to ensure consistent tests
  // 2025-01-15 10:30:00 UTC = 17:30:00 GMT+7
  const MOCK_DATE = new Date('2025-01-15T10:30:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(MOCK_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getNowInGMT7', () => {
    it('should return date object shifted by 7 hours', () => {
      const gmt7 = getNowInGMT7()
      // UTC hours: 10, GMT+7 hours: 17
      expect(gmt7.getHours()).toBe(17)
      expect(gmt7.getDate()).toBe(15)
    })
  })

  describe('getStartOfDayGMT7', () => {
    it('should return start of day in GMT+7 with offset', () => {
      const start = getStartOfDayGMT7()
      expect(start).toBe('2025-01-15T00:00:00+07:00')
    })

    it('should handle date input', () => {
      // Input: 2025-01-20
      const date = new Date('2025-01-20T10:00:00Z')
      const start = getStartOfDayGMT7(date)
      // 10:00 UTC is 17:00 GMT+7, so start of that day is 2025-01-20
      expect(start).toBe('2025-01-20T00:00:00+07:00')
    })
  })

  describe('getEndOfDayGMT7', () => {
    it('should return end of day in GMT+7 with offset', () => {
      const end = getEndOfDayGMT7()
      expect(end).toBe('2025-01-15T23:59:59+07:00')
    })
  })

  describe('getCurrentISOInGMT7', () => {
    it('should return current time in ISO format with offset', () => {
      const iso = getCurrentISOInGMT7()
      expect(iso).toBe('2025-01-15T17:30:00+07:00')
    })
  })

  describe('getTodayRangeGMT7', () => {
    it('should return start and end of today in GMT+7', () => {
      const range = getTodayRangeGMT7()
      expect(range.startDate).toBe('2025-01-15T00:00:00+07:00')
      expect(range.endDate).toBe('2025-01-15T23:59:59+07:00')
    })
  })

  describe('Edge Cases', () => {
    it('should handle day rollover correctly', () => {
      // 2025-01-15 23:30:00 UTC = 2025-01-16 06:30:00 GMT+7
      vi.setSystemTime(new Date('2025-01-15T23:30:00Z'))
      
      const start = getStartOfDayGMT7()
      expect(start).toBe('2025-01-16T00:00:00+07:00')
    })

    it('should handle month rollover correctly', () => {
      // 2025-01-31 20:00:00 UTC = 2025-02-01 03:00:00 GMT+7
      vi.setSystemTime(new Date('2025-01-31T20:00:00Z'))
      
      const start = getStartOfDayGMT7()
      expect(start).toBe('2025-02-01T00:00:00+07:00')
    })

    it('should handle year rollover correctly', () => {
      // 2025-12-31 18:00:00 UTC = 2026-01-01 01:00:00 GMT+7
      vi.setSystemTime(new Date('2025-12-31T18:00:00Z'))
      
      const start = getStartOfDayGMT7()
      expect(start).toBe('2026-01-01T00:00:00+07:00')
    })
  })
})
