/**
 * ExpenseNotesEditor Component Tests
 *
 * Tests for the expense notes editing component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExpenseNotesEditor } from '@/components/expense-card/expense-notes-editor'
import type { Expense } from '@/lib/supabase'
import { hapticFeedbackMock } from '../../mocks/utils'

describe('ExpenseNotesEditor', () => {
  const mockExpense: Expense = {
    id: '1',
    user_id: 'user-1',
    amount: 500000,
    currency: 'VND',
    merchant: 'Starbucks',
    category: 'Food',
    transaction_date: new Date().toISOString(),
    source: 'manual',
    notes: 'Morning coffee with colleagues',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const defaultProps = {
    expense: mockExpense,
    onUpdate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render Notes label', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('should display existing notes', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      expect(screen.getByText(/"Morning coffee with colleagues"/)).toBeInTheDocument()
    })

    it('should display "No notes added yet" when no notes', () => {
      const noNotesExpense = { ...mockExpense, notes: null }
      render(<ExpenseNotesEditor {...defaultProps} expense={noNotesExpense} />)

      expect(screen.getByText('No notes added yet')).toBeInTheDocument()
    })

    it('should display empty notes text when notes is empty string', () => {
      const emptyNotesExpense = { ...mockExpense, notes: '' }
      render(<ExpenseNotesEditor {...defaultProps} expense={emptyNotesExpense} />)

      expect(screen.getByText('No notes added yet')).toBeInTheDocument()
    })

    it('should return null when onUpdate is not provided', () => {
      const { container } = render(<ExpenseNotesEditor expense={mockExpense} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Edit Button', () => {
    it('should display Edit button when notes exist', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    it('should display Add button when no notes', () => {
      const noNotesExpense = { ...mockExpense, notes: null }
      render(<ExpenseNotesEditor {...defaultProps} expense={noNotesExpense} />)

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('should trigger haptic feedback when clicking edit button', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(hapticFeedbackMock).toHaveBeenCalledWith('light')
    })
  })

  describe('Edit Mode', () => {
    it('should show textarea when edit button is clicked', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should show Save and Cancel buttons in edit mode', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should hide Edit button in edit mode', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })

    it('should populate textarea with existing notes', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Morning coffee with colleagues')
    })

    it('should have placeholder text in textarea', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.getByPlaceholderText('Add notes about this expense...')).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('should call onUpdate with updated expense when saving', async () => {
      const onUpdate = vi.fn()
      render(<ExpenseNotesEditor {...defaultProps} onUpdate={onUpdate} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Updated notes' } })

      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        ...mockExpense,
        notes: 'Updated notes',
      }))
    })

    it('should trigger haptic feedback when saving', async () => {
      const onUpdate = vi.fn()
      render(<ExpenseNotesEditor {...defaultProps} onUpdate={onUpdate} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'New notes' } })

      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      // haptic feedback is called when notes actually changed
      await waitFor(() => {
        expect(hapticFeedbackMock).toHaveBeenCalledWith('medium')
      })
    })

    it('should not call onUpdate if notes unchanged', async () => {
      const onUpdate = vi.fn()
      render(<ExpenseNotesEditor {...defaultProps} onUpdate={onUpdate} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      // Don't change the text
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should exit edit mode after saving', async () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Updated notes' } })

      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cancel Functionality', () => {
    it('should exit edit mode when cancel is clicked', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should reset notes to original when cancel is clicked', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Changed notes' } })

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      // Click edit again to verify notes were reset
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      expect(screen.getByRole('textbox')).toHaveValue('Morning coffee with colleagues')
    })

    it('should trigger haptic feedback when canceling', () => {
      render(<ExpenseNotesEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(hapticFeedbackMock).toHaveBeenCalledWith('light')
    })

    it('should not call onUpdate when canceling', () => {
      const onUpdate = vi.fn()
      render(<ExpenseNotesEditor {...defaultProps} onUpdate={onUpdate} />)

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Changed notes' } })

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Event Propagation', () => {
    it('should stop propagation when clicking edit button', () => {
      const parentClick = vi.fn()
      const { container } = render(
        <div onClick={parentClick}>
          <ExpenseNotesEditor {...defaultProps} />
        </div>
      )

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      // Parent click should not be called
      expect(parentClick).not.toHaveBeenCalled()
    })

    it('should stop propagation when clicking textarea', () => {
      const parentClick = vi.fn()
      render(
        <div onClick={parentClick}>
          <ExpenseNotesEditor {...defaultProps} />
        </div>
      )

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      fireEvent.click(screen.getByRole('textbox'))

      expect(parentClick).not.toHaveBeenCalled()
    })
  })
})
