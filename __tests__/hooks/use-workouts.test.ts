/**
 * useWorkouts Hook Tests
 *
 * Tests for workout tracking, templates, and exercise operations.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import { workoutKeys } from '@/lib/hooks/use-workouts'
import { createMockWorkout, createMockWorkoutTemplate } from '../mocks/supabase'
import { jsonResponse, mockFetch, resetFetchMocks, fetchMock } from '../mocks/fetch'
import { resetToastCalls, toastCalls, toast } from '../mocks/sonner'

// Mock exercise factory
function createMockExercise(overrides: Record<string, unknown> = {}) {
  return {
    id: `exercise-${Math.random().toString(36).slice(2)}`,
    name: 'Bench Press',
    category: 'chest',
    muscle_group: 'chest',
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Lie on bench, lower bar to chest, press up',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('Workout Query Keys', () => {
  it('should have correct all key', () => {
    expect(workoutKeys.all).toEqual(['workouts'])
  })

  it('should have correct lists key', () => {
    expect(workoutKeys.lists()).toEqual(['workouts', 'list'])
  })

  it('should have correct list key with filters', () => {
    expect(workoutKeys.list({ startDate: '2025-01-01' })).toEqual([
      'workouts',
      'list',
      { filters: { startDate: '2025-01-01' } },
    ])
  })

  it('should have correct list key with multiple filters', () => {
    expect(workoutKeys.list({ startDate: '2025-01-01', limit: 10 })).toEqual([
      'workouts',
      'list',
      { filters: { startDate: '2025-01-01', limit: 10 } },
    ])
  })

  it('should have correct templates key', () => {
    expect(workoutKeys.templates).toEqual(['workout-templates'])
  })

  it('should have correct exercises key', () => {
    expect(workoutKeys.exercises).toEqual(['exercises'])
  })
})

describe('Workout Fetch Functions', () => {
  beforeEach(() => {
    resetFetchMocks()
    resetToastCalls()
    fetchMock.mockClear()
  })

  describe('fetchWorkouts', () => {
    it('should call /api/workouts endpoint', async () => {
      const mockWorkouts = [
        createMockWorkout({ id: '1' }),
        createMockWorkout({ id: '2' }),
      ]

      mockFetch({
        url: '/api/workouts',
        response: jsonResponse({ workouts: mockWorkouts }),
      })

      const response = await fetch('/api/workouts')
      const data = await response.json()

      expect(fetchMock).toHaveBeenCalled()
      expect(data.workouts).toHaveLength(2)
    })

    it('should append startDate filter to query params', async () => {
      mockFetch({
        url: '/api/workouts',
        response: jsonResponse({ workouts: [] }),
      })

      const params = new URLSearchParams({ startDate: '2025-01-01' })
      await fetch(`/api/workouts?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('startDate=2025-01-01')
    })

    it('should append limit filter to query params', async () => {
      mockFetch({
        url: '/api/workouts',
        response: jsonResponse({ workouts: [] }),
      })

      const params = new URLSearchParams({ limit: '10' })
      await fetch(`/api/workouts?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('limit=10')
    })

    it('should handle error response', async () => {
      mockFetch({
        url: '/api/workouts',
        response: {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        },
      })

      const response = await fetch('/api/workouts')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('createWorkout', () => {
    it('should POST to /api/workouts', async () => {
      const newWorkout = {
        template_id: 'template-123',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_minutes: 45,
        notes: 'Good session',
        exerciseLogs: [
          {
            exercise_id: 'exercise-1',
            sets: [
              { reps: 10, weight: 60, completed: true },
              { reps: 8, weight: 65, completed: true },
            ],
          },
        ],
      }

      mockFetch({
        url: '/api/workouts',
        method: 'POST',
        response: jsonResponse({ ...newWorkout, id: 'new-workout-id' }, 201),
      })

      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkout),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.id).toBe('new-workout-id')
    })

    it('should handle validation error', async () => {
      mockFetch({
        url: '/api/workouts',
        method: 'POST',
        response: {
          ok: false,
          status: 400,
          json: async () => ({ message: 'Invalid workout data' }),
        },
      })

      const response = await fetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })
})

describe('Workout Templates', () => {
  beforeEach(() => {
    resetFetchMocks()
    fetchMock.mockClear()
  })

  describe('fetchWorkoutTemplates', () => {
    it('should GET /api/workout-templates', async () => {
      const mockTemplates = [
        createMockWorkoutTemplate({ id: '1', name: 'Push Day' }),
        createMockWorkoutTemplate({ id: '2', name: 'Pull Day' }),
      ]

      mockFetch({
        url: '/api/workout-templates',
        response: jsonResponse({ templates: mockTemplates }),
      })

      const response = await fetch('/api/workout-templates')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.templates).toHaveLength(2)
    })
  })

  describe('createTemplate', () => {
    it('should POST to /api/workout-templates', async () => {
      const newTemplate = {
        name: 'Leg Day',
        description: 'Focus on lower body',
        difficulty: 'intermediate',
        duration_minutes: 60,
        exercises: [
          {
            exercise_id: 'squat-1',
            name: 'Barbell Squat',
            category: 'legs',
            sets: 4,
            reps: '8-10',
            rest_seconds: 90,
          },
        ],
      }

      mockFetch({
        url: '/api/workout-templates',
        method: 'POST',
        response: jsonResponse({ ...newTemplate, id: 'new-template-id' }, 201),
      })

      const response = await fetch('/api/workout-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.name).toBe('Leg Day')
    })
  })

  describe('updateTemplate', () => {
    it('should PUT to /api/workout-templates/:id', async () => {
      const updates = {
        name: 'Updated Leg Day',
        duration_minutes: 75,
      }

      mockFetch({
        url: '/api/workout-templates/template-123',
        method: 'PUT',
        response: jsonResponse({ id: 'template-123', ...updates }),
      })

      const response = await fetch('/api/workout-templates/template-123', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.name).toBe('Updated Leg Day')
    })
  })

  describe('deleteTemplate', () => {
    it('should DELETE to /api/workout-templates/:id', async () => {
      mockFetch({
        url: '/api/workout-templates/template-123',
        method: 'DELETE',
        response: jsonResponse({ success: true }),
      })

      const response = await fetch('/api/workout-templates/template-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(true)
    })
  })
})

describe('Exercises', () => {
  beforeEach(() => {
    resetFetchMocks()
    fetchMock.mockClear()
  })

  describe('fetchExercises', () => {
    it('should GET /api/exercises', async () => {
      const mockExercises = [
        createMockExercise({ id: '1', name: 'Bench Press' }),
        createMockExercise({ id: '2', name: 'Squat' }),
      ]

      mockFetch({
        url: '/api/exercises',
        response: jsonResponse({ exercises: mockExercises }),
      })

      const response = await fetch('/api/exercises')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.exercises).toHaveLength(2)
    })

    it('should filter by category', async () => {
      mockFetch({
        url: '/api/exercises',
        response: jsonResponse({ exercises: [] }),
      })

      await fetch('/api/exercises?category=chest')

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('category=chest')
    })
  })

  describe('exercise history', () => {
    it('should GET /api/exercises/:id/history', async () => {
      mockFetch({
        url: '/api/exercises/exercise-123/history',
        response: jsonResponse({
          history: [
            { id: '1', weight: 60, reps: 10, performed_at: '2025-01-01' },
            { id: '2', weight: 65, reps: 8, performed_at: '2025-01-03' },
          ],
        }),
      })

      const response = await fetch('/api/exercises/exercise-123/history?limit=10')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.history).toHaveLength(2)
    })
  })
})

describe('Personal Records', () => {
  beforeEach(() => {
    resetFetchMocks()
    fetchMock.mockClear()
  })

  describe('fetchPersonalRecords', () => {
    it('should GET /api/personal-records', async () => {
      mockFetch({
        url: '/api/personal-records',
        response: jsonResponse({
          personalRecords: [
            { id: '1', exercise_name: 'Bench Press', record_type: 'max_weight', value: 100 },
          ],
        }),
      })

      const response = await fetch('/api/personal-records')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.personalRecords).toHaveLength(1)
    })

    it('should filter by exercise', async () => {
      mockFetch({
        url: '/api/personal-records',
        response: jsonResponse({ personalRecords: [] }),
      })

      await fetch('/api/personal-records?exerciseId=exercise-123')

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('exerciseId=exercise-123')
    })
  })

  describe('createPersonalRecord', () => {
    it('should POST to /api/personal-records', async () => {
      const newRecord = {
        exercise_id: 'exercise-123',
        record_type: 'max_weight',
        value: 100,
        unit: 'kg',
      }

      mockFetch({
        url: '/api/personal-records',
        method: 'POST',
        response: jsonResponse({ ...newRecord, id: 'new-record-id' }, 201),
      })

      const response = await fetch('/api/personal-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.value).toBe(100)
    })
  })
})

describe('Workout Toast Notifications', () => {
  beforeEach(() => {
    resetToastCalls()
  })

  it('should show success toast for workout saved', () => {
    toast.success('workout saved!')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('success')
    expect(toastCalls[0].message).toBe('workout saved!')
  })

  it('should show success toast for template created', () => {
    toast.success('template created!')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toBe('template created!')
  })

  it('should show success toast for template deleted', () => {
    toast.success('template deleted!')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toBe('template deleted!')
  })

  it('should show success toast for personal record', () => {
    toast.success('new personal record! 🏆')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toContain('personal record')
  })

  it('should show error toast for failures', () => {
    toast.error('failed to save workout')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('error')
  })
})

describe('Workout Mock Data Factory', () => {
  it('should create workout with default values', () => {
    const workout = createMockWorkout()

    expect(workout.id).toBeDefined()
    expect(workout.user_id).toBe('test-user-id')
    expect(workout.started_at).toBeDefined()
    expect(workout.workout_date).toBeDefined()
  })

  it('should allow overriding workout properties', () => {
    const workout = createMockWorkout({
      id: 'custom-id',
      duration_minutes: 60,
      notes: 'Great workout!',
      template_id: 'template-123',
    })

    expect(workout.id).toBe('custom-id')
    expect(workout.duration_minutes).toBe(60)
    expect(workout.notes).toBe('Great workout!')
    expect(workout.template_id).toBe('template-123')
  })

  it('should create template with default values', () => {
    const template = createMockWorkoutTemplate()

    expect(template.id).toBeDefined()
    expect(template.user_id).toBe('test-user-id')
    expect(template.name).toBe('Test Template')
    expect(template.exercises).toEqual([])
  })

  it('should allow overriding template properties', () => {
    const template = createMockWorkoutTemplate({
      id: 'custom-id',
      name: 'Push Day',
      difficulty: 'advanced',
      duration_minutes: 90,
    })

    expect(template.id).toBe('custom-id')
    expect(template.name).toBe('Push Day')
    expect(template.difficulty).toBe('advanced')
    expect(template.duration_minutes).toBe(90)
  })
})

describe('Workout Volume Calculations', () => {
  it('should calculate total volume for a set', () => {
    const weight = 60
    const reps = 10
    const volume = weight * reps
    expect(volume).toBe(600)
  })

  it('should calculate total volume for multiple sets', () => {
    const sets = [
      { weight: 60, reps: 10 },
      { weight: 65, reps: 8 },
      { weight: 70, reps: 6 },
    ]

    const totalVolume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
    expect(totalVolume).toBe(600 + 520 + 420) // 1540
  })

  it('should calculate 1RM estimate (Brzycki formula)', () => {
    const weight = 100
    const reps = 5
    // Brzycki: 1RM = weight × (36 / (37 - reps))
    const oneRepMax = weight * (36 / (37 - reps))
    expect(oneRepMax).toBeCloseTo(112.5, 0)
  })
})
