/**
 * RecurringView Component Tests
 *
 * Tests for the recurring expenses view component with tab switching
 * between active subscriptions and detected patterns.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecurringView } from '@/components/views/recurring-view'
import type { Expense, RecurringExpense } from '@/lib/supabase'
import type { DetectedRecurringExpense } from '@/lib/analytics/detect-recurring'
import { formatCurrencyMock } from '../../mocks/utils'
import { mockQuery, mockMutation, resetQueryMocks } from '../../mocks/tanstack-query'

// Mock the recurring expenses hooks
const mockUseRecurringExpenses = vi.fn()
const mockUseDetectedRecurringExpenses = vi.fn()
const mockUseSaveDetectedExpenses = vi.fn()
const mockUseDeleteRecurringExpense = vi.fn()
const mockUseSkipRecurringExpenseDate = vi.fn()

vi.mock('@/lib/hooks/use-recurring-expenses', () => ({
  useRecurringExpenses: () => mockUseRecurringExpenses(),
  useDetectedRecurringExpenses: () => mockUseDetectedRecurringExpenses(),
  useSaveDetectedExpenses: () => mockUseSaveDetectedExpenses(),
  useDeleteRecurringExpense: () => mockUseDeleteRecurringExpense(),
  useSkipRecurringExpenseDate: () => mockUseSkipRecurringExpenseDate(),
}))

// Mock the RecurringExpenseForm component
vi.mock('@/components/recurring-expenses/recurring-expense-form', () => ({
  RecurringExpenseForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="recurring-expense-form">
      <button onClick={onSuccess}>Submit Form</button>
    </div>
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('RecurringView', () => {
  const mockExpenses: Expense[] = [
    {
      id: 'exp-1',
      user_id: 'user-1',
      amount: 100000,
      category: 'Entertainment',
      merchant: 'Netflix',
      transaction_date: '2024-01-15',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      notes: null,
      currency: 'VND',
    },
    {
      id: 'exp-2',
      user_id: 'user-1',
      amount: 50000,
      category: 'Transport',
      merchant: 'Grab',
      transaction_date: '2024-01-10',
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-10T10:00:00Z',
      notes: null,
      currency: 'VND',
    },
  ]

  const mockSavedRecurring: RecurringExpense[] = [
    {
      id: 'rec-1',
      user_id: 'user-1',
      name: 'Netflix Subscription',
      amount: 100000,
      category: 'Entertainment',
      frequency: 'monthly',
      next_due_date: '2024-02-15',
      is_active: true,
      is_detected: false,
      currency: 'VND',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      start_date: '2024-01-15',
      confidence_score: null,
      source_merchant: null,
      last_occurrence_date: null,
      interval_days: null,
    },
    {
      id: 'rec-2',
      user_id: 'user-1',
      name: 'Spotify Premium',
      amount: 60000,
      category: 'Entertainment',
      frequency: 'monthly',
      next_due_date: '2024-02-20',
      is_active: true,
      is_detected: true,
      currency: 'VND',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      start_date: '2024-01-20',
      confidence_score: 85,
      source_merchant: 'Spotify',
      last_occurrence_date: '2024-01-20',
      interval_days: 30,
    },
  ]

  const mockDetectedRecurring: DetectedRecurringExpense[] = [
    {
      merchant: 'Grab',
      category: 'Transport',
      frequency: 'weekly',
      intervalDays: 7,
      averageAmount: 50000,
      totalSpentThisYear: 200000,
      confidence: 75,
      transactions: [
        {
          id: 'exp-2',
          user_id: 'user-1',
          amount: 50000,
          category: 'Transport',
          merchant: 'Grab',
          transaction_date: '2024-01-10',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z',
          notes: null,
          currency: 'VND',
        },
      ],
      nextExpected: '2024-02-01',
      missedPayment: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryMocks()
    formatCurrencyMock.mockImplementation((amount: number) => `${amount.toLocaleString('vi-VN')} ₫`)
  })

  describe('Rendering', () => {
    it('should render the component header', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByText('Recurring Expenses')).toBeInTheDocument()
      expect(screen.getByText('Manage your subscriptions and recurring payments')).toBeInTheDocument()
    })

    it('should render the Add button', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('should render tab buttons', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: mockSavedRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: mockDetectedRecurring, isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByRole('button', { name: /Active \(2\)/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Detected \(1\)/i })).toBeInTheDocument()
    })
  })

  describe('Tab Switching', () => {
    it('should default to the Active tab', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: mockSavedRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByText('Your Subscriptions')).toBeInTheDocument()
    })

    it('should switch to Detected tab when clicked', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: mockDetectedRecurring, isLoading: false })
      mockUseSaveDetectedExpenses.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      })

      render(<RecurringView expenses={mockExpenses} />)

      const detectedTab = screen.getByRole('button', { name: /Detected/i })
      fireEvent.click(detectedTab)

      expect(screen.getByText('Detected Patterns')).toBeInTheDocument()
    })

    it('should switch back to Active tab', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: mockSavedRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: mockDetectedRecurring, isLoading: false })
      mockUseSaveDetectedExpenses.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      })

      render(<RecurringView expenses={mockExpenses} />)

      // Switch to Detected
      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))
      expect(screen.getByText('Detected Patterns')).toBeInTheDocument()

      // Switch back to Active
      fireEvent.click(screen.getByRole('button', { name: /Active \(2\)/i }))
      expect(screen.getByText('Your Subscriptions')).toBeInTheDocument()
    })
  })

  describe('Active Recurring Tab', () => {
    it('should display saved recurring expenses', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: mockSavedRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByText('Netflix Subscription')).toBeInTheDocument()
      expect(screen.getByText('Spotify Premium')).toBeInTheDocument()
    })

    it('should display empty state when no active subscriptions', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByText('No Active Subscriptions')).toBeInTheDocument()
      expect(screen.getByText('Add recurring expenses manually or save detected patterns')).toBeInTheDocument()
    })

    it('should calculate and display monthly estimate', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: mockSavedRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Both are monthly, so total monthly = 100000 + 60000 = 160000
      expect(formatCurrencyMock).toHaveBeenCalledWith(160000, 'VND')
    })

    it('should calculate and display yearly estimate', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: mockSavedRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Both are monthly, so total yearly = (100000 + 60000) * 12 = 1920000
      expect(formatCurrencyMock).toHaveBeenCalledWith(1920000, 'VND')
    })

    it('should display overdue warning when payment is overdue', () => {
      const overdueRecurring: RecurringExpense[] = [
        {
          ...mockSavedRecurring[0],
          next_due_date: '2023-01-01', // Past date
        },
      ]
      mockUseRecurringExpenses.mockReturnValue({ data: overdueRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByText(/1 payment overdue/i)).toBeInTheDocument()
    })
  })

  describe('Detected Recurring Tab', () => {
    beforeEach(() => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: mockDetectedRecurring, isLoading: false })
      mockUseSaveDetectedExpenses.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      })
    })

    it('should display detected recurring patterns', () => {
      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      expect(screen.getByText('Grab')).toBeInTheDocument()
    })

    it('should display empty state when no patterns detected', () => {
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      expect(screen.getByText('No Patterns Detected')).toBeInTheDocument()
      expect(screen.getByText('Add more expenses to detect recurring patterns')).toBeInTheDocument()
    })

    it('should display Save All button when patterns are detected', () => {
      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      expect(screen.getByRole('button', { name: /Save All Detected \(1\)/i })).toBeInTheDocument()
    })

    it('should call save mutation when Save All is clicked', () => {
      const mockSaveMutate = vi.fn()
      mockUseSaveDetectedExpenses.mockReturnValue({
        mutate: mockSaveMutate,
        isPending: false,
      })

      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))
      fireEvent.click(screen.getByRole('button', { name: /Save All Detected/i }))

      expect(mockSaveMutate).toHaveBeenCalledWith(mockDetectedRecurring)
    })

    it('should display confidence percentage', () => {
      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      expect(screen.getByText('Confidence: 75%')).toBeInTheDocument()
    })
  })

  describe('Add Dialog', () => {
    beforeEach(() => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
    })

    it('should open the create dialog when Add button is clicked', async () => {
      render(<RecurringView expenses={mockExpenses} />)

      const addButton = screen.getByRole('button', { name: /add/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add Recurring Expense')).toBeInTheDocument()
        expect(screen.getByText('Create a new recurring expense or subscription')).toBeInTheDocument()
      })
    })

    it('should display the form in the dialog', async () => {
      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByTestId('recurring-expense-form')).toBeInTheDocument()
      })
    })

    it('should close dialog when form submission succeeds', async () => {
      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /add/i }))

      await waitFor(() => {
        expect(screen.getByTestId('recurring-expense-form')).toBeInTheDocument()
      })

      // Simulate form submission
      const submitButton = screen.getByRole('button', { name: /submit form/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Add Recurring Expense')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner for active tab', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: true })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show loading spinner for detected tab', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: true })

      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Stats Calculation', () => {
    it('should calculate stats for weekly recurring expenses', () => {
      const weeklyRecurring: RecurringExpense[] = [
        {
          ...mockSavedRecurring[0],
          frequency: 'weekly',
          amount: 50000,
        },
      ]
      mockUseRecurringExpenses.mockReturnValue({ data: weeklyRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Yearly for weekly: 50000 * 52 = 2600000
      expect(formatCurrencyMock).toHaveBeenCalledWith(2600000, 'VND')
    })

    it('should calculate stats for biweekly recurring expenses', () => {
      const biweeklyRecurring: RecurringExpense[] = [
        {
          ...mockSavedRecurring[0],
          frequency: 'biweekly',
          amount: 100000,
        },
      ]
      mockUseRecurringExpenses.mockReturnValue({ data: biweeklyRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Yearly for biweekly: 100000 * 26 = 2600000
      expect(formatCurrencyMock).toHaveBeenCalledWith(2600000, 'VND')
    })

    it('should calculate stats for quarterly recurring expenses', () => {
      const quarterlyRecurring: RecurringExpense[] = [
        {
          ...mockSavedRecurring[0],
          frequency: 'quarterly',
          amount: 300000,
        },
      ]
      mockUseRecurringExpenses.mockReturnValue({ data: quarterlyRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Yearly for quarterly: 300000 * 4 = 1200000
      expect(formatCurrencyMock).toHaveBeenCalledWith(1200000, 'VND')
    })

    it('should calculate stats for yearly recurring expenses', () => {
      const yearlyRecurring: RecurringExpense[] = [
        {
          ...mockSavedRecurring[0],
          frequency: 'yearly',
          amount: 500000,
        },
      ]
      mockUseRecurringExpenses.mockReturnValue({ data: yearlyRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Yearly for yearly: 500000 * 1 = 500000
      expect(formatCurrencyMock).toHaveBeenCalledWith(500000, 'VND')
    })

    it('should count high confidence detected patterns', () => {
      const highConfidenceRecurring: RecurringExpense[] = [
        {
          ...mockSavedRecurring[0],
          is_detected: true,
          confidence_score: 85,
        },
        {
          ...mockSavedRecurring[1],
          is_detected: true,
          confidence_score: 75, // Below 80 threshold
        },
      ]
      mockUseRecurringExpenses.mockReturnValue({ data: highConfidenceRecurring, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      // Only one with confidence >= 80 should be counted
      expect(screen.getByText(/2 active/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty expense list', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })

      render(<RecurringView expenses={[]} />)

      expect(screen.getByText('Recurring Expenses')).toBeInTheDocument()
    })

    it('should handle undefined data from hooks', () => {
      mockUseRecurringExpenses.mockReturnValue({ data: undefined, isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: undefined, isLoading: false })

      render(<RecurringView expenses={mockExpenses} />)

      expect(screen.getByText('No Active Subscriptions')).toBeInTheDocument()
    })

    it('should handle Save All with disabled state when pending', () => {
      const mockSaveMutate = vi.fn()
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: mockDetectedRecurring, isLoading: false })
      mockUseSaveDetectedExpenses.mockReturnValue({
        mutate: mockSaveMutate,
        isPending: true,
      })

      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      const saveAllButton = screen.getByRole('button', { name: /Save All Detected/i })
      expect(saveAllButton).toBeDisabled()
    })

    it('should not save when detected list is empty', () => {
      const mockSaveMutate = vi.fn()
      mockUseRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseDetectedRecurringExpenses.mockReturnValue({ data: [], isLoading: false })
      mockUseSaveDetectedExpenses.mockReturnValue({
        mutate: mockSaveMutate,
        isPending: false,
      })

      render(<RecurringView expenses={mockExpenses} />)

      fireEvent.click(screen.getByRole('button', { name: /Detected/i }))

      // No Save All button should be visible when list is empty
      expect(screen.queryByRole('button', { name: /Save All Detected/i })).not.toBeInTheDocument()
    })
  })
})
