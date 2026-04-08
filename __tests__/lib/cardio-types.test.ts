import { describe, it, expect } from 'vitest'
import type {
  CardioExerciseType,
  CardioPlanStatus,
  SegmentType,
  CardioSegmentData,
  CardioSessionData,
  CardioPlanData,
  CardioWeekData,
} from '@/lib/types/cardio'
import { formatPace, formatDistance, computeCardioWeeklyStats } from '@/lib/types/cardio'

describe('formatPace', () => {
  it('converts km/h to min/km pace string', () => {
    // 10 km/h = 6 min/km
    expect(formatPace(10)).toBe('6:00')
  })

  it('handles fractional pace', () => {
    // 8 km/h = 7.5 min/km = 7:30
    expect(formatPace(8)).toBe('7:30')
  })

  it('returns "--" for zero speed', () => {
    expect(formatPace(0)).toBe('--')
  })
})

describe('formatDistance', () => {
  it('formats distance with one decimal', () => {
    expect(formatDistance(5.123)).toBe('5.1')
  })

  it('formats zero distance', () => {
    expect(formatDistance(0)).toBe('0.0')
  })
})

describe('computeCardioWeeklyStats', () => {
  it('computes totals from sessions', () => {
    const sessions = [
      { duration_minutes: 30, total_distance: 5, avg_speed: 10 },
      { duration_minutes: 25, total_distance: 3.5, avg_speed: 8.4 },
    ] as Array<{ duration_minutes: number; total_distance: number | null; avg_speed: number | null }>

    const stats = computeCardioWeeklyStats(sessions)
    expect(stats.totalDistance).toBeCloseTo(8.5)
    expect(stats.totalMinutes).toBe(55)
    expect(stats.avgSpeed).toBeCloseTo(9.27, 1)
  })

  it('handles empty sessions', () => {
    const stats = computeCardioWeeklyStats([])
    expect(stats.totalDistance).toBe(0)
    expect(stats.totalMinutes).toBe(0)
    expect(stats.avgSpeed).toBe(0)
  })
})
