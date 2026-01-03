/**
 * SavingsGoalProgress Component Tests
 *
 * Tests for the savings goal progress bar component.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { SavingsGoalProgress } from '@/components/goals/savings-goal-progress'
import { formatCurrencyMock } from '../../mocks/utils'

describe('SavingsGoalProgress', () => {
  const defaultProps = {
    progress: 50,
    remaining: 5000000,
    isCompleted: false,
  }

  beforeEach(() => {
    formatCurrencyMock.mockImplementation((amount: number) => `${amount.toLocaleString('vi-VN')} ₫`)
  })

  describe('Rendering', () => {
    it('should render progress percentage', () => {
      render(<SavingsGoalProgress {...defaultProps} />)

      expect(screen.getByText('50% complete')).toBeInTheDocument()
    })

    it('should render remaining amount', () => {
      render(<SavingsGoalProgress {...defaultProps} />)

      expect(formatCurrencyMock).toHaveBeenCalledWith(5000000, 'VND')
    })

    it('should display "to go" text when not completed', () => {
      render(<SavingsGoalProgress {...defaultProps} />)

      expect(screen.getByText(/to go/)).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('should render progress bar element', () => {
      const { container } = render(<SavingsGoalProgress {...defaultProps} />)

      const progressBar = container.querySelector('.h-2.bg-secondary')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('Completion State', () => {
    it('should display celebration message when completed', () => {
      render(<SavingsGoalProgress {...defaultProps} isCompleted={true} />)

      expect(screen.getByText('Goal reached! 🎉')).toBeInTheDocument()
    })

    it('should not display remaining amount when completed', () => {
      render(<SavingsGoalProgress {...defaultProps} isCompleted={true} />)

      expect(screen.queryByText(/to go/)).not.toBeInTheDocument()
    })

    it('should display 100% when completed', () => {
      render(<SavingsGoalProgress progress={100} remaining={0} isCompleted={true} />)

      expect(screen.getByText('100% complete')).toBeInTheDocument()
    })
  })

  describe('Progress Calculation', () => {
    it('should display 0% for zero progress', () => {
      render(<SavingsGoalProgress progress={0} remaining={10000000} isCompleted={false} />)

      expect(screen.getByText('0% complete')).toBeInTheDocument()
    })

    it('should display correct percentage for partial progress', () => {
      render(<SavingsGoalProgress progress={75} remaining={2500000} isCompleted={false} />)

      expect(screen.getByText('75% complete')).toBeInTheDocument()
    })

    it('should round percentage to whole number', () => {
      render(<SavingsGoalProgress progress={33.33} remaining={6666667} isCompleted={false} />)

      expect(screen.getByText('33% complete')).toBeInTheDocument()
    })

    it('should handle very small progress', () => {
      render(<SavingsGoalProgress progress={0.5} remaining={9950000} isCompleted={false} />)

      expect(screen.getByText('1% complete')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle progress over 100%', () => {
      render(<SavingsGoalProgress progress={150} remaining={-5000000} isCompleted={true} />)

      // Should cap at 100% visually but show actual percentage
      expect(screen.getByText('150% complete')).toBeInTheDocument()
    })

    it('should handle zero remaining', () => {
      render(<SavingsGoalProgress progress={100} remaining={0} isCompleted={true} />)

      expect(screen.getByText('Goal reached! 🎉')).toBeInTheDocument()
    })

    it('should handle negative remaining (over-saved)', () => {
      render(<SavingsGoalProgress progress={110} remaining={-1000000} isCompleted={true} />)

      expect(screen.getByText('Goal reached! 🎉')).toBeInTheDocument()
    })
  })
})
