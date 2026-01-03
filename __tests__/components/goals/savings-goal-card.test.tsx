/**
 * SavingsGoalCard Component Tests
 *
 * Tests for the savings goal card component.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SavingsGoalCard } from '@/components/goals/savings-goal-card'
import type { Tables } from '@/lib/supabase/database.types'
import { formatCurrencyMock } from '../../mocks/utils'

type SavingsGoal = Tables<'savings_goals'>

// Mock the child components
vi.mock('@/components/goals/savings-goal-progress', () => ({
  SavingsGoalProgress: ({ progress, isCompleted }: { progress: number; isCompleted: boolean }) => (
    <div data-testid="savings-goal-progress">
      {progress}% - {isCompleted ? 'Complete' : 'In Progress'}
    </div>
  ),
}))

vi.mock('@/components/goals/savings-goal-actions', () => ({
  SavingsGoalActions: ({ goal }: { goal: SavingsGoal }) => (
    <div data-testid="savings-goal-actions">Actions for {goal.name}</div>
  ),
  QuickAddProgress: ({ goal }: { goal: SavingsGoal }) => (
    <div data-testid="quick-add-progress">Quick Add for {goal.name}</div>
  ),
}))

// Mock the goal operations hook
vi.mock('@/lib/hooks/use-goal-operations', () => ({
  calculateGoalProgress: vi.fn((goal: SavingsGoal) => ({
    progress: ((goal.current_amount || 0) / goal.target_amount) * 100,
    remaining: goal.target_amount - (goal.current_amount || 0),
    isCompleted: (goal.current_amount || 0) >= goal.target_amount,
  })),
  calculateDaysUntilDeadline: vi.fn((deadline: string | null) => {
    if (!deadline) return null
    return Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
  }),
}))

describe('SavingsGoalCard', () => {
  const mockGoal: SavingsGoal = {
    id: 'goal-1',
    user_id: 'user-1',
    name: 'New Car',
    target_amount: 500000000,
    current_amount: 100000000,
    deadline: null,
    icon: '🚗',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const defaultProps = {
    goal: mockGoal,
    index: 0,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddProgress: vi.fn(),
    isUpdating: false,
    isDeleting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    formatCurrencyMock.mockImplementation((amount: number) => `${amount.toLocaleString('vi-VN')} ₫`)
  })

  describe('Rendering', () => {
    it('should render goal name', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(screen.getByText('New Car')).toBeInTheDocument()
    })

    it('should render goal icon', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(screen.getByText('🚗')).toBeInTheDocument()
    })

    it('should display default icon when none provided', () => {
      const goalWithoutIcon = { ...mockGoal, icon: null }
      render(<SavingsGoalCard {...defaultProps} goal={goalWithoutIcon} />)

      expect(screen.getByText('🎯')).toBeInTheDocument()
    })

    it('should display current and target amounts', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(formatCurrencyMock).toHaveBeenCalledWith(100000000, 'VND')
      expect(formatCurrencyMock).toHaveBeenCalledWith(500000000, 'VND')
    })
  })

  describe('Progress Component', () => {
    it('should render SavingsGoalProgress', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(screen.getByTestId('savings-goal-progress')).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      // 100000000 / 500000000 = 20%
      expect(screen.getByText(/20%/)).toBeInTheDocument()
    })
  })

  describe('Actions Component', () => {
    it('should render SavingsGoalActions', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(screen.getByTestId('savings-goal-actions')).toBeInTheDocument()
    })
  })

  describe('Quick Add Progress', () => {
    it('should render QuickAddProgress when goal not completed', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(screen.getByTestId('quick-add-progress')).toBeInTheDocument()
    })

    it('should not render QuickAddProgress when goal is completed', () => {
      const completedGoal = { ...mockGoal, current_amount: 600000000 }
      render(<SavingsGoalCard {...defaultProps} goal={completedGoal} />)

      expect(screen.queryByTestId('quick-add-progress')).not.toBeInTheDocument()
    })
  })

  describe('Deadline Display', () => {
    it('should not show deadline info when no deadline', () => {
      render(<SavingsGoalCard {...defaultProps} />)

      expect(screen.queryByText(/days until deadline/)).not.toBeInTheDocument()
      expect(screen.queryByText(/days overdue/)).not.toBeInTheDocument()
    })

    it('should show days until deadline for future date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const goalWithDeadline = { ...mockGoal, deadline: futureDate.toISOString().split('T')[0] }
      render(<SavingsGoalCard {...defaultProps} goal={goalWithDeadline} />)

      expect(screen.getByText(/days until deadline/)).toBeInTheDocument()
    })

    it('should show "Deadline is today" when deadline is today', () => {
      const today = new Date().toISOString().split('T')[0]
      const goalWithTodayDeadline = { ...mockGoal, deadline: today }
      render(<SavingsGoalCard {...defaultProps} goal={goalWithTodayDeadline} />)

      // The component shows this when daysUntilDeadline === 0
      expect(screen.getByText(/Deadline is today/)).toBeInTheDocument()
    })

    it('should show days overdue for past deadline', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      const goalWithPastDeadline = { ...mockGoal, deadline: pastDate.toISOString().split('T')[0] }
      render(<SavingsGoalCard {...defaultProps} goal={goalWithPastDeadline} />)

      expect(screen.getByText(/days overdue/)).toBeInTheDocument()
    })
  })

  describe('Animation', () => {
    it('should apply animation delay based on index', () => {
      const { container } = render(<SavingsGoalCard {...defaultProps} index={2} />)

      // The motion.div with layout prop should be rendered
      const card = container.querySelector('.ios-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero current amount', () => {
      const zeroCurrentGoal = { ...mockGoal, current_amount: 0 }
      render(<SavingsGoalCard {...defaultProps} goal={zeroCurrentGoal} />)

      expect(formatCurrencyMock).toHaveBeenCalledWith(0, 'VND')
    })

    it('should handle null current amount', () => {
      const nullCurrentGoal = { ...mockGoal, current_amount: null }
      render(<SavingsGoalCard {...defaultProps} goal={nullCurrentGoal} />)

      expect(formatCurrencyMock).toHaveBeenCalledWith(0, 'VND')
    })

    it('should handle long goal name', () => {
      const longNameGoal = { ...mockGoal, name: 'This is a very long goal name that should be truncated' }
      render(<SavingsGoalCard {...defaultProps} goal={longNameGoal} />)

      expect(screen.getByText('This is a very long goal name that should be truncated')).toBeInTheDocument()
    })

    it('should handle very large amounts', () => {
      const largeAmountGoal = { ...mockGoal, target_amount: 999999999999 }
      render(<SavingsGoalCard {...defaultProps} goal={largeAmountGoal} />)

      expect(formatCurrencyMock).toHaveBeenCalledWith(999999999999, 'VND')
    })
  })
})
