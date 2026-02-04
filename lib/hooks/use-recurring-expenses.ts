'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys, type RecurringExpenseFilters } from './query-keys'
import type {
  RecurringExpense,
  RecurringExpenseInsert,
  RecurringExpenseUpdate,
} from '@/lib/supabase'

/**
 * Fetch recurring expenses with optional filters
 */
async function fetchRecurringExpenses(
  filters?: RecurringExpenseFilters
): Promise<RecurringExpense[]> {
  const params = new URLSearchParams()

  if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
  if (filters?.source) params.append('source', filters.source)
  if (filters?.category) params.append('category', filters.category)

  const response = await fetch(`/api/recurring-expenses?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch recurring expenses')
  }

  const data = await response.json()
  return data.recurringExpenses || []
}

/**
 * Hook to fetch recurring expenses with optional filters
 *
 * @example
 * const { data: expenses, isLoading } = useRecurringExpenses()
 *
 * @example
 * const { data: active } = useRecurringExpenses({ isActive: true })
 */
export function useRecurringExpenses(
  filters?: RecurringExpenseFilters,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.list(filters),
    queryFn: () => fetchRecurringExpenses(filters),
    // Cache for 5 minutes - recurring expenses change less frequently
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    ...options,
  })
}

/**
 * Hook to fetch due/overdue recurring expenses
 */
export function useDueRecurringExpenses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.due(),
    queryFn: async () => {
      const response = await fetch('/api/recurring-expenses/due')
      if (!response.ok) throw new Error('Failed to fetch due expenses')
      const data = await response.json()
      return data.recurringExpenses || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - check more frequently
    ...options,
  })
}

/**
 * Hook to fetch upcoming recurring expenses (within X days)
 */
export function useUpcomingRecurringExpenses(
  withinDays: number = 7,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.upcoming(withinDays),
    queryFn: async () => {
      const response = await fetch(`/api/recurring-expenses/upcoming?days=${withinDays}`)
      if (!response.ok) throw new Error('Failed to fetch upcoming expenses')
      const data = await response.json()
      return data.recurringExpenses || []
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Hook to detect recurring patterns from transaction history
 * Uses caching to avoid expensive recalculation
 */
export function useDetectedRecurringExpenses(
  expenseCount: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.detected(expenseCount),
    queryFn: async () => {
      const response = await fetch('/api/recurring-expenses/detect')
      if (!response.ok) throw new Error('Failed to detect recurring expenses')
      const data = await response.json()
      return data.detectedExpenses || []
    },
    // Cache for 10 minutes - detection is expensive
    staleTime: 10 * 60 * 1000,
    // Only run when there are expenses
    enabled: expenseCount > 0 && (options?.enabled ?? true),
  })
}

/**
 * Create recurring expense mutation
 */
async function createRecurringExpense(
  expense: RecurringExpenseInsert
): Promise<RecurringExpense> {
  const response = await fetch('/api/recurring-expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create recurring expense')
  }

  return response.json()
}

/**
 * Hook to create a recurring expense
 */
export function useCreateRecurringExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecurringExpense,
    onSuccess: () => {
      // Invalidate all recurring expense queries
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
      toast.success('Recurring expense created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create recurring expense')
    },
  })
}

/**
 * Hook with optimistic create for recurring expenses
 */
export function useCreateRecurringExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecurringExpense,
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      const optimisticExpense = {
        id: `temp-${Date.now()}`,
        user_id: '',
        merchant: newExpense.merchant,
        category: newExpense.category || '',
        amount: newExpense.amount,
        currency: 'VND',
        frequency: newExpense.frequency,
        next_due_date: newExpense.next_due_date,
        is_active: true as boolean | null,
        source: newExpense.source || 'manual',
        skipped_dates: [] as string[] | null,
        auto_create: null,
        confidence_score: null,
        end_date: null,
        interval_days: null,
        last_occurrence: null,
        notes: null,
        original_amount: null,
        reminder_days: null,
        start_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as RecurringExpense

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return [optimisticExpense]
        return [optimisticExpense, ...old]
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to create recurring expense')
    },
    onSuccess: () => {
      toast.success('Recurring expense created')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}

/**
 * Update recurring expense mutation
 */
async function updateRecurringExpense({
  id,
  updates,
}: {
  id: string
  updates: RecurringExpenseUpdate
}): Promise<RecurringExpense> {
  const response = await fetch(`/api/recurring-expenses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update recurring expense')
  }

  return response.json()
}

/**
 * Hook to update a recurring expense
 */
export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecurringExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
      toast.success('Recurring expense updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update recurring expense')
    },
  })
}

/**
 * Hook with optimistic update for recurring expenses
 */
export function useUpdateRecurringExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecurringExpense,
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return []
        return old.map((expense) =>
          expense.id === id ? { ...expense, ...updates, updated_at: new Date().toISOString() } : expense
        )
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to update recurring expense')
    },
    onSuccess: () => {
      toast.success('Recurring expense updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}

/**
 * Delete recurring expense mutation
 */
async function deleteRecurringExpense(id: string): Promise<void> {
  const response = await fetch(`/api/recurring-expenses/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete recurring expense')
  }
}

/**
 * Hook to delete a recurring expense
 */
export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecurringExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
      toast.success('Recurring expense deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete recurring expense')
    },
  })
}

/**
 * Hook with optimistic delete for recurring expenses
 */
export function useDeleteRecurringExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecurringExpense,
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return []
        return old.filter((expense) => expense.id !== expenseId)
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error('Failed to delete recurring expense')
    },
    onSuccess: () => {
      toast.success('Recurring expense deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}

/**
 * Skip a date for a recurring expense
 */
async function skipRecurringExpenseDate({
  id,
  date,
}: {
  id: string
  date: string
}): Promise<RecurringExpense> {
  const response = await fetch(`/api/recurring-expenses/${id}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to skip date')
  }

  return response.json()
}

/**
 * Hook to skip a date for a recurring expense
 */
export function useSkipRecurringExpenseDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: skipRecurringExpenseDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
      toast.success('Date skipped')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to skip date')
    },
  })
}

/**
 * Hook with optimistic skip date for recurring expenses
 */
export function useSkipRecurringExpenseDateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: skipRecurringExpenseDate,
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return []
        return old.map((expense) => {
          if (expense.id !== id) return expense
          const skippedDates = expense.skipped_dates || []
          return { ...expense, skipped_dates: [...skippedDates, date] }
        })
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to skip date')
    },
    onSuccess: () => {
      toast.success('Date skipped')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}

/**
 * Advance next due date (called after creating an expense)
 */
async function advanceNextDueDate(id: string): Promise<RecurringExpense> {
  const response = await fetch(`/api/recurring-expenses/${id}/advance`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to advance due date')
  }

  return response.json()
}

/**
 * Hook to advance the next due date
 */
export function useAdvanceNextDueDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: advanceNextDueDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
    onError: (error: Error) => {
      console.error('Failed to advance due date:', error)
    },
  })
}

/**
 * Batch create recurring expenses from detected patterns
 */
async function saveDetectedExpenses(
  detectedExpenses: Array<{
    merchant: string
    category: string
    averageAmount: number
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
    intervalDays: number
    nextExpected: string
    confidence: number
  }>
): Promise<RecurringExpense[]> {
  const response = await fetch('/api/recurring-expenses/save-detected', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ detectedExpenses }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save detected expenses')
  }

  return response.json()
}

/**
 * Hook to save detected recurring expenses to the database
 */
export function useSaveDetectedExpenses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveDetectedExpenses,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
      toast.success(`Saved ${data.length} recurring expense${data.length !== 1 ? 's' : ''}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save detected expenses')
    },
  })
}
