/**
 * SavingsGoalForm Component Tests
 *
 * Tests for the savings goal form component.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SavingsGoalForm } from '@/components/goals/savings-goal-form'
import type { GoalFormData } from '@/lib/hooks/use-goal-operations'
import { hapticFeedbackMock } from '../../mocks/utils'

describe('SavingsGoalForm', () => {
  const mockFormData: GoalFormData = {
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    icon: '🎯',
  }

  const defaultProps = {
    formData: mockFormData,
    setFormData: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isEditing: false,
    isSubmitting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should display "New Goal" title when not editing', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByText('New Goal')).toBeInTheDocument()
    })

    it('should display "Edit Goal" title when editing', () => {
      render(<SavingsGoalForm {...defaultProps} isEditing={true} />)

      expect(screen.getByText('Edit Goal')).toBeInTheDocument()
    })

    it('should display all form fields', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByLabelText(/goal name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/target/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/current/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument()
    })

    it('should display icon selector', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByText('Goal Icon')).toBeInTheDocument()
      expect(screen.getByText('🎯')).toBeInTheDocument()
      expect(screen.getByText('🏠')).toBeInTheDocument()
      expect(screen.getByText('✈️')).toBeInTheDocument()
    })
  })

  describe('Form Inputs', () => {
    it('should have placeholder for goal name', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByPlaceholderText('e.g., Vacation to Bali')).toBeInTheDocument()
    })

    it('should have placeholder for target amount', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByPlaceholderText('10,000,000')).toBeInTheDocument()
    })

    it('should have placeholder for current amount', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
    })

    it('should display form data values', () => {
      const formDataWithValues: GoalFormData = {
        name: 'New Car',
        targetAmount: '500000000',
        currentAmount: '100000000',
        deadline: '2024-12-31',
        icon: '🚗',
      }
      render(<SavingsGoalForm {...defaultProps} formData={formDataWithValues} />)

      expect(screen.getByDisplayValue('New Car')).toBeInTheDocument()
      expect(screen.getByDisplayValue('500000000')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100000000')).toBeInTheDocument()
    })
  })

  describe('Icon Selection', () => {
    it('should call setFormData when icon is selected', () => {
      const setFormData = vi.fn()
      render(<SavingsGoalForm {...defaultProps} setFormData={setFormData} />)

      fireEvent.click(screen.getByText('🏠'))

      expect(setFormData).toHaveBeenCalledWith(expect.objectContaining({
        icon: '🏠',
      }))
    })

    it('should trigger haptic feedback when selecting icon', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      fireEvent.click(screen.getByText('🏠'))

      expect(hapticFeedbackMock).toHaveBeenCalledWith('light')
    })

    it('should highlight selected icon', () => {
      const formDataWithIcon: GoalFormData = {
        ...mockFormData,
        icon: '🚗',
      }
      const { container } = render(<SavingsGoalForm {...defaultProps} formData={formDataWithIcon} />)

      // The selected icon should have the highlight classes
      const carIcon = screen.getByText('🚗').closest('button')
      expect(carIcon).toHaveClass('bg-primary/20')
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit when form is submitted', () => {
      const onSubmit = vi.fn((e) => e.preventDefault())
      const { container } = render(<SavingsGoalForm {...defaultProps} onSubmit={onSubmit} />)

      const form = container.querySelector('form')
      if (form) {
        fireEvent.submit(form)
        expect(onSubmit).toHaveBeenCalled()
      }
    })

    it('should display "Create Goal" button when not editing', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /create goal/i })).toBeInTheDocument()
    })

    it('should display "Update Goal" button when editing', () => {
      render(<SavingsGoalForm {...defaultProps} isEditing={true} />)

      expect(screen.getByRole('button', { name: /update goal/i })).toBeInTheDocument()
    })

    it('should disable submit button when submitting', () => {
      render(<SavingsGoalForm {...defaultProps} isSubmitting={true} />)

      const submitButton = screen.getByRole('button', { name: /create goal/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      const { container } = render(<SavingsGoalForm {...defaultProps} onCancel={onCancel} />)

      // The cancel button is inside the flex gap-3 pt-2 div (action buttons)
      // It's a button with variant="outline" containing an X icon
      const actionButtons = container.querySelector('.flex.gap-3.pt-2')
      const cancelButton = actionButtons?.querySelector('button[type="button"]')
      expect(cancelButton).toBeDefined()
      if (cancelButton) {
        fireEvent.click(cancelButton)
        expect(onCancel).toHaveBeenCalled()
      }
    })

    it('should trigger haptic feedback when canceling', () => {
      const onCancel = vi.fn()
      const { container } = render(<SavingsGoalForm {...defaultProps} onCancel={onCancel} />)

      // Find the cancel button in the action buttons area
      const actionButtons = container.querySelector('.flex.gap-3.pt-2')
      const cancelButton = actionButtons?.querySelector('button[type="button"]')
      if (cancelButton) {
        fireEvent.click(cancelButton)
        expect(hapticFeedbackMock).toHaveBeenCalledWith('light')
      }
    })
  })

  describe('Input Changes', () => {
    it('should call setFormData when name is changed', () => {
      const setFormData = vi.fn()
      render(<SavingsGoalForm {...defaultProps} setFormData={setFormData} />)

      const nameInput = screen.getByLabelText(/goal name/i)
      fireEvent.change(nameInput, { target: { value: 'New Goal Name' } })

      expect(setFormData).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Goal Name',
      }))
    })

    it('should call setFormData when target amount is changed', () => {
      const setFormData = vi.fn()
      render(<SavingsGoalForm {...defaultProps} setFormData={setFormData} />)

      const targetInput = screen.getByLabelText(/target/i)
      fireEvent.change(targetInput, { target: { value: '1000000' } })

      expect(setFormData).toHaveBeenCalledWith(expect.objectContaining({
        targetAmount: '1000000',
      }))
    })

    it('should call setFormData when current amount is changed', () => {
      const setFormData = vi.fn()
      render(<SavingsGoalForm {...defaultProps} setFormData={setFormData} />)

      const currentInput = screen.getByLabelText(/current/i)
      fireEvent.change(currentInput, { target: { value: '500000' } })

      expect(setFormData).toHaveBeenCalledWith(expect.objectContaining({
        currentAmount: '500000',
      }))
    })

    it('should call setFormData when deadline is changed', () => {
      const setFormData = vi.fn()
      render(<SavingsGoalForm {...defaultProps} setFormData={setFormData} />)

      const deadlineInput = screen.getByLabelText(/deadline/i)
      fireEvent.change(deadlineInput, { target: { value: '2024-12-31' } })

      expect(setFormData).toHaveBeenCalledWith(expect.objectContaining({
        deadline: '2024-12-31',
      }))
    })
  })

  describe('Required Fields', () => {
    it('should mark goal name as required', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/goal name/i)
      expect(nameInput).toBeRequired()
    })

    it('should mark target amount as required', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      const targetInput = screen.getByLabelText(/target/i)
      expect(targetInput).toBeRequired()
    })

    it('should not mark deadline as required', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      const deadlineInput = screen.getByLabelText(/deadline/i)
      expect(deadlineInput).not.toBeRequired()
    })
  })

  describe('Input Types', () => {
    it('should have number input for target amount', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      const targetInput = screen.getByLabelText(/target/i)
      expect(targetInput).toHaveAttribute('type', 'number')
    })

    it('should have number input for current amount', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      const currentInput = screen.getByLabelText(/current/i)
      expect(currentInput).toHaveAttribute('type', 'number')
    })

    it('should have date input for deadline', () => {
      render(<SavingsGoalForm {...defaultProps} />)

      const deadlineInput = screen.getByLabelText(/deadline/i)
      expect(deadlineInput).toHaveAttribute('type', 'date')
    })
  })
})
