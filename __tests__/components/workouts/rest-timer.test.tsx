/**
 * RestTimer Component Tests
 *
 * Tests for the rest timer component used during workout rest periods.
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RestTimer } from '@/components/workouts/rest-timer'
import { hapticFeedbackMock } from '../../mocks/utils'

describe('RestTimer', () => {
  const defaultProps = {
    isResting: true,
    restTimer: 60,
    setRestTimer: vi.fn(),
    onSkip: vi.fn(),
    currentExerciseName: 'Bench Press',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render when isResting is true', () => {
      render(<RestTimer {...defaultProps} />)

      expect(screen.getByText('60s')).toBeInTheDocument()
      expect(screen.getByText('Rest Time')).toBeInTheDocument()
    })

    it('should not render when isResting is false', () => {
      render(<RestTimer {...defaultProps} isResting={false} />)

      expect(screen.queryByText('Rest Time')).not.toBeInTheDocument()
    })

    it('should display current exercise name', () => {
      render(<RestTimer {...defaultProps} />)

      expect(screen.getByText('Next: Bench Press')).toBeInTheDocument()
    })

    it('should not show exercise name when not provided', () => {
      render(<RestTimer {...defaultProps} currentExerciseName={undefined} />)

      expect(screen.queryByText(/Next:/)).not.toBeInTheDocument()
    })

    it('should display the skip button', () => {
      render(<RestTimer {...defaultProps} />)

      expect(screen.getByRole('button', { name: /skip rest/i })).toBeInTheDocument()
    })
  })

  describe('Timer Countdown', () => {
    it('should decrement timer every second', async () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} setRestTimer={setRestTimer} />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // setRestTimer should be called with a function that decrements
      expect(setRestTimer).toHaveBeenCalled()
      const updateFn = setRestTimer.mock.calls[0][0]
      expect(typeof updateFn).toBe('function')
      expect(updateFn(60)).toBe(59)
    })

    it('should call onSkip when timer reaches 0', async () => {
      const onSkip = vi.fn()
      const setRestTimer = vi.fn()

      render(<RestTimer {...defaultProps} restTimer={1} setRestTimer={setRestTimer} onSkip={onSkip} />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Get the update function and simulate it being called with 1
      expect(setRestTimer).toHaveBeenCalled()
      const updateFn = setRestTimer.mock.calls[0][0]

      // When timer is at 1 and decrements, it should call onSkip
      updateFn(1)
      expect(onSkip).toHaveBeenCalled()
    })

    it('should trigger haptic feedback when timer completes', async () => {
      const setRestTimer = vi.fn()

      render(<RestTimer {...defaultProps} restTimer={1} setRestTimer={setRestTimer} />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const updateFn = setRestTimer.mock.calls[0][0]
      updateFn(1) // Simulate timer at 1 going to 0

      expect(hapticFeedbackMock).toHaveBeenCalledWith('medium')
    })
  })

  describe('Skip Functionality', () => {
    it('should call onSkip when skip button is clicked', () => {
      const onSkip = vi.fn()
      render(<RestTimer {...defaultProps} onSkip={onSkip} />)

      fireEvent.click(screen.getByRole('button', { name: /skip rest/i }))

      expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it('should trigger haptic feedback when skipping', () => {
      render(<RestTimer {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /skip rest/i }))

      expect(hapticFeedbackMock).toHaveBeenCalledWith('medium')
    })

    it('should skip when clicking background overlay', () => {
      const onSkip = vi.fn()
      const { container } = render(<RestTimer {...defaultProps} onSkip={onSkip} />)

      // Find the backdrop element
      const backdrop = container.querySelector('.fixed.inset-0')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onSkip).toHaveBeenCalled()
      }
    })
  })

  describe('Time Adjustment', () => {
    it('should decrease time by 15 seconds when -15s button is clicked', () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} restTimer={60} setRestTimer={setRestTimer} />)

      fireEvent.click(screen.getByRole('button', { name: /decrease rest time by 15 seconds/i }))

      expect(setRestTimer).toHaveBeenCalled()
      const updateFn = setRestTimer.mock.calls[0][0]
      expect(updateFn(60)).toBe(45)
    })

    it('should increase time by 30 seconds when +30s button is clicked', () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} restTimer={60} setRestTimer={setRestTimer} />)

      fireEvent.click(screen.getByRole('button', { name: /increase rest time by 30 seconds/i }))

      expect(setRestTimer).toHaveBeenCalled()
      const updateFn = setRestTimer.mock.calls[0][0]
      expect(updateFn(60)).toBe(90)
    })

    it('should increase time by 60 seconds when +1min button is clicked', () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} restTimer={60} setRestTimer={setRestTimer} />)

      fireEvent.click(screen.getByRole('button', { name: /increase rest time by 1 minute/i }))

      expect(setRestTimer).toHaveBeenCalled()
      const updateFn = setRestTimer.mock.calls[0][0]
      expect(updateFn(60)).toBe(120)
    })

    it('should not allow timer to go below 0', () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} restTimer={10} setRestTimer={setRestTimer} />)

      fireEvent.click(screen.getByRole('button', { name: /decrease rest time by 15 seconds/i }))

      const updateFn = setRestTimer.mock.calls[0][0]
      expect(updateFn(10)).toBe(0) // Should clamp to 0
    })

    it('should not allow timer to go above 300 seconds', () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} restTimer={280} setRestTimer={setRestTimer} />)

      fireEvent.click(screen.getByRole('button', { name: /increase rest time by 30 seconds/i }))

      const updateFn = setRestTimer.mock.calls[0][0]
      expect(updateFn(280)).toBe(300) // Should clamp to 300
    })

    it('should trigger haptic feedback when adjusting time', () => {
      render(<RestTimer {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /increase rest time by 30 seconds/i }))

      expect(hapticFeedbackMock).toHaveBeenCalledWith('light')
    })
  })

  describe('Range Slider', () => {
    it('should display range slider for time adjustment', () => {
      render(<RestTimer {...defaultProps} />)

      expect(screen.getByRole('slider', { name: /rest timer duration/i })).toBeInTheDocument()
    })

    it('should update timer when slider is changed', () => {
      const setRestTimer = vi.fn()
      render(<RestTimer {...defaultProps} setRestTimer={setRestTimer} />)

      const slider = screen.getByRole('slider', { name: /rest timer duration/i })
      fireEvent.change(slider, { target: { value: '90' } })

      expect(setRestTimer).toHaveBeenCalledWith(90)
    })

    it('should have correct min and max values', () => {
      render(<RestTimer {...defaultProps} />)

      const slider = screen.getByRole('slider', { name: /rest timer duration/i })
      expect(slider).toHaveAttribute('min', '0')
      expect(slider).toHaveAttribute('max', '300')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible labels on adjustment buttons', () => {
      render(<RestTimer {...defaultProps} />)

      expect(screen.getByRole('button', { name: /decrease rest time by 15 seconds/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /increase rest time by 30 seconds/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /increase rest time by 1 minute/i })).toBeInTheDocument()
    })

    it('should have accessible label on slider', () => {
      render(<RestTimer {...defaultProps} />)

      expect(screen.getByRole('slider', { name: /rest timer duration/i })).toBeInTheDocument()
    })
  })
})
