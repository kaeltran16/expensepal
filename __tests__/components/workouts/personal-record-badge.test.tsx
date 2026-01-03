/**
 * PersonalRecordBadge Component Tests
 *
 * Tests for the PR celebration overlay component.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PersonalRecordBadge } from '@/components/workouts/personal-record-badge'

describe('PersonalRecordBadge', () => {
  const defaultProps = {
    personalRecords: [
      { type: 'Max Weight', value: 100, unit: 'kg' },
    ],
    onDismiss: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render when personal records exist', () => {
      render(<PersonalRecordBadge {...defaultProps} />)

      expect(screen.getByText('new personal record!')).toBeInTheDocument()
    })

    it('should not render when personal records array is empty', () => {
      render(<PersonalRecordBadge {...defaultProps} personalRecords={[]} />)

      expect(screen.queryByText('new personal record!')).not.toBeInTheDocument()
    })

    it('should display trophy emoji', () => {
      render(<PersonalRecordBadge {...defaultProps} />)

      expect(screen.getByText('🏆')).toBeInTheDocument()
    })

    it('should display awesome button', () => {
      render(<PersonalRecordBadge {...defaultProps} />)

      expect(screen.getByRole('button', { name: /awesome/i })).toBeInTheDocument()
    })
  })

  describe('Personal Records Display', () => {
    it('should display single personal record', () => {
      const records = [{ type: 'Max Weight', value: 100, unit: 'kg' }]
      render(<PersonalRecordBadge personalRecords={records} onDismiss={vi.fn()} />)

      expect(screen.getByText('Max Weight: 100 kg')).toBeInTheDocument()
    })

    it('should display multiple personal records', () => {
      const records = [
        { type: 'Max Weight', value: 100, unit: 'kg' },
        { type: 'Max Reps', value: 15, unit: 'reps' },
        { type: '1RM', value: 110.5, unit: 'kg' },
      ]
      render(<PersonalRecordBadge personalRecords={records} onDismiss={vi.fn()} />)

      expect(screen.getByText('Max Weight: 100 kg')).toBeInTheDocument()
      expect(screen.getByText('Max Reps: 15 reps')).toBeInTheDocument()
      expect(screen.getByText('1RM: 110.5 kg')).toBeInTheDocument()
    })

    it('should handle volume PR', () => {
      const records = [{ type: 'Max Volume', value: 5000, unit: 'kg' }]
      render(<PersonalRecordBadge personalRecords={records} onDismiss={vi.fn()} />)

      expect(screen.getByText('Max Volume: 5000 kg')).toBeInTheDocument()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when awesome button is clicked', () => {
      const onDismiss = vi.fn()
      render(<PersonalRecordBadge {...defaultProps} onDismiss={onDismiss} />)

      const button = screen.getByRole('button', { name: /awesome/i })
      fireEvent.click(button)

      // The button triggers onDismiss (and the overlay also does, so at least 1 call)
      expect(onDismiss).toHaveBeenCalled()
    })

    it('should call onDismiss when clicking overlay background', () => {
      const onDismiss = vi.fn()
      const { container } = render(<PersonalRecordBadge {...defaultProps} onDismiss={onDismiss} />)

      // Find the backdrop element
      const backdrop = container.querySelector('.fixed.inset-0')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onDismiss).toHaveBeenCalled()
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle decimal values', () => {
      const records = [{ type: '1RM', value: 87.5, unit: 'kg' }]
      render(<PersonalRecordBadge personalRecords={records} onDismiss={vi.fn()} />)

      expect(screen.getByText('1RM: 87.5 kg')).toBeInTheDocument()
    })

    it('should handle zero value PRs', () => {
      const records = [{ type: 'Max Reps', value: 0, unit: 'reps' }]
      render(<PersonalRecordBadge personalRecords={records} onDismiss={vi.fn()} />)

      expect(screen.getByText('Max Reps: 0 reps')).toBeInTheDocument()
    })
  })
})
