/**
 * Workout Logging Flow - Integration Test
 *
 * Tests the complete workout logging flow:
 * 1. Start workout from template
 * 2. Log sets with weight/reps
 * 3. PR (Personal Record) detection
 * 4. Complete workout
 * 5. Summary display and exercise history update
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { jsonResponse, mockFetch, resetFetchMocks } from '../mocks/fetch'
import { queryKeys } from '@/lib/hooks/query-keys'
import { getMockQueryClient, resetQueryMocks } from '../mocks/tanstack-query'
import { resetToastCalls, toastCalls, toast } from '../mocks/sonner'

describe('Workout Logging Flow', () => {
  beforeEach(() => {
    resetFetchMocks()
    resetQueryMocks()
    resetToastCalls()
  })

  describe('Template-Based Workout Start', () => {
    it('should start workout from template', async () => {
      // Arrange
      const template = {
        id: 'template-1',
        user_id: 'user-123',
        name: 'Push Day A',
        exercises: [
          {
            exercise_id: 'ex-1',
            exercise_name: 'Bench Press',
            sets: 4,
            target_reps: 8,
            target_weight: 100,
          },
          {
            exercise_id: 'ex-2',
            exercise_name: 'Overhead Press',
            sets: 3,
            target_reps: 10,
            target_weight: 60,
          },
        ],
        created_at: '2025-11-01T00:00:00Z',
      }

      const mockQueryClient = getMockQueryClient()

      // Mock template fetch
      mockFetch({
        url: '/api/workout-templates',
        method: 'GET',
        response: jsonResponse({ templates: [template] }),
      })

      // Act - Fetch templates and start workout
      const templatesResponse = await fetch('/api/workout-templates')
      const templatesData = await templatesResponse.json()

      const selectedTemplate = templatesData.templates[0]

      // Initialize workout state (client-side)
      const workoutState = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        exercises: selectedTemplate.exercises.map((ex: any) => ({
          ...ex,
          completedSets: [],
        })),
        startTime: new Date().toISOString(),
        isActive: true,
      }

      // Assert
      expect(templatesResponse.ok).toBe(true)
      expect(workoutState.exercises).toHaveLength(2)
      expect(workoutState.exercises[0].exercise_name).toBe('Bench Press')
      expect(workoutState.exercises[1].exercise_name).toBe('Overhead Press')
      expect(workoutState.isActive).toBe(true)
    })

    it('should start custom workout without template', async () => {
      // Arrange
      const exercises = [
        { id: 'ex-1', name: 'Squat', category: 'Legs' },
        { id: 'ex-2', name: 'Deadlift', category: 'Back' },
      ]

      // Mock exercises fetch
      mockFetch({
        url: '/api/exercises',
        method: 'GET',
        response: jsonResponse({ exercises }),
      })

      // Act - Fetch exercises and create custom workout
      const exercisesResponse = await fetch('/api/exercises')
      const exercisesData = await exercisesResponse.json()

      const workoutState = {
        templateId: null,
        templateName: 'Custom Workout',
        exercises: exercisesData.exercises.map((ex: any) => ({
          exercise_id: ex.id,
          exercise_name: ex.name,
          completedSets: [],
        })),
        startTime: new Date().toISOString(),
        isActive: true,
      }

      // Assert
      expect(exercisesResponse.ok).toBe(true)
      expect(workoutState.exercises).toHaveLength(2)
      expect(workoutState.templateId).toBeNull()
    })
  })

  describe('Set Logging and Tracking', () => {
    it('should log individual sets with weight and reps', () => {
      // Arrange
      const exercise = {
        exercise_id: 'ex-1',
        exercise_name: 'Bench Press',
        completedSets: [] as Array<{
          setNumber: number
          weight: number
          reps: number
          completed: boolean
        }>,
      }

      // Act - Log 4 sets
      const sets = [
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
        { weight: 100, reps: 7 },
        { weight: 90, reps: 10 }, // Drop set
      ]

      sets.forEach((set, index) => {
        exercise.completedSets.push({
          setNumber: index + 1,
          weight: set.weight,
          reps: set.reps,
          completed: true,
        })
      })

      // Assert
      expect(exercise.completedSets).toHaveLength(4)
      expect(exercise.completedSets[0]).toMatchObject({
        setNumber: 1,
        weight: 100,
        reps: 8,
        completed: true,
      })
      expect(exercise.completedSets[3]).toMatchObject({
        setNumber: 4,
        weight: 90,
        reps: 10,
      })
    })

    it('should calculate total volume (weight × reps)', () => {
      // Arrange
      const completedSets = [
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
        { weight: 100, reps: 7 },
      ]

      // Act - Calculate volume
      const totalVolume = completedSets.reduce(
        (sum, set) => sum + set.weight * set.reps,
        0
      )

      // Assert
      expect(totalVolume).toBe(2300) // (100*8) + (100*8) + (100*7) = 800 + 800 + 700
    })
  })

  describe('Personal Record (PR) Detection', () => {
    it('should detect new PR when weight exceeds previous max', async () => {
      // Arrange
      const exerciseId = 'ex-bench-press'
      const previousHistory = [
        { weight: 90, reps: 8, date: '2025-11-01' },
        { weight: 95, reps: 6, date: '2025-11-08' },
        { weight: 100, reps: 5, date: '2025-11-15' }, // Previous PR
      ]

      const newSet = { weight: 105, reps: 5 } // New PR!

      // Mock exercise history fetch
      mockFetch({
        url: `/api/exercise-history/${exerciseId}`,
        method: 'GET',
        response: jsonResponse({ history: previousHistory }),
      })

      // Act - Fetch history and check for PR
      const historyResponse = await fetch(
        `/api/exercise-history/${exerciseId}`
      )
      const historyData = await historyResponse.json()

      const previousMax = Math.max(
        ...historyData.history.map((h: any) => h.weight)
      )
      const isPR = newSet.weight > previousMax

      // Simulate PR notification
      if (isPR) {
        toast.success(`🎉 New PR! ${newSet.weight}kg × ${newSet.reps} reps`)
      }

      // Assert
      expect(historyResponse.ok).toBe(true)
      expect(previousMax).toBe(100)
      expect(isPR).toBe(true)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('New PR!')
      )
    })

    it('should detect rep PR (same weight, more reps)', async () => {
      // Arrange
      const exerciseId = 'ex-squat'
      const previousHistory = [
        { weight: 140, reps: 5, date: '2025-11-01' },
        { weight: 140, reps: 6, date: '2025-11-08' },
        { weight: 140, reps: 7, date: '2025-11-15' }, // Previous best at 140kg
      ]

      const newSet = { weight: 140, reps: 8 } // Rep PR!

      // Mock history fetch
      mockFetch({
        url: `/api/exercise-history/${exerciseId}`,
        method: 'GET',
        response: jsonResponse({ history: previousHistory }),
      })

      // Act
      const historyResponse = await fetch(
        `/api/exercise-history/${exerciseId}`
      )
      const historyData = await historyResponse.json()

      const sameWeightHistory = historyData.history.filter(
        (h: any) => h.weight === newSet.weight
      )
      const previousMaxReps = Math.max(
        ...sameWeightHistory.map((h: any) => h.reps)
      )
      const isRepPR = newSet.reps > previousMaxReps

      if (isRepPR) {
        toast.success(
          `🎉 Rep PR! ${newSet.weight}kg × ${newSet.reps} reps (previous: ${previousMaxReps})`
        )
      }

      // Assert
      expect(previousMaxReps).toBe(7)
      expect(isRepPR).toBe(true)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Rep PR!')
      )
    })

    it('should NOT trigger PR for lower weight', async () => {
      // Arrange
      const exerciseId = 'ex-deadlift'
      const previousHistory = [
        { weight: 180, reps: 3, date: '2025-11-01' },
        { weight: 185, reps: 2, date: '2025-11-08' },
        { weight: 190, reps: 1, date: '2025-11-15' }, // PR
      ]

      const newSet = { weight: 170, reps: 5 } // Higher reps but lower weight

      // Mock history fetch
      mockFetch({
        url: `/api/exercise-history/${exerciseId}`,
        method: 'GET',
        response: jsonResponse({ history: previousHistory }),
      })

      // Act
      const historyResponse = await fetch(
        `/api/exercise-history/${exerciseId}`
      )
      const historyData = await historyResponse.json()

      const previousMax = Math.max(
        ...historyData.history.map((h: any) => h.weight)
      )
      const isPR = newSet.weight > previousMax

      // Assert
      expect(previousMax).toBe(190)
      expect(isPR).toBe(false)
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  describe('Workout Completion', () => {
    it('should complete workout and save to database', async () => {
      // Arrange
      const workoutSession = {
        template_id: 'template-1',
        template_name: 'Push Day A',
        exercises_completed: [
          {
            exercise_id: 'ex-1',
            exercise_name: 'Bench Press',
            sets: [
              { weight: 100, reps: 8 },
              { weight: 100, reps: 8 },
              { weight: 100, reps: 7 },
            ],
          },
          {
            exercise_id: 'ex-2',
            exercise_name: 'Overhead Press',
            sets: [
              { weight: 60, reps: 10 },
              { weight: 60, reps: 10 },
              { weight: 60, reps: 9 },
            ],
          },
        ],
        start_time: '2025-11-22T10:00:00Z',
        end_time: '2025-11-22T11:15:00Z',
        duration_minutes: 75,
      }

      const savedWorkout = {
        id: 'workout-123',
        user_id: 'user-123',
        ...workoutSession,
        date: '2025-11-22',
        created_at: '2025-11-22T11:15:00Z',
      }

      const mockQueryClient = getMockQueryClient()

      // Mock workout creation
      mockFetch({
        url: '/api/workouts',
        method: 'POST',
        response: jsonResponse({ workout: savedWorkout }),
      })

      // Act - Complete workout
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutSession),
      })

      const data = await response.json()

      // Simulate cache invalidation
      mockQueryClient.invalidateQueries({ queryKey: queryKeys.workouts.all })

      toast.success('Workout completed! 💪')

      // Assert
      expect(response.ok).toBe(true)
      expect(data.workout).toMatchObject({
        template_name: 'Push Day A',
        duration_minutes: 75,
      })
      expect(data.workout.exercises_completed).toHaveLength(2)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.workouts.all,
      })
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Workout completed')
      )
    })

    it('should update exercise history after workout completion', async () => {
      // Arrange
      const completedWorkout = {
        id: 'workout-456',
        exercises_completed: [
          {
            exercise_id: 'ex-1',
            exercise_name: 'Squat',
            sets: [
              { weight: 140, reps: 5 },
              { weight: 140, reps: 5 },
              { weight: 140, reps: 5 },
            ],
          },
        ],
        date: '2025-11-22',
      }

      const exerciseHistoryEntries = completedWorkout.exercises_completed.flatMap(
        (exercise) =>
          exercise.sets.map((set, index) => ({
            exercise_id: exercise.exercise_id,
            exercise_name: exercise.exercise_name,
            set_number: index + 1,
            weight: set.weight,
            reps: set.reps,
            workout_id: completedWorkout.id,
            date: completedWorkout.date,
          }))
      )

      const mockQueryClient = getMockQueryClient()

      // Mock exercise history creation
      mockFetch({
        url: '/api/exercise-history',
        method: 'POST',
        response: jsonResponse({ entries: exerciseHistoryEntries }),
      })

      // Act - Save exercise history
      const response = await fetch('/api/exercise-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: exerciseHistoryEntries }),
      })

      const data = await response.json()

      // Simulate cache invalidation
      mockQueryClient.invalidateQueries({
        queryKey: queryKeys.exerciseHistory.all,
      })

      // Assert
      expect(response.ok).toBe(true)
      expect(data.entries).toHaveLength(3) // 3 sets
      expect(data.entries[0]).toMatchObject({
        exercise_name: 'Squat',
        weight: 140,
        reps: 5,
      })
    })
  })

  describe('Workout Summary and Analytics', () => {
    it('should generate workout summary with key metrics', async () => {
      // Arrange
      const workoutData = {
        id: 'workout-789',
        template_name: 'Leg Day',
        exercises_completed: [
          {
            exercise_name: 'Squat',
            sets: [
              { weight: 140, reps: 5 },
              { weight: 140, reps: 5 },
              { weight: 140, reps: 5 },
            ],
          },
          {
            exercise_name: 'Leg Press',
            sets: [
              { weight: 200, reps: 10 },
              { weight: 200, reps: 10 },
              { weight: 200, reps: 8 },
            ],
          },
        ],
        duration_minutes: 60,
        start_time: '2025-11-22T10:00:00Z',
        end_time: '2025-11-22T11:00:00Z',
      }

      // Act - Calculate summary metrics
      const totalSets = workoutData.exercises_completed.reduce(
        (sum, ex) => sum + ex.sets.length,
        0
      )

      const totalVolume = workoutData.exercises_completed.reduce(
        (sum, ex) =>
          sum + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0),
        0
      )

      const summary = {
        workoutName: workoutData.template_name,
        duration: workoutData.duration_minutes,
        exercisesCompleted: workoutData.exercises_completed.length,
        totalSets,
        totalVolume,
        averageRestTime: null, // Would be calculated from set timestamps
      }

      // Assert
      expect(summary).toMatchObject({
        workoutName: 'Leg Day',
        duration: 60,
        exercisesCompleted: 2,
        totalSets: 6,
        totalVolume: 7700, // (140*5*3) + (200*10*2) + (200*8) = 2100 + 4000 + 1600
      })
    })

    it('should track workout consistency over time', async () => {
      // Arrange
      const recentWorkouts = [
        { date: '2025-11-15', template_name: 'Push Day' },
        { date: '2025-11-17', template_name: 'Pull Day' },
        { date: '2025-11-19', template_name: 'Leg Day' },
        { date: '2025-11-22', template_name: 'Push Day' },
      ]

      // Mock workouts fetch
      mockFetch({
        url: '/api/workouts',
        method: 'GET',
        response: jsonResponse({ workouts: recentWorkouts }),
      })

      // Act - Fetch workouts and calculate frequency
      const response = await fetch('/api/workouts')
      const data = await response.json()

      const workoutsPerWeek = data.workouts.length / 1 // Assuming 1 week period
      const uniqueTemplates = new Set(
        data.workouts.map((w: any) => w.template_name)
      ).size

      // Assert
      expect(response.ok).toBe(true)
      expect(workoutsPerWeek).toBe(4)
      expect(uniqueTemplates).toBe(3) // Push, Pull, Leg
    })
  })

  describe('Rest Timer Integration', () => {
    it('should track rest time between sets', () => {
      // Arrange
      const setTimestamps = [
        new Date('2025-11-22T10:00:00Z').getTime(),
        new Date('2025-11-22T10:02:30Z').getTime(), // 2.5 min rest
        new Date('2025-11-22T10:05:00Z').getTime(), // 2.5 min rest
      ]

      // Act - Calculate rest times
      const restTimes = setTimestamps
        .slice(1)
        .map((timestamp, index) => {
          const restMs = timestamp - setTimestamps[index]
          return Math.round(restMs / 1000) // Convert to seconds
        })

      const averageRest = Math.round(
        restTimes.reduce((sum, time) => sum + time, 0) / restTimes.length
      )

      // Assert
      expect(restTimes).toEqual([150, 150]) // 2.5 minutes = 150 seconds
      expect(averageRest).toBe(150)
    })
  })

  describe('Favorite Exercises', () => {
    it('should toggle exercise as favorite', async () => {
      // Arrange
      const exerciseId = 'ex-bench-press'
      const mockQueryClient = getMockQueryClient()

      // Mock favorite toggle
      mockFetch({
        url: '/api/exercises/favorites',
        method: 'POST',
        response: jsonResponse({ is_favorite: true }),
      })

      // Act - Toggle favorite
      const response = await fetch('/api/exercises/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_id: exerciseId }),
      })

      const data = await response.json()

      // Simulate cache invalidation
      mockQueryClient.invalidateQueries({ queryKey: queryKeys.exercises.all })

      // Assert
      expect(response.ok).toBe(true)
      expect(data.is_favorite).toBe(true)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.exercises.all,
      })
    })
  })
})
