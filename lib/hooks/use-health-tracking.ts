'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys, type WeightLogFilters } from './query-keys'

// ============================================================================
// Types
// ============================================================================

export interface WeightLog {
  id: string
  user_id: string
  weight: number
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WaterLog {
  id?: string
  user_id?: string
  amount_ml: number
  date: string
  created_at?: string
  updated_at?: string
}

export interface MealStreak {
  currentStreak: number
  bestStreak: number
  lastMealDate: string | null
}

export interface SavedFood {
  id: string
  user_id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: string
  is_favorite: boolean
  use_count: number
  last_used_at: string | null
  notes: string | null
  portion_description: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Weight Tracking
// ============================================================================

async function fetchWeightLogs(filters?: WeightLogFilters): Promise<WeightLog[]> {
  const params = new URLSearchParams()

  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const response = await fetch(`/api/weight?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch weight logs')
  }

  const data = await response.json()
  return data.weightLogs || []
}

export function useWeightLogs(filters?: WeightLogFilters) {
  return useQuery({
    queryKey: queryKeys.weightLogs.list(filters),
    queryFn: () => fetchWeightLogs(filters),
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    placeholderData: (previousData) => previousData,
  })
}

async function logWeight(data: { weight: number; date: string; notes?: string }): Promise<WeightLog> {
  const response = await fetch('/api/weight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to log weight')
  }

  return response.json()
}

export function useLogWeight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logWeight,
    onSuccess: (data) => {
      toast.success('Weight logged!', {
        description: `${data.weight} kg on ${data.date}`,
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log weight')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.weightLogs.all,
        refetchType: 'all',
      })
    },
  })
}

/**
 * Hook with optimistic update for logging weight
 */
export function useLogWeightOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logWeight,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.weightLogs.all })

      const previousData = queryClient.getQueryData<WeightLog[]>(queryKeys.weightLogs.lists())

      const optimisticLog: WeightLog = {
        id: `temp-${Date.now()}`,
        user_id: '',
        weight: data.weight,
        date: data.date,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueriesData({ queryKey: queryKeys.weightLogs.lists() }, (old: WeightLog[] | undefined) => {
        if (!old) return [optimisticLog]
        return [optimisticLog, ...old]
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.weightLogs.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to log weight')
    },
    onSuccess: (data) => {
      toast.success('Weight logged!', {
        description: `${data.weight} kg on ${data.date}`,
      })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.weightLogs.all,
        refetchType: 'all',
      })
    },
  })
}

async function deleteWeightLog(id: string): Promise<void> {
  const response = await fetch(`/api/weight/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete weight log')
  }
}

export function useDeleteWeightLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWeightLog,
    onSuccess: () => {
      toast.success('Weight entry deleted')
    },
    onError: () => {
      toast.error('Failed to delete weight entry')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.weightLogs.all,
        refetchType: 'all',
      })
    },
  })
}

/**
 * Hook with optimistic delete for weight logs
 */
export function useDeleteWeightLogOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWeightLog,
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.weightLogs.all })

      const previousData = queryClient.getQueryData<WeightLog[]>(queryKeys.weightLogs.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.weightLogs.lists() }, (old: WeightLog[] | undefined) => {
        if (!old) return []
        return old.filter((log) => log.id !== logId)
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.weightLogs.lists(), context.previousData)
      }
      toast.error('Failed to delete weight entry')
    },
    onSuccess: () => {
      toast.success('Weight entry deleted')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.weightLogs.all,
        refetchType: 'all',
      })
    },
  })
}

// ============================================================================
// Water Tracking
// ============================================================================

interface WaterLogResponse {
  waterLog: WaterLog
  daily_goal_ml: number
}

async function fetchWaterLog(date?: string): Promise<WaterLogResponse> {
  const params = new URLSearchParams()

  if (date) {
    params.append('date', date)
  }
  params.append('timezoneOffset', new Date().getTimezoneOffset().toString())

  const response = await fetch(`/api/water?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch water log')
  }

  return response.json()
}

export function useWaterLog(date?: string) {
  const todayDate = date || new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: queryKeys.waterLogs.today(todayDate),
    queryFn: () => fetchWaterLog(date),
    staleTime: 5 * 60 * 1000, // 5 minutes (water changes frequently)
    placeholderData: (previousData) => previousData,
  })
}

async function addWater(data: { amount_ml: number; date?: string }): Promise<WaterLog> {
  const response = await fetch('/api/water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      timezoneOffset: new Date().getTimezoneOffset(),
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to add water')
  }

  return response.json()
}

export function useAddWater() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addWater,
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.waterLogs.all })

      // Snapshot previous value
      const todayDate = data.date || new Date().toISOString().split('T')[0]
      const previousData = queryClient.getQueryData<WaterLogResponse>(
        queryKeys.waterLogs.today(todayDate)
      )

      // Optimistic update
      if (previousData) {
        queryClient.setQueryData<WaterLogResponse>(
          queryKeys.waterLogs.today(todayDate),
          {
            ...previousData,
            waterLog: {
              ...previousData.waterLog,
              amount_ml: previousData.waterLog.amount_ml + data.amount_ml,
            },
          }
        )
      }

      return { previousData, todayDate }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.waterLogs.today(context.todayDate),
          context.previousData
        )
      }
      toast.error('Failed to log water')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.waterLogs.all,
        refetchType: 'all',
      })
    },
  })
}

async function setWater(data: { amount_ml: number; date?: string }): Promise<WaterLog> {
  const response = await fetch('/api/water', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      timezoneOffset: new Date().getTimezoneOffset(),
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to set water')
  }

  return response.json()
}

export function useSetWater() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setWater,
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.waterLogs.all,
        refetchType: 'all',
      })
    },
  })
}

/**
 * Hook with optimistic set for water log
 */
export function useSetWaterOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setWater,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.waterLogs.all })

      const todayDate = data.date || new Date().toISOString().split('T')[0]
      const previousData = queryClient.getQueryData<WaterLogResponse>(
        queryKeys.waterLogs.today(todayDate)
      )

      if (previousData) {
        queryClient.setQueryData<WaterLogResponse>(
          queryKeys.waterLogs.today(todayDate),
          {
            ...previousData,
            waterLog: {
              ...previousData.waterLog,
              amount_ml: data.amount_ml,
            },
          }
        )
      }

      return { previousData, todayDate }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.waterLogs.today(context.todayDate),
          context.previousData
        )
      }
      toast.error('Failed to set water')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.waterLogs.all,
        refetchType: 'all',
      })
    },
  })
}

// ============================================================================
// Meal Streaks
// ============================================================================

async function fetchMealStreak(): Promise<MealStreak> {
  const params = new URLSearchParams()
  params.append('timezoneOffset', new Date().getTimezoneOffset().toString())

  const response = await fetch(`/api/streaks/meals?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch meal streak')
  }

  return response.json()
}

export function useMealStreak() {
  return useQuery({
    queryKey: queryKeys.mealStreaks.current(),
    queryFn: fetchMealStreak,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    placeholderData: (previousData) => previousData,
  })
}

// ============================================================================
// Saved Foods / Favorites
// ============================================================================

async function fetchSavedFoods(favoritesOnly?: boolean): Promise<SavedFood[]> {
  const params = new URLSearchParams()

  if (favoritesOnly) {
    params.append('favorites', 'true')
  }

  const response = await fetch(`/api/saved-foods?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch saved foods')
  }

  const data = await response.json()
  return data.savedFoods || []
}

export function useSavedFoods(favoritesOnly?: boolean) {
  return useQuery({
    queryKey: queryKeys.savedFoods.list(favoritesOnly),
    queryFn: () => fetchSavedFoods(favoritesOnly),
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    placeholderData: (previousData) => previousData,
  })
}

export function useFavoriteMeals() {
  return useSavedFoods(true)
}

async function toggleFavorite(data: { id: string; is_favorite: boolean }): Promise<SavedFood> {
  const response = await fetch(`/api/saved-foods/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_favorite: data.is_favorite }),
  })

  if (!response.ok) {
    throw new Error('Failed to toggle favorite')
  }

  return response.json()
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (data) => {
      toast.success(data.is_favorite ? 'Added to favorites' : 'Removed from favorites')
    },
    onError: () => {
      toast.error('Failed to update favorite')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedFoods.all,
        refetchType: 'all',
      })
    },
  })
}

/**
 * Hook with optimistic toggle for favorites
 */
export function useToggleFavoriteOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedFoods.all })

      const previousData = queryClient.getQueryData<SavedFood[]>(queryKeys.savedFoods.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.savedFoods.lists() }, (old: SavedFood[] | undefined) => {
        if (!old) return []
        return old.map((food) =>
          food.id === id ? { ...food, is_favorite } : food
        )
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.savedFoods.lists(), context.previousData)
      }
      toast.error('Failed to update favorite')
    },
    onSuccess: (data) => {
      toast.success(data.is_favorite ? 'Added to favorites' : 'Removed from favorites')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedFoods.all,
        refetchType: 'all',
      })
    },
  })
}

async function quickAddMeal(savedFood: SavedFood): Promise<any> {
  // First, increment use count
  await fetch(`/api/saved-foods/${savedFood.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increment_use: true }),
  })

  // Then, create meal
  const response = await fetch('/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: savedFood.name,
      calories: savedFood.calories,
      protein: savedFood.protein,
      carbs: savedFood.carbs,
      fat: savedFood.fat,
      meal_time: 'other',
      meal_date: new Date().toISOString(),
      source: 'saved',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to log meal')
  }

  return response.json()
}

export function useQuickAddMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: quickAddMeal,
    onSuccess: (data) => {
      toast.success('Meal logged!', {
        description: `${data.name} - ${data.calories} cal`,
      })
    },
    onError: () => {
      toast.error('Failed to log meal')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meals.all,
        refetchType: 'all',
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieStats.all,
        refetchType: 'all',
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedFoods.all,
        refetchType: 'all',
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealStreaks.all,
        refetchType: 'all',
      })
    },
  })
}

async function saveFoodAsFavorite(data: {
  name: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  portion_description?: string
}): Promise<SavedFood> {
  const response = await fetch('/api/saved-foods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      is_favorite: true,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to save food')
  }

  return response.json()
}

export function useSaveFoodAsFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveFoodAsFavorite,
    onSuccess: (data) => {
      toast.success('Saved to favorites!', {
        description: data.name,
      })
    },
    onError: () => {
      toast.error('Failed to save to favorites')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedFoods.all,
        refetchType: 'all',
      })
    },
  })
}
