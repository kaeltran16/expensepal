'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserWorkoutStreak, UserAchievement } from '@/lib/supabase'

// Re-export types for convenience
export type { UserWorkoutStreak as UserStreak, UserAchievement }

// Query keys
export const achievementKeys = {
  all: ['achievements'] as const,
  streak: ['user-streak'] as const,
  list: () => [...achievementKeys.all, 'list'] as const,
}

// Fetch user's workout streak
export function useWorkoutStreak() {
  return useQuery({
    queryKey: achievementKeys.streak,
    queryFn: async () => {
      const res = await fetch('/api/streaks')
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error('Failed to fetch streak')
      }
      const data = await res.json()
      return data.streak as UserWorkoutStreak | null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch user's achievements
export function useAchievements() {
  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/achievements')
      if (!res.ok) throw new Error('Failed to fetch achievements')
      const data = await res.json()
      return data.achievements as UserAchievement[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Update streak after workout
export function useUpdateStreak() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/streaks', {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to update streak')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: achievementKeys.streak })

      // Show streak notification if milestone
      if (data.streak?.current_streak && [3, 7, 14, 30].includes(data.streak.current_streak)) {
        toast.success(`${data.streak.current_streak} day streak! Keep it up!`, {
          icon: '🔥',
        })
      }
    },
  })
}

// Unlock an achievement
export function useUnlockAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (achievementType: string) => {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementType }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to unlock achievement')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: achievementKeys.list() })

      if (data.achievement) {
        toast.success(`Achievement Unlocked: ${data.achievement.name}!`, {
          icon: data.achievement.icon || '🏆',
        })
      }
    },
  })
}

// Check and unlock new achievements
export function useCheckAchievements() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/achievements/check', {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to check achievements')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: achievementKeys.list() })

      // Show notifications for newly unlocked achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        for (const achievement of data.newAchievements) {
          toast.success(`Achievement Unlocked: ${achievement.name}!`, {
            icon: achievement.icon || '🏆',
            duration: 5000,
          })
        }
      }
    },
  })
}
