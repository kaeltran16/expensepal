'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Exercise, Workout, WorkoutTemplate } from '../supabase'

// query keys
export const workoutKeys = {
  all: ['workouts'] as const,
  lists: () => [...workoutKeys.all, 'list'] as const,
  list: (filters: WorkoutFilters) => [...workoutKeys.lists(), { filters }] as const,
  templates: ['workout-templates'] as const,
  exercises: ['exercises'] as const,
}

export interface WorkoutFilters {
  startDate?: string
  limit?: number
}

// useWorkouts - fetch user's workout sessions
export function useWorkouts(filters: WorkoutFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workoutKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.limit) params.append('limit', filters.limit.toString())

      const res = await fetch(`/api/workouts?${params}`)
      if (!res.ok) throw new Error('failed to fetch workouts')
      const data = await res.json()
      return data.workouts as Workout[]
    },
    // Cache for 12 hours - workouts rarely change
    staleTime: 12 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled,
  })
}

// useWorkoutTemplates - fetch available workout templates
export function useWorkoutTemplates(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workoutKeys.templates,
    queryFn: async () => {
      const res = await fetch('/api/workout-templates')
      if (!res.ok) throw new Error('failed to fetch workout templates')
      const data = await res.json()
      return data.templates as WorkoutTemplate[]
    },
    // Cache for 12 hours - templates rarely change
    staleTime: 12 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled,
  })
}

// useExercises - fetch all exercises
export function useExercises(options?: { category?: string; enabled?: boolean }) {
  const category = options?.category
  return useQuery({
    queryKey: [...workoutKeys.exercises, { category }],
    queryFn: async () => {
      const params = category ? `?category=${category}` : ''
      const res = await fetch(`/api/exercises${params}`)
      if (!res.ok) throw new Error('failed to fetch exercises')
      const data = await res.json()
      return data.exercises as Exercise[]
    },
    // Cache for 24 hours - exercises database rarely changes
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled,
  })
}

// useCreateWorkout - create a new workout session
export function useCreateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workoutData: {
      template_id?: string
      started_at: string
      completed_at: string
      duration_minutes: number
      notes?: string
      exerciseLogs: Array<{
        exercise_id: string
        sets: Array<{
          reps: number
          weight?: number
          completed?: boolean
        }>
        notes?: string
      }>
    }) => {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workoutData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to create workout')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all })
      toast.success('workout saved!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to save workout')
    },
  })
}

// useCreateTemplate - create custom workout template
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateData: {
      name: string
      description?: string
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      duration_minutes?: number
      tags?: string[]
      target_goal?: 'strength' | 'hypertrophy' | 'endurance' | 'general_fitness'
      exercises: Array<{
        exercise_id: string
        sets: number
        reps: string | number
        rest: number
        notes?: string
        order?: number
      }>
    }) => {
      const res = await fetch('/api/workout-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to create template')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.templates })
      toast.success('template created!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to create template')
    },
  })
}

// useUpdateTemplate - update existing workout template
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      name?: string
      description?: string
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      duration_minutes?: number
      tags?: string[]
      target_goal?: 'strength' | 'hypertrophy' | 'endurance' | 'general_fitness'
      exercises?: Array<{
        exercise_id: string
        sets: number
        reps: string | number
        rest: number
        notes?: string
        order?: number
      }>
    }) => {
      const { id, ...templateData } = params
      const res = await fetch(`/api/workout-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to update template')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.templates })
      // Removed toast notification - too many popups during editing
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to update template')
    },
  })
}

// useDeleteTemplate - delete workout template
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/workout-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to delete template')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.templates })
      toast.success('template deleted!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to delete template')
    },
  })
}

// useExerciseHistory - fetch exercise progress history
export function useExerciseHistory(exerciseId: string, limit = 10) {
  return useQuery({
    queryKey: ['exercise-history', exerciseId, limit],
    queryFn: async () => {
      const res = await fetch(`/api/exercises/${exerciseId}/history?limit=${limit}`)
      if (!res.ok) throw new Error('failed to fetch exercise history')
      const data = await res.json()
      // API returns workout_exercises with nested workouts and sets array
      return data.history as Array<{
        id: string
        workout_id: string
        exercise_id: string
        sets: Array<{
          set_number?: number
          reps?: number
          weight?: number
          rpe?: number
          completed?: boolean
        }>
        workouts: {
          id: string
          workout_date: string
          completed_at: string
          status: string
        }
        maxWeight: number
        totalVolume: number
        totalSets: number
        totalReps: number
        avgRpe: number | null
        estimated1RM: number
      }>
    },
    enabled: !!exerciseId,
  })
}

// usePersonalRecords - fetch personal records
export function usePersonalRecords(exerciseId?: string) {
  return useQuery({
    queryKey: ['personal-records', exerciseId],
    queryFn: async () => {
      const params = exerciseId ? `?exerciseId=${exerciseId}` : ''
      const res = await fetch(`/api/personal-records${params}`)
      if (!res.ok) throw new Error('failed to fetch personal records')
      const data = await res.json()
      return data.personalRecords as Array<{
        id: string
        exercise_id: string
        exercise_name: string
        record_type: '1rm' | 'max_reps' | 'max_volume' | 'max_weight'
        value: number
        unit?: string
        achieved_at: string
        notes?: string
      }>
    },
  })
}

// useCreatePersonalRecord - create or update personal record
export function useCreatePersonalRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recordData: {
      exercise_id: string
      record_type: '1rm' | 'max_reps' | 'max_volume' | 'max_weight'
      value: number
      unit?: string
      achieved_at?: string
      workout_exercise_id?: string
      notes?: string
    }) => {
      const res = await fetch('/api/personal-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to create personal record')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-records'] })
      toast.success('new personal record! 🏆')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to save personal record')
    },
  })
}
