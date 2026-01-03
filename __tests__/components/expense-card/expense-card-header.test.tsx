/**
 * ExpenseCardHeader Component Tests
 *
 * Tests for the expense card header component.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExpenseCardHeader, CATEGORY_CONFIG } from '@/components/expense-card/expense-card-header'
import type { Expense } from '@/lib/supabase'
import { formatCurrencyMock } from '../../mocks/utils'

describe('ExpenseCardHeader', () => {
  const mockExpense: Expense = {
    id: '1',
    user_id: 'user-1',
    amount: 500000,
    currency: 'VND',
    merchant: 'Starbucks',
    category: 'Food',
    transaction_date: new Date().toISOString(),
    source: 'manual',
    notes: 'Morning coffee',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const defaultProps = {
    expense: mockExpense,
    isExpanded: false,
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    formatCurrencyMock.mockImplementation((amount: number) => `${amount.toLocaleString('vi-VN')} ₫`)
  })

  describe('Rendering', () => {
    it('should render merchant name', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      expect(screen.getByText('Starbucks')).toBeInTheDocument()
    })

    it('should render category name', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      expect(screen.getByText('Food')).toBeInTheDocument()
    })

    it('should render formatted amount', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      // The formatCurrency mock is called
      expect(formatCurrencyMock).toHaveBeenCalledWith(500000, 'VND')
    })

    it('should render category emoji', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      expect(screen.getByText('🍔')).toBeInTheDocument()
    })

    it('should render date information', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      // Should have date and time displayed (check for common time format like AM/PM)
      expect(screen.getByText(/AM|PM/i)).toBeInTheDocument()
    })
  })

  describe('Category Configuration', () => {
    it('should display Food emoji for Food category', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      expect(screen.getByText('🍔')).toBeInTheDocument()
    })

    it('should display Transport emoji for Transport category', () => {
      const transportExpense = { ...mockExpense, category: 'Transport' }
      render(<ExpenseCardHeader {...defaultProps} expense={transportExpense} />)

      expect(screen.getByText('🚗')).toBeInTheDocument()
    })

    it('should display Shopping emoji for Shopping category', () => {
      const shoppingExpense = { ...mockExpense, category: 'Shopping' }
      render(<ExpenseCardHeader {...defaultProps} expense={shoppingExpense} />)

      expect(screen.getByText('🛍️')).toBeInTheDocument()
    })

    it('should display Other emoji for unknown category', () => {
      const unknownExpense = { ...mockExpense, category: 'Unknown' }
      render(<ExpenseCardHeader {...defaultProps} expense={unknownExpense} />)

      expect(screen.getByText('📦')).toBeInTheDocument()
    })

    it('should handle null category', () => {
      const nullCategoryExpense = { ...mockExpense, category: null } as unknown as Expense
      render(<ExpenseCardHeader {...defaultProps} expense={nullCategoryExpense} />)

      expect(screen.getByText('📦')).toBeInTheDocument()
    })
  })

  describe('Email Badge', () => {
    it('should display Auto badge for email-sourced expenses', () => {
      const emailExpense = { ...mockExpense, source: 'email' as const }
      render(<ExpenseCardHeader {...defaultProps} expense={emailExpense} />)

      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('should not display Auto badge for manual expenses', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      expect(screen.queryByText('Auto')).not.toBeInTheDocument()
    })
  })

  describe('Recent Expense Badge', () => {
    it('should display NEW badge for expenses within 24 hours', () => {
      const recentExpense = {
        ...mockExpense,
        transaction_date: new Date().toISOString(),
      }
      render(<ExpenseCardHeader {...defaultProps} expense={recentExpense} isExpanded={false} />)

      expect(screen.getByText('NEW')).toBeInTheDocument()
    })

    it('should not display NEW badge for old expenses', () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48)
      const oldExpense = {
        ...mockExpense,
        transaction_date: twoDaysAgo.toISOString(),
      }
      render(<ExpenseCardHeader {...defaultProps} expense={oldExpense} />)

      expect(screen.queryByText('NEW')).not.toBeInTheDocument()
    })

    it('should not display NEW badge when expanded', () => {
      const recentExpense = {
        ...mockExpense,
        transaction_date: new Date().toISOString(),
      }
      render(<ExpenseCardHeader {...defaultProps} expense={recentExpense} isExpanded={true} />)

      expect(screen.queryByText('NEW')).not.toBeInTheDocument()
    })
  })

  describe('Notes Preview', () => {
    it('should display notes when collapsed and notes exist', () => {
      render(<ExpenseCardHeader {...defaultProps} isExpanded={false} />)

      expect(screen.getByText(/Morning coffee/)).toBeInTheDocument()
    })

    it('should not display notes when expanded', () => {
      render(<ExpenseCardHeader {...defaultProps} isExpanded={true} />)

      // Notes should not be in the header when expanded
      const notesPreview = screen.queryByText(/💭.*Morning coffee/)
      expect(notesPreview).not.toBeInTheDocument()
    })

    it('should not display notes preview when no notes', () => {
      const noNotesExpense = { ...mockExpense, notes: null }
      render(<ExpenseCardHeader {...defaultProps} expense={noNotesExpense} />)

      expect(screen.queryByText('💭')).not.toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn()
      render(<ExpenseCardHeader {...defaultProps} onClick={onClick} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should be a button element', () => {
      render(<ExpenseCardHeader {...defaultProps} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Chevron Indicator', () => {
    it('should render chevron', () => {
      const { container } = render(<ExpenseCardHeader {...defaultProps} />)

      // Look for an SVG with the chevron pattern (lucide-react icons)
      const chevron = container.querySelector('svg')
      expect(chevron).toBeInTheDocument()
    })
  })

  describe('Category Config Export', () => {
    it('should export CATEGORY_CONFIG with all required categories', () => {
      expect(CATEGORY_CONFIG).toHaveProperty('Food')
      expect(CATEGORY_CONFIG).toHaveProperty('Transport')
      expect(CATEGORY_CONFIG).toHaveProperty('Shopping')
      expect(CATEGORY_CONFIG).toHaveProperty('Entertainment')
      expect(CATEGORY_CONFIG).toHaveProperty('Bills')
      expect(CATEGORY_CONFIG).toHaveProperty('Health')
      expect(CATEGORY_CONFIG).toHaveProperty('Other')
    })

    it('should have emoji, gradient and color for each category', () => {
      Object.values(CATEGORY_CONFIG).forEach((config) => {
        expect(config).toHaveProperty('emoji')
        expect(config).toHaveProperty('gradient')
        expect(config).toHaveProperty('color')
      })
    })
  })
})
