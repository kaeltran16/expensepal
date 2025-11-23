import { useQuery } from '@tanstack/react-query'
import type { Expense } from '@/lib/supabase'
import { useBudgets } from './use-budgets'

interface AIInsight {
  id: string
  type: 'savings' | 'warning' | 'opportunity' | 'pattern'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action?: string
  isAI: true
}

interface AIInsightsResponse {
  insights: AIInsight[]
  generatedAt: string
}

/**
 * Hook to fetch AI-powered insights
 * Only regenerates once per week to save API costs
 */
export function useAIInsights(expenses: Expense[]) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: budgets = [] } = useBudgets({ month: currentMonth })

  return useQuery<AIInsightsResponse>({
    queryKey: ['ai-insights', getWeekKey()],
    queryFn: async () => {
      // Don't call if no expenses
      if (!expenses || expenses.length === 0) {
        return { insights: [], generatedAt: new Date().toISOString() }
      }

      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: expenses.slice(0, 100), // Only send recent 100 for analysis
          budgets
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch AI insights')
      }

      return response.json()
    },
    // Cache for 7 days (604800000 ms)
    staleTime: 7 * 24 * 60 * 60 * 1000,
    // Keep in cache for 30 days
    gcTime: 30 * 24 * 60 * 60 * 1000,
    // Don't refetch automatically
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Retry only once if it fails
    retry: 1,
    // Enable only if we have expenses
    enabled: expenses.length >= 10, // Need at least 10 expenses for meaningful insights
  })
}

/**
 * Get a unique key for the current week
 * Format: YYYY-WW (e.g., "2025-W12")
 */
function getWeekKey(): string {
  const now = new Date()
  const year = now.getFullYear()

  // Calculate week number (ISO week)
  const firstDayOfYear = new Date(year, 0, 1)
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)

  return `${year}-W${weekNumber.toString().padStart(2, '0')}`
}
