import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Expense } from '@/lib/supabase'
import {
  preprocessExpenses,
  generateCacheKey,
  type PreprocessedData,
} from '@/lib/analytics/preprocess-expenses'
import { queryKeys } from './query-keys'

/**
 * Hook to preprocess and cache expense data for efficient insight generation
 *
 * This hook performs a single-pass aggregation of expense data and caches the result.
 * All insight functions should consume PreprocessedData instead of raw expenses.
 *
 * Cache key is based on expense count + latest/earliest dates for reliable invalidation.
 *
 * @param expenses - Raw expense array from useExpenses
 * @returns Cached preprocessed data with loading/error states
 */
export function usePreprocessedExpenses(expenses: Expense[]) {
  // Generate stable cache key from actual data characteristics
  const cacheKey = useMemo(() => generateCacheKey(expenses), [expenses])

  return useQuery<PreprocessedData>({
    queryKey: queryKeys.insights.preprocessed(cacheKey),
    queryFn: () => preprocessExpenses(expenses),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes (keep longer for tab switching)
    enabled: expenses.length > 0,
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  })
}

// Re-export types for convenience
export type { PreprocessedData } from '@/lib/analytics/preprocess-expenses'
