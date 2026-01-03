/**
 * DeleteExpenseDialog Component Tests
 *
 * Tests for the delete expense confirmation dialog.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeleteExpenseDialog } from '@/components/expense-card/delete-expense-dialog'
import type { Expense } from '@/lib/supabase'
import { formatCurrencyMock, hapticFeedbackMock } from '../../mocks/utils'

describe('DeleteExpenseDialog', () => {
  const mockExpense: Expense = {
    id: '1',
    user_id: 'user-1',
    amount: 500000,
    currency: 'VND',
    merchant: 'Starbucks',
    category: 'Food',
    transaction_date: new Date().toISOString(),
    source: 'manual',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const defaultProps = {
    expense: mockExpense,
    open: true,
    onOpenChange: vi.fn(),
    onConfirmDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    formatCurrencyMock.mockImplementation((amount: number) => `${amount.toLocaleString('vi-VN')} ₫`)
  })

  describe('Rendering', () => {
    it('should render dialog when open is true', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByText('Delete Expense?')).toBeInTheDocument()
    })

    it('should not render dialog when open is false', () => {
      render(<DeleteExpenseDialog {...defaultProps} open={false} />)

      expect(screen.queryByText('Delete Expense?')).not.toBeInTheDocument()
    })

    it('should display merchant name', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByText('Starbucks')).toBeInTheDocument()
    })

    it('should display formatted amount', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(formatCurrencyMock).toHaveBeenCalledWith(500000, 'VND')
    })

    it('should display warning message', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })
  })

  describe('Buttons', () => {
    it('should display Delete Expense button', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /delete expense/i })).toBeInTheDocument()
    })

    it('should display Cancel button', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Delete Action', () => {
    it('should call onConfirmDelete when delete button is clicked', () => {
      const onConfirmDelete = vi.fn()
      render(<DeleteExpenseDialog {...defaultProps} onConfirmDelete={onConfirmDelete} />)

      fireEvent.click(screen.getByRole('button', { name: /delete expense/i }))

      expect(onConfirmDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cancel Action', () => {
    it('should trigger haptic feedback when cancel is clicked', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(hapticFeedbackMock).toHaveBeenCalledWith('light')
    })
  })

  describe('Different Expenses', () => {
    it('should display correct info for different expense', () => {
      const differentExpense: Expense = {
        ...mockExpense,
        amount: 1500000,
        merchant: 'Grab',
        currency: 'VND',
      }
      render(<DeleteExpenseDialog {...defaultProps} expense={differentExpense} />)

      expect(screen.getByText('Grab')).toBeInTheDocument()
      expect(formatCurrencyMock).toHaveBeenCalledWith(1500000, 'VND')
    })

    it('should handle expense with long merchant name', () => {
      const longNameExpense: Expense = {
        ...mockExpense,
        merchant: 'Very Long Merchant Name That Should Still Display',
      }
      render(<DeleteExpenseDialog {...defaultProps} expense={longNameExpense} />)

      expect(screen.getByText('Very Long Merchant Name That Should Still Display')).toBeInTheDocument()
    })
  })

  describe('Event Propagation', () => {
    it('should stop propagation on dialog content click', () => {
      const parentClick = vi.fn()
      render(
        <div onClick={parentClick}>
          <DeleteExpenseDialog {...defaultProps} />
        </div>
      )

      // Click on dialog content
      const dialogContent = screen.getByRole('alertdialog')
      if (dialogContent) {
        fireEvent.click(dialogContent)
        expect(parentClick).not.toHaveBeenCalled()
      }
    })
  })

  describe('Accessibility', () => {
    it('should have alertdialog role', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('should have accessible title', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByText('Delete Expense?')).toBeInTheDocument()
    })

    it('should have accessible description', () => {
      render(<DeleteExpenseDialog {...defaultProps} />)

      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
    })
  })
})
