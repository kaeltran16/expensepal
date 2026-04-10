'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types'
import { queryKeys, type ExpenseFilters } from './query-keys'

// Type aliases from database
type Expense = Tables<'expenses'>
type ExpenseInsert = TablesInsert<'expenses'>
type ExpenseUpdate = TablesUpdate<'expenses'>

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
    staleTime: 12 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    ...options,
  })
}

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

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      toast.success('Expense created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create expense')
    },
  })
}

export function useCreateExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

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
        transaction_type: newExpense.transaction_type,
        email_subject: newExpense.email_subject,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Expense

      queryClient.setQueriesData({ queryKey: queryKeys.expenses.lists() }, (old: Expense[] | undefined) => {
        if (!old) return [optimisticExpense]
        return [optimisticExpense, ...old]
      })

      return { previousExpenses }
    },
    onError: (error, _, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.lists(), context.previousExpenses)
      }
      toast.error(error.message || 'Failed to create expense')
    },
    onSuccess: () => {
      toast.success('Expense added!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.calorieStats.all })
    },
  })
}

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

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update expense')
    },
  })
}

export function useUpdateExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExpense,
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.expenses.lists() }, (old: Expense[] | undefined) => {
        if (!old) return []
        return old.map((expense) =>
          expense.id === id ? { ...expense, ...updates, updated_at: new Date().toISOString() } : expense
        )
      })

      return { previousExpenses }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.lists(), context.previousExpenses)
      }
      toast.error('Failed to update expense')
    },
    onSuccess: () => {
      toast.success('Expense updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
    },
  })
}

async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`/api/expenses/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete expense')
  }
}

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

export function useDeleteExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteExpense,
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.lists())

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
    },
  })
}
