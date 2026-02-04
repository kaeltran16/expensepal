import type { WorkoutTemplate } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ScheduledWorkout {
  id: string
  user_id: string
  template_id: string | null
  scheduled_date: string
  status: 'scheduled' | 'completed' | 'skipped'
  completed_workout_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  template?: WorkoutTemplate | null
}

interface UseScheduledWorkoutsOptions {
  startDate?: string
  endDate?: string
}

// Get scheduled workouts
export function useScheduledWorkouts({ startDate, endDate }: UseScheduledWorkoutsOptions = {}) {
  return useQuery({
    queryKey: ['scheduled-workouts', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const url = `/api/scheduled-workouts${params.toString() ? `?${params}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch scheduled workouts')
      }

      const data = await response.json()
      return data.scheduledWorkouts as ScheduledWorkout[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Get today's scheduled workout
export function useTodayScheduledWorkout() {
  const today = new Date().toISOString().split('T')[0]!

  return useQuery({
    queryKey: ['scheduled-workout', 'today', today],
    queryFn: async (): Promise<ScheduledWorkout | null> => {
      const response = await fetch(`/api/scheduled-workouts?start_date=${today}&end_date=${today}`)

      if (!response.ok) {
        throw new Error('Failed to fetch today\'s workout')
      }

      const data = await response.json()
      return data.scheduledWorkouts?.[0] ?? null
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

// Create scheduled workout
export function useCreateScheduledWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      template_id: string | null
      scheduled_date: string
      notes?: string
    }) => {
      const response = await fetch('/api/scheduled-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule workout')
      }

      const result = await response.json()
      return result.scheduledWorkout as ScheduledWorkout
    },
    onSuccess: () => {
      // Invalidate all scheduled workout queries
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}

/**
 * Hook with optimistic create for scheduled workouts
 */
export function useCreateScheduledWorkoutOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      template_id: string | null
      scheduled_date: string
      notes?: string
    }) => {
      const response = await fetch('/api/scheduled-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule workout')
      }
      const result = await response.json()
      return result.scheduledWorkout as ScheduledWorkout
    },
    onMutate: async (newSchedule) => {
      await queryClient.cancelQueries({ queryKey: ['scheduled-workouts'] })
      await queryClient.cancelQueries({ queryKey: ['scheduled-workout'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['scheduled-workouts'] })

      const optimisticSchedule: ScheduledWorkout = {
        id: `temp-${Date.now()}`,
        user_id: '',
        template_id: newSchedule.template_id,
        scheduled_date: newSchedule.scheduled_date,
        status: 'scheduled',
        completed_workout_id: null,
        notes: newSchedule.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueriesData({ queryKey: ['scheduled-workouts'] }, (old: ScheduledWorkout[] | undefined) => {
        if (!old) return [optimisticSchedule]
        return [...old, optimisticSchedule]
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}

// Update scheduled workout
export function useUpdateScheduledWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      template_id?: string | null
      scheduled_date?: string
      status?: 'scheduled' | 'completed' | 'skipped'
      notes?: string
      completed_workout_id?: string | null
    }) => {
      const response = await fetch(`/api/scheduled-workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update scheduled workout')
      }

      const result = await response.json()
      return result.scheduledWorkout as ScheduledWorkout
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}

/**
 * Hook with optimistic update for scheduled workouts
 */
export function useUpdateScheduledWorkoutOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string
      template_id?: string | null
      scheduled_date?: string
      status?: 'scheduled' | 'completed' | 'skipped'
      notes?: string
      completed_workout_id?: string | null
    }) => {
      const response = await fetch(`/api/scheduled-workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update scheduled workout')
      }
      const result = await response.json()
      return result.scheduledWorkout as ScheduledWorkout
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['scheduled-workouts'] })
      await queryClient.cancelQueries({ queryKey: ['scheduled-workout'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['scheduled-workouts'] })

      queryClient.setQueriesData({ queryKey: ['scheduled-workouts'] }, (old: ScheduledWorkout[] | undefined) => {
        if (!old) return []
        return old.map((workout) =>
          workout.id === id ? { ...workout, ...updates, updated_at: new Date().toISOString() } : workout
        )
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}

// Delete scheduled workout
export function useDeleteScheduledWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scheduled-workouts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete scheduled workout')
      }

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}

/**
 * Hook with optimistic delete for scheduled workouts
 */
export function useDeleteScheduledWorkoutOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scheduled-workouts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete scheduled workout')
      }
      return { id }
    },
    onMutate: async (workoutId) => {
      await queryClient.cancelQueries({ queryKey: ['scheduled-workouts'] })
      await queryClient.cancelQueries({ queryKey: ['scheduled-workout'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['scheduled-workouts'] })

      queryClient.setQueriesData({ queryKey: ['scheduled-workouts'] }, (old: ScheduledWorkout[] | undefined) => {
        if (!old) return []
        return old.filter((workout) => workout.id !== workoutId)
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}

// Utility: Get week dates (for calendar)
export function getWeekDates(date: Date = new Date()): string[] {
  const dates: string[] = []
  const current = new Date(date)

  // Get Monday of current week
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(current.setDate(diff))

  // Generate 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date.toISOString().split('T')[0]!)
  }

  return dates
}

// Utility: Get this week's scheduled workouts
export function useThisWeekScheduledWorkouts() {
  const weekDates = getWeekDates()
  const startDate = weekDates[0]!
  const endDate = weekDates[weekDates.length - 1]!

  return useScheduledWorkouts({ startDate, endDate })
}
