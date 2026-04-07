import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkoutQuickStats } from '@/components/workouts/WorkoutQuickStats'
import type { Workout } from '@/lib/supabase'

const makeWorkout = (overrides: Partial<Workout>): Workout =>
  ({
    id: '1',
    completed_at: '2026-04-07T10:00:00Z',
    duration_minutes: 45,
    total_volume: 5000,
    ...overrides,
  } as Workout)

describe('WorkoutQuickStats', () => {
  it('should display workout count', () => {
    const workouts = [makeWorkout({}), makeWorkout({ id: '2' })]
    render(<WorkoutQuickStats weekWorkouts={workouts} prevWeekWorkouts={[]} />)
    expect(screen.getByText('Workouts')).toBeInTheDocument()
  })

  it('should display volume label', () => {
    render(<WorkoutQuickStats weekWorkouts={[makeWorkout({})]} prevWeekWorkouts={[]} />)
    expect(screen.getByText('Volume')).toBeInTheDocument()
  })

  it('should display trend label', () => {
    render(<WorkoutQuickStats weekWorkouts={[]} prevWeekWorkouts={[]} />)
    expect(screen.getByText('vs Last Wk')).toBeInTheDocument()
  })

  it('should handle empty workouts', () => {
    render(<WorkoutQuickStats weekWorkouts={[]} prevWeekWorkouts={[]} />)
    expect(screen.getByText('Workouts')).toBeInTheDocument()
  })
})
