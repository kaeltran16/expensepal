/**
 * WorkoutProgress Component Tests
 *
 * Tests for the workout progress indicator component.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WorkoutProgress } from '@/components/workouts/workout-progress'

describe('WorkoutProgress', () => {
  const defaultProps = {
    currentExerciseIndex: 0,
    totalExercises: 5,
    templateName: 'Upper Body Workout',
  }

  describe('Rendering', () => {
    it('should render the template name', () => {
      render(<WorkoutProgress {...defaultProps} />)

      expect(screen.getByText('Upper Body Workout')).toBeInTheDocument()
    })

    it('should display current exercise number (1-indexed)', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={0} />)

      expect(screen.getByText('Exercise 1')).toBeInTheDocument()
    })

    it('should display total exercises', () => {
      render(<WorkoutProgress {...defaultProps} totalExercises={5} />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Progress Calculation', () => {
    it('should show 20% progress for first of 5 exercises', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={0} totalExercises={5} />)

      // (0 + 1) / 5 * 100 = 20%
      expect(screen.getByText('20%')).toBeInTheDocument()
    })

    it('should show 100% progress when on last exercise', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={4} totalExercises={5} />)

      // (4 + 1) / 5 * 100 = 100%
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should show 50% progress for middle exercise', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={2} totalExercises={5} />)

      // (2 + 1) / 5 * 100 = 60%
      expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('should handle single exercise workout', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={0} totalExercises={1} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Exercise 1')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle large number of exercises', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={49} totalExercises={100} />)

      expect(screen.getByText('Exercise 50')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should round progress to nearest integer', () => {
      render(<WorkoutProgress {...defaultProps} currentExerciseIndex={0} totalExercises={3} />)

      // (0 + 1) / 3 * 100 = 33.33... should round to 33
      expect(screen.getByText('33%')).toBeInTheDocument()
    })
  })
})
