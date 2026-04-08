'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/hooks/query-keys'
import type {
  CardioPlan,
  CardioExerciseType,
  CardioPlanInput,
  CardioSession,
  CardioSessionInput,
  FitnessLevel,
} from '@/lib/types/cardio'

const cardioKeys = queryKeys.cardio

export function useCardioPlans(status?: string) {
  return useQuery({
    queryKey: [...cardioKeys.plans, { status }],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ''
      const res = await fetch(`/api/cardio-plans${params}`)
      if (!res.ok) throw new Error('failed to fetch cardio plans')
      const data = await res.json()
      return data.plans as CardioPlan[]
    },
    staleTime: 12 * 60 * 60 * 1000,
  })
}

export function useActiveCardioPlan() {
  const { data: plans, ...rest } = useCardioPlans('active')
  return { data: plans?.[0] ?? null, ...rest }
}

export function useGenerateCardioPlan() {
  return useMutation({
    mutationFn: async (input: CardioPlanInput) => {
      const res = await fetch('/api/ai/generate-cardio-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to generate plan')
      }
      return res.json() as Promise<{
        name: string
        total_weeks: number
        sessions_per_week: number
        plan_data: CardioPlan['plan_data']
      }>
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to generate plan')
    },
  })
}

export function useCreateCardioPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planData: {
      exercise_type: CardioExerciseType
      name: string
      goal: string
      fitness_level: FitnessLevel
      total_weeks: number
      sessions_per_week: number
      plan_data: CardioPlan['plan_data']
    }) => {
      const res = await fetch('/api/cardio-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to save plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.plans })
      toast.success('plan started!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to save plan')
    },
  })
}

export function useUpdateCardioPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: string
      status?: string
      current_week?: number
      current_session?: number
    }) => {
      const { id, ...updates } = params
      const res = await fetch(`/api/cardio-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to update plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.plans })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to update plan')
    },
  })
}

export function useCardioSessions(filters: { startDate?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: cardioKeys.sessionList(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.limit) params.append('limit', filters.limit.toString())

      const res = await fetch(`/api/cardio-sessions?${params}`)
      if (!res.ok) throw new Error('failed to fetch cardio sessions')
      const data = await res.json()
      return data.sessions as CardioSession[]
    },
    staleTime: 12 * 60 * 60 * 1000,
  })
}

export function useCreateCardioSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionData: CardioSessionInput) => {
      const res = await fetch('/api/cardio-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'failed to save session')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardioKeys.sessions })
      queryClient.invalidateQueries({ queryKey: cardioKeys.plans })
      toast.success('session saved!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'failed to save session')
    },
  })
}
