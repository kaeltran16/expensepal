import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkoutTodayHeader } from '@/components/workouts/WorkoutTodayHeader'

vi.mock('@/lib/hooks/use-achievements', () => ({
  useWorkoutStreak: vi.fn(() => ({
    data: { current_streak: 3, longest_streak: 7 },
    isLoading: false,
  })),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return {
    ...actual,
    hapticFeedback: vi.fn(),
  }
})

const baseProps = {
  todayWorkout: null,
  todayCompleted: false,
  completedCount: 0,
  weeklyWorkoutCount: 2,
  weeklyGoal: 3,
  onStartEmptyWorkout: vi.fn(),
  onGenerateWorkout: vi.fn(),
}

describe('WorkoutTodayHeader', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should render unscheduled state when no workout is scheduled', () => {
    render(<WorkoutTodayHeader {...baseProps} />)
    expect(screen.getByText('What are we training?')).toBeInTheDocument()
    expect(screen.getByText(/Generate Workout/)).toBeInTheDocument()
  })

  it('should render scheduled state when today has a workout', () => {
    const template = { name: 'Push Day', exercises: [{}, {}, {}], duration_minutes: 45 }
    render(
      <WorkoutTodayHeader
        {...baseProps}
        todayWorkout={{ template, scheduled_date: '2026-04-07', status: 'scheduled' } as any}
        onStartWorkout={vi.fn()}
      />
    )
    expect(screen.getByText('Push Day')).toBeInTheDocument()
    expect(screen.getByText(/3 exercises/)).toBeInTheDocument()
    expect(screen.getByText(/Start Workout/)).toBeInTheDocument()
  })

  it('should render completed state', () => {
    render(
      <WorkoutTodayHeader
        {...baseProps}
        todayCompleted={true}
        completedCount={1}
      />
    )
    expect(screen.getByText('Workout Complete!')).toBeInTheDocument()
  })

  it('should show progress ring with correct counts', () => {
    render(<WorkoutTodayHeader {...baseProps} weeklyWorkoutCount={2} weeklyGoal={3} />)
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('should call onStartEmptyWorkout when Empty button is clicked', () => {
    render(<WorkoutTodayHeader {...baseProps} />)
    fireEvent.click(screen.getByText('Empty'))
    expect(baseProps.onStartEmptyWorkout).toHaveBeenCalled()
  })

  it('should show streak when present', () => {
    render(<WorkoutTodayHeader {...baseProps} />)
    expect(screen.getByText(/3 day streak/)).toBeInTheDocument()
  })
})
