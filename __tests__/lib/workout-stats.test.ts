import { describe, it, expect } from 'vitest'
import {
  getMuscleGroupsHitThisWeek,
  computeWeeklyVolume,
  computeVolumeTrend,
} from '@/lib/workout-stats'

describe('getMuscleGroupsHitThisWeek', () => {
  it('should map granular muscle groups to display categories', () => {
    const exerciseMuscleGroups = ['chest', 'triceps', 'quadriceps']
    const result = getMuscleGroupsHitThisWeek(exerciseMuscleGroups)
    expect(result).toEqual(
      expect.arrayContaining(['Chest', 'Arms', 'Legs'])
    )
    expect(result).toHaveLength(3)
  })

  it('should deduplicate when multiple sub-groups map to same category', () => {
    const exerciseMuscleGroups = ['quadriceps', 'hamstrings', 'glutes', 'calves']
    const result = getMuscleGroupsHitThisWeek(exerciseMuscleGroups)
    expect(result).toEqual(['Legs'])
  })

  it('should return empty array for no muscle groups', () => {
    const result = getMuscleGroupsHitThisWeek([])
    expect(result).toEqual([])
  })

  it('should handle unknown muscle groups gracefully', () => {
    const result = getMuscleGroupsHitThisWeek(['unknown_muscle'])
    expect(result).toEqual([])
  })
})

describe('computeWeeklyVolume', () => {
  it('should sum total_volume from workouts', () => {
    const workouts = [
      { total_volume: 5000 },
      { total_volume: 3000 },
      { total_volume: null },
    ] as Array<{ total_volume: number | null }>
    expect(computeWeeklyVolume(workouts)).toBe(8000)
  })

  it('should return 0 for empty array', () => {
    expect(computeWeeklyVolume([])).toBe(0)
  })

  it('should return 0 when all volumes are null', () => {
    const workouts = [
      { total_volume: null },
      { total_volume: null },
    ] as Array<{ total_volume: number | null }>
    expect(computeWeeklyVolume(workouts)).toBe(0)
  })
})

describe('computeVolumeTrend', () => {
  it('should compute positive percentage change', () => {
    expect(computeVolumeTrend(11000, 10000)).toBe(10)
  })

  it('should compute negative percentage change', () => {
    expect(computeVolumeTrend(9000, 10000)).toBe(-10)
  })

  it('should return 0 when previous is 0', () => {
    expect(computeVolumeTrend(5000, 0)).toBe(0)
  })

  it('should return 0 when both are 0', () => {
    expect(computeVolumeTrend(0, 0)).toBe(0)
  })

  it('should round to nearest integer', () => {
    expect(computeVolumeTrend(10333, 10000)).toBe(3)
  })
})
