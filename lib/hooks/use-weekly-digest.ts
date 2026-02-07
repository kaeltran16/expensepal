'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface DigestSection {
  domain: string
  emoji: string
  title: string
  summary: string
  highlight: string | null
}

interface WeeklyDigestResponse {
  headline: string
  sections: DigestSection[]
  tip_of_the_week: string
  raw: {
    spending: { this_week_total: number; change_percent: number | null }
    nutrition: { avg_daily_calories: number; calorie_goal: number | null }
    routines: { current_streak: number; days_active: number }
    fitness: { workouts_completed: number }
  }
}

export function useWeeklyDigest(options?: { enabled?: boolean }) {
  return useQuery<WeeklyDigestResponse>({
    queryKey: queryKeys.ai.weeklyDigest(),
    queryFn: async () => {
      const res = await fetch('/api/ai/weekly-digest')
      if (!res.ok) throw new Error('Failed to fetch digest')
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    enabled: options?.enabled ?? true,
  })
}
