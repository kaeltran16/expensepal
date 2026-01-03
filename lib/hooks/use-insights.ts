import { useQuery } from '@tanstack/react-query'
import type { Expense } from '@/lib/supabase'
import { generateInsights, type Insight } from '@/lib/analytics/generate-insights'
import { queryKeys } from './query-keys'
import type { IconType } from '@/lib/types'

interface UseInsightsOptions {
  formatCurrency: (amount: number, currency: string) => string
  icons: {
    TrendingUp: IconType
    TrendingDown: IconType
    AlertCircle: IconType
    Lightbulb: IconType
    Calendar: IconType
  }
}

/**
 * Hook to generate and cache spending insights
 * Insights are expensive to calculate, so we cache them for 5 minutes
 * Cache is invalidated when expenses change
 *
 * @param expenses - Expense data to analyze
 * @param options - Currency formatter and icon components
 * @returns Cached insights data
 */
export function useInsights(expenses: Expense[], options: UseInsightsOptions) {
  return useQuery<Insight[]>({
    queryKey: queryKeys.insights.byExpenses(expenses.length),
    queryFn: () => generateInsights(expenses, options.formatCurrency, options.icons),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes after becoming stale
    enabled: expenses.length > 0, // Only run if there are expenses
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  })
}

/**
 * Hook to get cached budget predictions
 * Predictions are cached for 5 minutes to avoid expensive recalculations
 */
export function useBudgetPredictions(expenses: Expense[]) {
  return useQuery({
    queryKey: queryKeys.budgets.predictions(),
    queryFn: async () => {
      const response = await fetch('/api/budgets/predictions')
      if (!response.ok) {
        throw new Error('Failed to fetch budget predictions')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: expenses.length >= 10, // Only predict if enough data
  })
}
