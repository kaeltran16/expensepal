'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type GoalFilters } from './query-keys'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types'
import { toast } from 'sonner'

// Type aliases from database
type Goal = Tables<'savings_goals'>
type GoalInsert = TablesInsert<'savings_goals'>
type GoalUpdate = TablesUpdate<'savings_goals'>

/**
 * Fetch savings goals with optional filters
 */
async function fetchGoals(filters?: GoalFilters): Promise<Goal[]> {
  const params = new URLSearchParams()

  if (filters?.active !== undefined) {
    params.append('active', filters.active.toString())
  }

  const response = await fetch(`/api/goals?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch goals')
  }

  const data = await response.json()
  return data.goals || data || []
}

/**
 * Hook to fetch savings goals with optional filters
 *
 * @param filters - Optional filters for goals
 * @param options - React Query options
 *
 * @example
 * const { data: goals, isLoading } = useGoals()
 *
 * @example
 * const { data: activeGoals } = useGoals({ active: true })
 */
export function useGoals(
  filters?: GoalFilters,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.goals.list(filters),
    queryFn: () => fetchGoals(filters),
    ...options,
  })
}

/**
 * Create goal mutation
 */
async function createGoal(goal: GoalInsert): Promise<Goal> {
  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create goal')
  }

  return response.json()
}

/**
 * Hook to create a new savings goal
 *
 * @example
 * const { mutate: createGoal, isPending } = useCreateGoal()
 *
 * createGoal({
 *   name: 'Vacation Fund',
 *   target_amount: 10000000,
 *   current_amount: 0,
 *   deadline: '2025-12-31',
 *   icon: '✈️'
 * })
 */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      toast.success('Goal created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create goal')
    },
  })
}

/**
 * Update goal mutation
 */
async function updateGoal({
  id,
  updates,
}: {
  id: string
  updates: GoalUpdate
}): Promise<Goal> {
  const response = await fetch(`/api/goals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update goal')
  }

  return response.json()
}

/**
 * Hook to update an existing goal
 *
 * @example
 * const { mutate: updateGoal } = useUpdateGoal()
 *
 * updateGoal({
 *   id: 'goal-id',
 *   updates: { current_amount: 5000000 }
 * })
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      toast.success('Goal updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update goal')
    },
  })
}

/**
 * Delete goal mutation
 */
async function deleteGoal(id: string): Promise<void> {
  const response = await fetch(`/api/goals/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete goal')
  }
}

/**
 * Hook to delete a goal
 *
 * @example
 * const { mutate: deleteGoal } = useDeleteGoal()
 *
 * deleteGoal('goal-id')
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      toast.success('Goal deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete goal')
    },
  })
}

/**
 * Hook with optimistic update for updating goals
 * Provides better UX by immediately updating the UI
 *
 * @example
 * const { mutate: updateGoal } = useUpdateGoalOptimistic()
 *
 * updateGoal({ id: 'goal-id', updates: { current_amount: 7500000 } })
 */
export function useUpdateGoalOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateGoal,
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      // Snapshot previous value
      const previousGoals = queryClient.getQueryData(queryKeys.goals.lists())

      // Optimistically update all goal lists
      queryClient.setQueriesData({ queryKey: queryKeys.goals.lists() }, (old: Goal[] | undefined) => {
        if (!old) return []
        return old.map((goal) =>
          goal.id === id ? { ...goal, ...updates, updated_at: new Date().toISOString() } : goal
        )
      })

      return { previousGoals }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.lists(), context.previousGoals)
      }
      toast.error('Failed to update goal')
    },
    onSuccess: () => {
      toast.success('Goal updated')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

/**
 * Hook with optimistic delete for goals
 * Provides better UX by immediately removing from UI
 *
 * @example
 * const { mutate: deleteGoal } = useDeleteGoalOptimistic()
 *
 * deleteGoal('goal-id')
 */
export function useDeleteGoalOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGoal,
    onMutate: async (goalId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      // Snapshot previous value
      const previousGoals = queryClient.getQueryData(queryKeys.goals.lists())

      // Optimistically remove from all goal lists
      queryClient.setQueriesData({ queryKey: queryKeys.goals.lists() }, (old: Goal[] | undefined) => {
        if (!old) return []
        return old.filter((goal) => goal.id !== goalId)
      })

      return { previousGoals }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.lists(), context.previousGoals)
      }
      toast.error('Failed to delete goal')
    },
    onSuccess: () => {
      toast.success('Goal deleted')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
