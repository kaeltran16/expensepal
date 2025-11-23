'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type BudgetFilters } from './query-keys'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types'
import { toast } from 'sonner'

// Type aliases from database
type Budget = Tables<'budgets'>
type BudgetInsert = TablesInsert<'budgets'>
type BudgetUpdate = TablesUpdate<'budgets'>

/**
 * Fetch budgets with optional filters
 */
async function fetchBudgets(filters?: BudgetFilters): Promise<Budget[]> {
  const params = new URLSearchParams()

  if (filters?.month) params.append('month', filters.month)
  if (filters?.category) params.append('category', filters.category)

  const response = await fetch(`/api/budgets?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch budgets')
  }

  const data = await response.json()
  return data.budgets || data || []
}

/**
 * Hook to fetch budgets with optional filters
 *
 * @param filters - Optional filters for budgets
 * @param options - React Query options
 *
 * @example
 * const { data: budgets, isLoading } = useBudgets()
 *
 * @example
 * const { data: budgets } = useBudgets({
 *   month: '2025-11',
 *   category: 'Food'
 * })
 */
export function useBudgets(
  filters?: BudgetFilters,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.budgets.list(filters),
    queryFn: () => fetchBudgets(filters),
    ...options,
  })
}

/**
 * Create budget mutation
 */
async function createBudget(budget: BudgetInsert): Promise<Budget> {
  const response = await fetch('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budget),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create budget')
  }

  return response.json()
}

/**
 * Hook to create a new budget
 *
 * @example
 * const { mutate: createBudget, isPending } = useCreateBudget()
 *
 * createBudget({
 *   category: 'Food',
 *   amount: 5000000,
 *   month: '2025-11'
 * })
 */
export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      toast.success('Budget created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create budget')
    },
  })
}

/**
 * Update budget mutation
 */
async function updateBudget({
  id,
  updates,
}: {
  id: string
  updates: BudgetUpdate
}): Promise<Budget> {
  const response = await fetch(`/api/budgets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update budget')
  }

  return response.json()
}

/**
 * Hook to update an existing budget
 *
 * @example
 * const { mutate: updateBudget } = useUpdateBudget()
 *
 * updateBudget({
 *   id: 'budget-id',
 *   updates: { amount: 6000000 }
 * })
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      toast.success('Budget updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update budget')
    },
  })
}

/**
 * Delete budget mutation
 */
async function deleteBudget(id: string): Promise<void> {
  const response = await fetch(`/api/budgets/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete budget')
  }
}

/**
 * Hook to delete a budget
 *
 * @example
 * const { mutate: deleteBudget } = useDeleteBudget()
 *
 * deleteBudget('budget-id')
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
      toast.success('Budget deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete budget')
    },
  })
}

/**
 * Hook with optimistic update for updating budgets
 * Provides better UX by immediately updating the UI
 *
 * @example
 * const { mutate: updateBudget } = useUpdateBudgetOptimistic()
 *
 * updateBudget({ id: 'budget-id', updates: { amount: 7000000 } })
 */
export function useUpdateBudgetOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBudget,
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.budgets.all })

      // Snapshot previous value
      const previousBudgets = queryClient.getQueryData(queryKeys.budgets.lists())

      // Optimistically update all budget lists
      queryClient.setQueriesData({ queryKey: queryKeys.budgets.lists() }, (old: Budget[] | undefined) => {
        if (!old) return []
        return old.map((budget) =>
          budget.id === id ? { ...budget, ...updates, updated_at: new Date().toISOString() } : budget
        )
      })

      return { previousBudgets }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousBudgets) {
        queryClient.setQueryData(queryKeys.budgets.lists(), context.previousBudgets)
      }
      toast.error('Failed to update budget')
    },
    onSuccess: () => {
      toast.success('Budget updated')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}
