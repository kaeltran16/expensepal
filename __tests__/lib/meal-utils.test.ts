import { getMealTimeFromDate } from '@/lib/meal-utils'
import { describe, expect, it } from 'vitest'

describe('getMealTimeFromDate', () => {
  // Helper to create a date string in UTC that corresponds to a specific time in GMT+7
  // Example: 08:00 GMT+7 is 01:00 UTC
  const createDate = (hourGMT7: number) => {
    const date = new Date('2025-01-01T00:00:00Z')
    // Subtract 7 hours to get UTC time
    date.setUTCHours(hourGMT7 - 7)
    return date.toISOString()
  }

  it('should identify breakfast (06:00 - 10:59)', () => {
    expect(getMealTimeFromDate(createDate(6))).toBe('breakfast')
    expect(getMealTimeFromDate(createDate(8))).toBe('breakfast')
    expect(getMealTimeFromDate(createDate(10))).toBe('breakfast')
  })

  it('should identify lunch (11:00 - 15:59)', () => {
    expect(getMealTimeFromDate(createDate(11))).toBe('lunch')
    expect(getMealTimeFromDate(createDate(13))).toBe('lunch')
    expect(getMealTimeFromDate(createDate(15))).toBe('lunch')
  })

  it('should identify dinner (16:00 - 21:59)', () => {
    expect(getMealTimeFromDate(createDate(16))).toBe('dinner')
    expect(getMealTimeFromDate(createDate(19))).toBe('dinner')
    expect(getMealTimeFromDate(createDate(21))).toBe('dinner')
  })

  it('should identify snack (other times)', () => {
    expect(getMealTimeFromDate(createDate(5))).toBe('snack') // Early morning
    expect(getMealTimeFromDate(createDate(22))).toBe('snack') // Late night
    expect(getMealTimeFromDate(createDate(23))).toBe('snack') // Late night
    expect(getMealTimeFromDate(createDate(2))).toBe('snack')  // Middle of night
  })

  it('should handle date wrapping correctly', () => {
    // 01:00 GMT+7 is 18:00 UTC previous day
    // The function logic (utc + 7) % 24 handles this: (18 + 7) % 24 = 25 % 24 = 1
    const lateNightUTC = new Date('2025-01-01T18:00:00Z') // 01:00 GMT+7 next day
    expect(getMealTimeFromDate(lateNightUTC)).toBe('snack')
  })

  it('should accept Date objects', () => {
    const date = new Date('2025-01-01T01:00:00Z') // 08:00 GMT+7
    expect(getMealTimeFromDate(date)).toBe('breakfast')
  })
})
