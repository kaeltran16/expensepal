'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface FeedAnnotations {
  spending: string
  calories: string
  routine: string
}

export function useFeedAnnotations(options?: { enabled?: boolean }) {
  return useQuery<FeedAnnotations>({
    queryKey: queryKeys.ai.feedAnnotations(),
    queryFn: async () => {
      const res = await fetch('/api/ai/feed-annotations')
      if (!res.ok) throw new Error('Failed to fetch feed annotations')
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
    enabled: options?.enabled ?? true,
  })
}
