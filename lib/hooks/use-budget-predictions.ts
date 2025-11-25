'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './query-keys'
import type {
  BudgetPrediction,
  BudgetAlert,
} from '../analytics/budget-predictions'

export interface BudgetPredictionsResponse {
  predictions: BudgetPrediction[]
  alerts: BudgetAlert[]
  savingsOpportunities: Array<{
    category: string
    currentAverage: number
    potentialSavings: number
    recommendation: string
  }>
  month: string
}

/**
 * Fetch budget predictions and alerts
 */
async function fetchBudgetPredictions(
  month?: string
): Promise<BudgetPredictionsResponse> {
  const params = new URLSearchParams()
  if (month) params.append('month', month)

  const response = await fetch(`/api/budgets/predictions?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch budget predictions')
  }

  return response.json()
}

/**
 * Hook to fetch budget predictions
 */
export function useBudgetPredictions(month?: string) {
  return useQuery({
    queryKey: queryKeys.budgets.predictions(month),
    queryFn: () => fetchBudgetPredictions(month),
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

// Categories API
export interface Category {
  id?: string
  name: string
  icon: string
  color: string
  is_default?: boolean
  user_id?: string
}

/**
 * Fetch all categories (default + custom)
 */
async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')

  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }

  const data = await response.json()
  return data.categories
}

/**
 * Hook to fetch categories
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: fetchCategories,
  })
}

/**
 * Create a new custom category
 */
async function createCategory(
  category: Omit<Category, 'id' | 'user_id' | 'is_default'>
): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create category')
  }

  const data = await response.json()
  return data.category
}

/**
 * Hook to create a custom category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created!')
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category')
    },
  })
}

/**
 * Hook to dismiss an alert
 */
export function useDismissAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (alertId: string) => {
      // Store dismissed alerts in localStorage
      const dismissed = JSON.parse(
        localStorage.getItem('dismissedAlerts') || '[]'
      )
      dismissed.push(alertId)
      localStorage.setItem('dismissedAlerts', JSON.stringify(dismissed))
    },
    onSuccess: () => {
      // Refetch predictions to update UI
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}

/**
 * Get dismissed alert IDs from localStorage
 */
export function getDismissedAlerts(): string[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('dismissedAlerts') || '[]')
}

/**
 * Clear all dismissed alerts
 */
export function clearDismissedAlerts() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dismissedAlerts')
  }
}
