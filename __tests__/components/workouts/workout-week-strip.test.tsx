import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkoutWeekStrip } from '@/components/workouts/WorkoutWeekStrip'

vi.mock('@/lib/hooks/use-workout-schedule', () => ({
  useThisWeekScheduledWorkouts: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}))

vi.mock('@/lib/utils', () => ({
  hapticFeedback: vi.fn(),
}))

describe('WorkoutWeekStrip', () => {
  it('should render 7 days of the week', () => {
    render(
      <WorkoutWeekStrip
        recentWorkouts={[]}
        onOpenCalendar={vi.fn()}
      />
    )
    expect(screen.getByText('This Week')).toBeInTheDocument()
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    for (const day of days) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('should show Full Calendar link', () => {
    const onOpenCalendar = vi.fn()
    render(
      <WorkoutWeekStrip
        recentWorkouts={[]}
        onOpenCalendar={onOpenCalendar}
      />
    )
    expect(screen.getByText('Full Calendar')).toBeInTheDocument()
  })
})
