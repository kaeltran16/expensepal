import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Exercise } from '@/lib/supabase'

export interface ExerciseFavorite {
  user_id: string
  exercise_id: string
  created_at: string
  exercise: Exercise
}

export interface CustomExercise {
  id: string
  user_id: string
  name: string
  description: string | null
  muscle_groups: string[]
  equipment: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  video_url: string | null
  image_url: string | null
  instructions: string | null
  tips: string | null
  created_at: string
  updated_at: string
}

// Get exercise favorites
export function useExerciseFavorites() {
  return useQuery({
    queryKey: ['exercise-favorites'],
    queryFn: async () => {
      const response = await fetch('/api/exercise-favorites')

      if (!response.ok) {
        throw new Error('Failed to fetch favorites')
      }

      const data = await response.json()
      return data.favorites as ExerciseFavorite[]
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Check if exercise is favorited
export function useIsExerciseFavorite(exerciseId: string) {
  const { data: favorites = [] } = useExerciseFavorites()
  return favorites.some(fav => fav.exercise_id === exerciseId)
}

// Toggle favorite (add or remove)
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  const addFavorite = useMutation({
    mutationFn: async (exercise_id: string) => {
      const response = await fetch('/api/exercise-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add favorite')
      }

      const result = await response.json()
      return result.favorite as ExerciseFavorite
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-favorites'] })
    },
  })

  const removeFavorite = useMutation({
    mutationFn: async (exercise_id: string) => {
      const response = await fetch(`/api/exercise-favorites?exercise_id=${exercise_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove favorite')
      }

      return { exercise_id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-favorites'] })
    },
  })

  return {
    addFavorite: addFavorite.mutateAsync,
    removeFavorite: removeFavorite.mutateAsync,
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending,
  }
}

// Get custom exercises
export function useCustomExercises() {
  return useQuery({
    queryKey: ['custom-exercises'],
    queryFn: async () => {
      const response = await fetch('/api/custom-exercises')

      if (!response.ok) {
        throw new Error('Failed to fetch custom exercises')
      }

      const data = await response.json()
      return data.customExercises as CustomExercise[]
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Create custom exercise
export function useCreateCustomExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      muscle_groups?: string[]
      equipment?: string
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      video_url?: string
      image_url?: string
      instructions?: string
      tips?: string
    }) => {
      const response = await fetch('/api/custom-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create custom exercise')
      }

      const result = await response.json()
      return result.customExercise as CustomExercise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] })
    },
  })
}

// Update custom exercise
export function useUpdateCustomExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      description?: string
      muscle_groups?: string[]
      equipment?: string
      difficulty?: 'beginner' | 'intermediate' | 'advanced'
      video_url?: string
      image_url?: string
      instructions?: string
      tips?: string
    }) => {
      const response = await fetch(`/api/custom-exercises?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update custom exercise')
      }

      const result = await response.json()
      return result.customExercise as CustomExercise
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] })
    },
  })
}

// Delete custom exercise
export function useDeleteCustomExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/custom-exercises?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete custom exercise')
      }

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] })
    },
  })
}

// Get recent exercises (from workout history)
export function useRecentExercises(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-exercises', limit],
    queryFn: async () => {
      // This will fetch from workouts and extract unique recent exercises
      const response = await fetch('/api/workouts?limit=20')

      if (!response.ok) {
        throw new Error('Failed to fetch recent exercises')
      }

      const data = await response.json()
      const workouts = data.workouts || []

      // Extract unique exercises from recent workouts
      const exerciseIds = new Set<string>()
      const recentExerciseIds: string[] = []

      for (const workout of workouts) {
        if (workout.exercises && Array.isArray(workout.exercises)) {
          for (const ex of workout.exercises) {
            if (ex.id && !exerciseIds.has(ex.id)) {
              exerciseIds.add(ex.id)
              recentExerciseIds.push(ex.id)

              if (recentExerciseIds.length >= limit) break
            }
          }
        }
        if (recentExerciseIds.length >= limit) break
      }

      return recentExerciseIds
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
