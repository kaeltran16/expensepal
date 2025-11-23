'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import {
  generateBudgetRecommendations,
  getSpendingPatterns,
  needsBudgetAdjustment,
  type BudgetRecommendation,
  type SpendingPattern,
} from '../analytics/budget-recommendations'
import type { Expense } from '../supabase'
import type { Tables } from '../supabase/database.types'

type Budget = Tables<'budgets'>

/**
 * Hook to get budget recommendations based on spending history
 */
export function useBudgetRecommendations(
  expenses: Expense[],
  budgets: Budget[] = []
) {
  return useQuery({
    queryKey: queryKeys.analytics.budgetRecommendations(
      expenses.length,
      budgets.length
    ),
    queryFn: () => generateBudgetRecommendations(expenses, budgets),
    enabled: expenses.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

/**
 * Hook to get spending patterns across all categories
 */
export function useSpendingPatterns(expenses: Expense[], budgets: Budget[] = []) {
  return useQuery({
    queryKey: queryKeys.analytics.spendingPatterns(
      expenses.length,
      budgets.length
    ),
    queryFn: () => getSpendingPatterns(expenses, budgets),
    enabled: expenses.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook to check if budgets need adjustment
 */
export function useBudgetAdjustmentCheck(
  expenses: Expense[],
  budgets: Budget[]
) {
  return useQuery({
    queryKey: queryKeys.analytics.budgetAdjustmentCheck(
      expenses.length,
      budgets.length
    ),
    queryFn: () => needsBudgetAdjustment(expenses, budgets),
    enabled: expenses.length > 0 && budgets.length > 0,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  })
}
