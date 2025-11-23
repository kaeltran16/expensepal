'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ExpenseFilters } from './query-keys'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types'
import { toast } from 'sonner'

// Type aliases from database
type Expense = Tables<'expenses'>
type ExpenseInsert = TablesInsert<'expenses'>
type ExpenseUpdate = TablesUpdate<'expenses'>

/**
 * Fetch expenses with optional filters
 */
async function fetchExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const params = new URLSearchParams()

  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.merchant) params.append('merchant', filters.merchant)
  if (filters?.category) params.append('category', filters.category)

  const response = await fetch(`/api/expenses?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch expenses')
  }

  const data = await response.json()
  return data.expenses || []
}

/**
 * Hook to fetch expenses with optional filters
 *
 * @param filters - Optional filters for expenses
 * @param options - React Query options
 *
 * @example
 * const { data: expenses, isLoading } = useExpenses()
 *
 * @example
 * const { data: expenses } = useExpenses({
 *   category: 'Food',
 *   startDate: '2025-11-01',
 *   limit: 50
 * })
 */
export function useExpenses(
  filters?: ExpenseFilters,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => fetchExpenses(filters),
    ...options,
  })
}

/**
 * Create expense mutation
 */
async function createExpense(expense: ExpenseInsert): Promise<Expense> {
  const response = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create expense')
  }

  return response.json()
}

/**
 * Hook to create a new expense
 *
 * @example
 * const { mutate: createExpense, isPending } = useCreateExpense()
 *
 * createExpense({
 *   amount: 50000,
 *   merchant: 'Starbucks',
 *   currency: 'VND',
 *   transaction_date: new Date().toISOString(),
 *   source: 'manual'
 * })
 */
export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      // Invalidate all expense queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      toast.success('Expense created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create expense')
    },
  })
}

/**
 * Hook with optimistic update for creating expenses
 * Provides better UX by immediately updating the UI
 *
 * @example
 * const { mutate: createExpense } = useCreateExpenseOptimistic()
 *
 * createExpense({
 *   amount: 50000,
 *   merchant: 'Starbucks',
 *   currency: 'VND',
 *   transaction_date: new Date().toISOString(),
 *   source: 'manual'
 * })
 */
export function useCreateExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onMutate: async (newExpense) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      // Snapshot previous value
      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.lists())

      // Create optimistic expense with temporary ID
      const optimisticExpense: Expense = {
        id: `temp-${Date.now()}`,
        amount: newExpense.amount,
        merchant: newExpense.merchant,
        currency: newExpense.currency || 'VND',
        transaction_date: newExpense.transaction_date || new Date().toISOString(),
        source: newExpense.source || 'manual',
        category: newExpense.category,
        notes: newExpense.notes,
        card_number: newExpense.card_number,
        cardholder: newExpense.cardholder,
        transaction_type: newExpense.transaction_type,
        email_subject: newExpense.email_subject,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Expense

      // Optimistically update all expense lists
      queryClient.setQueriesData({ queryKey: queryKeys.expenses.lists() }, (old: Expense[] | undefined) => {
        if (!old) return [optimisticExpense]
        return [optimisticExpense, ...old]
      })

      return { previousExpenses }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.lists(), context.previousExpenses)
      }
      toast.error(error.message || 'Failed to create expense')
    },
    onSuccess: () => {
      toast.success('Expense added!')
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
    },
  })
}

/**
 * Update expense mutation
 */
async function updateExpense({
  id,
  updates,
}: {
  id: string
  updates: ExpenseUpdate
}): Promise<Expense> {
  const response = await fetch(`/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update expense')
  }

  return response.json()
}

/**
 * Hook to update an existing expense
 *
 * @example
 * const { mutate: updateExpense } = useUpdateExpense()
 *
 * updateExpense({
 *   id: 'expense-id',
 *   updates: { category: 'Food', notes: 'Updated note' }
 * })
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      toast.success('Expense updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update expense')
    },
  })
}

/**
 * Delete expense mutation
 */
async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`/api/expenses/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete expense')
  }
}

/**
 * Hook to delete an expense
 *
 * @example
 * const { mutate: deleteExpense } = useDeleteExpense()
 *
 * deleteExpense('expense-id')
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      toast.success('Expense deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete expense')
    },
  })
}

/**
 * Hook with optimistic update for deleting expenses
 * Provides better UX by immediately updating the UI
 *
 * @example
 * const { mutate: deleteExpense } = useDeleteExpenseOptimistic()
 *
 * deleteExpense('expense-id')
 */
export function useDeleteExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteExpense,
    onMutate: async (expenseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      // Snapshot previous value
      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.lists())

      // Optimistically update all expense lists
      queryClient.setQueriesData({ queryKey: queryKeys.expenses.lists() }, (old: Expense[] | undefined) => {
        if (!old) return []
        return old.filter((expense) => expense.id !== expenseId)
      })

      return { previousExpenses }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.lists(), context.previousExpenses)
      }
      toast.error('Failed to delete expense')
    },
    onSuccess: () => {
      toast.success('Expense deleted')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
    },
  })
}
