'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface CoachSuggestion {
  type: 'pattern' | 'risk' | 'win' | 'tip'
  title: string
  description: string
  action: string
}

interface HabitCoachResponse {
  suggestions: CoachSuggestion[]
  encouragement: string
  streak_status: 'strong' | 'at_risk' | 'building' | 'fresh_start'
}

export function useHabitCoach(options?: { enabled?: boolean }) {
  return useQuery<HabitCoachResponse>({
    queryKey: queryKeys.ai.habitCoach(),
    queryFn: async () => {
      const res = await fetch('/api/ai/habit-coach')
      if (!res.ok) throw new Error('Failed to fetch coaching')
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    enabled: options?.enabled ?? true,
  })
}
