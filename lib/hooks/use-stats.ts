'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import { toast } from 'sonner'

/**
 * Stats/Analytics data interface
 */
export interface StatsData {
  totalExpenses: number
  totalCount: number
  averageExpense: number
  // Legacy aliases for backwards compatibility
  total: number
  count: number
  topMerchants?: Array<{
    merchant: string
    amount: number
    count: number
  }>
  categoryBreakdown: Array<{
    category: string
    total: number
    count: number
    percentage: number
  }>
  merchantBreakdown: Array<{
    merchant: string
    total: number
    count: number
  }>
  dailyTrend: Array<{
    date: string
    total: number
    count: number
  }>
  monthlyComparison?: {
    currentMonth: number
    previousMonth: number
    percentageChange: number
  }
}

/**
 * Fetch analytics/stats data
 */
async function fetchStats(period?: string): Promise<StatsData> {
  const params = new URLSearchParams()

  if (period) params.append('period', period)

  const response = await fetch(`/api/stats?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch stats')
  }

  return response.json()
}

/**
 * Hook to fetch analytics/stats data
 *
 * @param period - Optional period filter (e.g., 'week', 'month', 'year')
 * @param options - React Query options
 *
 * @example
 * const { data: stats, isLoading } = useStats()
 *
 * @example
 * const { data: monthlyStats } = useStats('month')
 */
export function useStats(
  period?: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.stats.summary(period),
    queryFn: () => fetchStats(period),
    ...options,
  })
}

/**
 * Email sync response interface
 */
export interface EmailSyncResponse {
  message: string
  newExpenses: number
  count: number
  duplicates: number
  failed: number
  mealsCreated?: number
  accounts?: number
  results?: any[]
}

/**
 * Email sync mutation
 */
async function syncEmails(days?: number): Promise<EmailSyncResponse> {
  const response = await fetch('/api/email/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days: days || 7 }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to sync emails')
  }

  return response.json()
}

/**
 * Hook to trigger email sync
 *
 * @example
 * const { mutate: syncEmails, isPending } = useEmailSync()
 *
 * // Sync last 7 days
 * syncEmails()
 *
 * // Sync last 30 days
 * syncEmails(30)
 */
export function useEmailSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncEmails,
    onSuccess: (data) => {
      // Invalidate expenses and stats queries after sync
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })

      // Also invalidate meals (in case GrabFood orders were synced)
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.calorieStats.all })

      // Don't show toast here - let the page handle it for better UX
      // The page.tsx already handles showing appropriate messages
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync emails')
    },
  })
}
