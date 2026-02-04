/**
 * Routines Hooks
 *
 * TanStack Query hooks for routines feature.
 *
 * @example
 * ```tsx
 * // Fetch routine steps
 * const { data: steps } = useRoutineSteps()
 *
 * // Fetch templates
 * const { data: templates } = useRoutineTemplates()
 *
 * // Complete a routine
 * const { mutate: complete } = useCompleteRoutine()
 * complete({ template_id: '...', steps_completed: [...] })
 * ```
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CompleteRoutineInput,
  CreateJournalEntryInput,
  CreateRoutineStepInput,
  CreateRoutineTemplateInput,
  CustomRoutineStep,
  RoutineChallenge,
  RoutineCompletion,
  RoutineJournalEntry,
  RoutineStep,
  RoutineTemplate,
  UpdateJournalEntryInput,
  UpdateRoutineTemplateInput,
  UserChallengeProgress,
  UserRoutineStats,
  UserRoutineStreak,
} from '@/lib/types/routines'
import { queryKeys, type RoutineFilters, type RoutineJournalFilters } from './query-keys'

// ============================================
// API Functions
// ============================================

async function fetchRoutineSteps(category?: string) {
  const url = category ? `/api/routine-steps?category=${category}` : '/api/routine-steps'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch routine steps')
  return res.json() as Promise<{ steps: RoutineStep[]; customSteps: CustomRoutineStep[] }>
}

async function createCustomStep(data: CreateRoutineStepInput) {
  const res = await fetch('/api/routine-steps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create custom step')
  return res.json() as Promise<{ step: CustomRoutineStep }>
}

async function fetchRoutineTemplates(timeOfDay?: string) {
  const url = timeOfDay ? `/api/routine-templates?time_of_day=${timeOfDay}` : '/api/routine-templates'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch routine templates')
  return res.json() as Promise<{ templates: RoutineTemplate[] }>
}

async function fetchRoutineTemplate(id: string) {
  const res = await fetch(`/api/routine-templates/${id}`)
  if (!res.ok) throw new Error('Failed to fetch routine template')
  return res.json() as Promise<{ template: RoutineTemplate }>
}

async function createRoutineTemplate(data: CreateRoutineTemplateInput) {
  const res = await fetch('/api/routine-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create routine template')
  return res.json() as Promise<{ template: RoutineTemplate }>
}

async function updateRoutineTemplate(id: string, data: UpdateRoutineTemplateInput) {
  const res = await fetch(`/api/routine-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update routine template')
  return res.json() as Promise<{ template: RoutineTemplate }>
}

async function deleteRoutineTemplate(id: string) {
  const res = await fetch(`/api/routine-templates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete routine template')
  return res.json() as Promise<{ success: boolean }>
}

async function fetchRoutines(filters?: RoutineFilters) {
  const params = new URLSearchParams()
  if (filters?.limit) params.set('limit', String(filters.limit))
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)

  const url = `/api/routines${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch routines')
  return res.json() as Promise<{ completions: RoutineCompletion[] }>
}

async function completeRoutine(data: CompleteRoutineInput) {
  const res = await fetch('/api/routines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to complete routine')
  return res.json() as Promise<{ completion: RoutineCompletion }>
}

async function fetchRoutineStreak() {
  const res = await fetch('/api/routine-streaks')
  if (!res.ok) throw new Error('Failed to fetch routine streak')
  return res.json() as Promise<{ streak: UserRoutineStreak }>
}

async function fetchRoutineStats() {
  const res = await fetch('/api/routine-stats')
  if (!res.ok) throw new Error('Failed to fetch routine stats')
  return res.json() as Promise<{ stats: UserRoutineStats }>
}

async function fetchRoutineChallenges(type?: string) {
  const url = type ? `/api/routine-challenges?type=${type}` : '/api/routine-challenges'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch challenges')
  return res.json() as Promise<{
    challenges: Array<RoutineChallenge & { progress: UserChallengeProgress }>
  }>
}

async function claimChallengeReward(challengeId: string) {
  const res = await fetch(`/api/routine-challenges/${challengeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'claim' }),
  })
  if (!res.ok) throw new Error('Failed to claim reward')
  return res.json() as Promise<{ success: boolean; xp_earned: number }>
}

async function updateChallengeProgress(challengeId: string, incrementBy = 1) {
  const res = await fetch(`/api/routine-challenges/${challengeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_progress', increment_by: incrementBy }),
  })
  if (!res.ok) throw new Error('Failed to update progress')
  return res.json() as Promise<{ progress: UserChallengeProgress; justCompleted: boolean }>
}

async function fetchJournalEntries(filters?: RoutineJournalFilters) {
  const params = new URLSearchParams()
  if (filters?.limit) params.set('limit', String(filters.limit))
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)

  const url = `/api/routine-journal${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch journal entries')
  return res.json() as Promise<{ entries: RoutineJournalEntry[] }>
}

async function createJournalEntry(data: CreateJournalEntryInput) {
  const res = await fetch('/api/routine-journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create journal entry')
  return res.json() as Promise<{ entry: RoutineJournalEntry }>
}

async function updateJournalEntry(id: string, data: UpdateJournalEntryInput) {
  const res = await fetch(`/api/routine-journal/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update journal entry')
  return res.json() as Promise<{ entry: RoutineJournalEntry }>
}

async function deleteJournalEntry(id: string) {
  const res = await fetch(`/api/routine-journal/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete journal entry')
  return res.json() as Promise<{ success: boolean }>
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch routine steps (default + custom)
 */
export function useRoutineSteps(category?: string) {
  return useQuery({
    queryKey: queryKeys.routineSteps.list(category),
    queryFn: () => fetchRoutineSteps(category),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - steps don't change often
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Fetch routine templates
 */
export function useRoutineTemplates(timeOfDay?: string) {
  return useQuery({
    queryKey: queryKeys.routineTemplates.list(timeOfDay),
    queryFn: () => fetchRoutineTemplates(timeOfDay),
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Fetch a single routine template
 */
export function useRoutineTemplate(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.routineTemplates.detail(id),
    queryFn: () => fetchRoutineTemplate(id),
    staleTime: 12 * 60 * 60 * 1000,
    enabled: options?.enabled !== false && !!id,
  })
}

/**
 * Fetch completed routines history
 */
export function useRoutines(filters?: RoutineFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.routines.list(filters),
    queryFn: () => fetchRoutines(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled !== false,
  })
}

/**
 * Fetch user's routine streak
 */
export function useRoutineStreak() {
  return useQuery({
    queryKey: queryKeys.routineStreaks.current(),
    queryFn: fetchRoutineStreak,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Fetch user's XP and level stats
 */
export function useRoutineStats() {
  return useQuery({
    queryKey: queryKeys.routineStats.current(),
    queryFn: fetchRoutineStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Fetch active challenges with progress
 */
export function useRoutineChallenges(type?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.routineChallenges.list(type),
    queryFn: () => fetchRoutineChallenges(type),
    staleTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled !== false,
  })
}

/**
 * Fetch journal entries
 */
export function useRoutineJournal(filters?: RoutineJournalFilters) {
  return useQuery({
    queryKey: queryKeys.routineJournal.list(filters),
    queryFn: () => fetchJournalEntries(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  })
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a custom routine step
 */
export function useCreateCustomStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCustomStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineSteps.all })
      toast.success('Custom step created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create step')
    },
  })
}

/**
 * Create a routine template
 */
export function useCreateRoutineTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRoutineTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
      toast.success('Routine created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create routine')
    },
  })
}

/**
 * Hook with optimistic create for routine templates
 */
export function useCreateRoutineTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRoutineTemplate,
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineTemplates.all })

      const previousTemplates = queryClient.getQueryData<{ templates: RoutineTemplate[] }>(
        queryKeys.routineTemplates.lists()
      )

      const optimisticTemplate: RoutineTemplate = {
        id: `temp-${Date.now()}`,
        user_id: null,
        name: newTemplate.name,
        description: newTemplate.description || null,
        time_of_day: newTemplate.time_of_day,
        estimated_minutes: newTemplate.estimated_minutes || null,
        icon: newTemplate.icon || null,
        is_default: false,
        steps: newTemplate.steps || [],
        tags: newTemplate.tags || null,
        frequency: newTemplate.frequency || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueriesData({ queryKey: queryKeys.routineTemplates.lists() }, (old: { templates: RoutineTemplate[] } | undefined) => {
        if (!old) return { templates: [optimisticTemplate] }
        return { templates: [optimisticTemplate, ...old.templates] }
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.routineTemplates.lists(), context.previousTemplates)
      }
      toast.error(error.message || 'Failed to create routine')
    },
    onSuccess: () => {
      toast.success('Routine created')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
    },
  })
}

/**
 * Update a routine template
 */
export function useUpdateRoutineTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoutineTemplateInput }) =>
      updateRoutineTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.detail(variables.id) })
      toast.success('Routine updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update routine')
    },
  })
}

/**
 * Hook with optimistic update for routine templates
 */
export function useUpdateRoutineTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoutineTemplateInput }) =>
      updateRoutineTemplate(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineTemplates.all })

      const previousTemplates = queryClient.getQueryData<{ templates: RoutineTemplate[] }>(
        queryKeys.routineTemplates.lists()
      )

      queryClient.setQueriesData({ queryKey: queryKeys.routineTemplates.lists() }, (old: { templates: RoutineTemplate[] } | undefined) => {
        if (!old) return { templates: [] }
        return {
          templates: old.templates.map((template) =>
            template.id === id ? { ...template, ...data, updated_at: new Date().toISOString() } : template
          )
        }
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.routineTemplates.lists(), context.previousTemplates)
      }
      toast.error(error.message || 'Failed to update routine')
    },
    onSuccess: () => {
      toast.success('Routine updated')
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.detail(variables.id) })
    },
  })
}

/**
 * Delete a routine template
 */
export function useDeleteRoutineTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRoutineTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
      toast.success('Routine deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete routine')
    },
  })
}

/**
 * Hook with optimistic delete for routine templates
 */
export function useDeleteRoutineTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRoutineTemplate,
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineTemplates.all })

      const previousTemplates = queryClient.getQueryData<{ templates: RoutineTemplate[] }>(
        queryKeys.routineTemplates.lists()
      )

      queryClient.setQueriesData({ queryKey: queryKeys.routineTemplates.lists() }, (old: { templates: RoutineTemplate[] } | undefined) => {
        if (!old) return { templates: [] }
        return { templates: old.templates.filter((template) => template.id !== templateId) }
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.routineTemplates.lists(), context.previousTemplates)
      }
      toast.error(error.message || 'Failed to delete routine')
    },
    onSuccess: () => {
      toast.success('Routine deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
    },
  })
}

/**
 * Complete a routine (main action)
 */
export function useCompleteRoutine() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: completeRoutine,
    onSuccess: () => {
      // Invalidate only specific queries that need refreshing
      // Use lists() to match all routine queries regardless of filters (e.g., today's date filter)
      queryClient.invalidateQueries({ queryKey: queryKeys.routines.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStreaks.current() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStats.current() })
      // Challenges are updated less frequently - only invalidate current list
      queryClient.invalidateQueries({ queryKey: queryKeys.routineChallenges.list() })
      // Don't show toast here - let the UI handle celebration
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete routine')
    },
  })
}

/**
 * Hook with optimistic complete for routines
 */
export function useCompleteRoutineOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: completeRoutine,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routines.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.routineStreaks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.routineStats.all })

      const previousRoutines = queryClient.getQueryData<{ completions: RoutineCompletion[] }>(
        queryKeys.routines.lists()
      )
      const previousStreak = queryClient.getQueryData<{ streak: UserRoutineStreak }>(
        queryKeys.routineStreaks.current()
      )
      const previousStats = queryClient.getQueryData<{ stats: UserRoutineStats }>(
        queryKeys.routineStats.current()
      )

      // Optimistically add completion
      const today = new Date().toISOString().split('T')[0]!
      const optimisticCompletion: RoutineCompletion = {
        id: `temp-${Date.now()}`,
        user_id: '',
        template_id: data.template_id,
        routine_date: today,
        time_of_day: data.time_of_day || null,
        started_at: data.started_at,
        completed_at: data.completed_at,
        duration_minutes: data.duration_minutes || null,
        steps_completed: data.steps_completed,
        xp_earned: data.xp_earned,
        bonus_xp: data.bonus_xp || 0,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueriesData({ queryKey: queryKeys.routines.lists() }, (old: { completions: RoutineCompletion[] } | undefined) => {
        if (!old) return { completions: [optimisticCompletion] }
        return { completions: [optimisticCompletion, ...old.completions] }
      })

      // Optimistically update streak
      if (previousStreak?.streak) {
        queryClient.setQueryData(queryKeys.routineStreaks.current(), {
          streak: {
            ...previousStreak.streak,
            current_streak: previousStreak.streak.current_streak + 1,
          }
        })
      }

      // Optimistically update stats
      if (previousStats?.stats) {
        queryClient.setQueryData(queryKeys.routineStats.current(), {
          stats: {
            ...previousStats.stats,
            total_xp: previousStats.stats.total_xp + data.xp_earned,
            lifetime_routines: previousStats.stats.lifetime_routines + 1,
          }
        })
      }

      return { previousRoutines, previousStreak, previousStats }
    },
    onError: (error, _, context) => {
      if (context?.previousRoutines) {
        queryClient.setQueryData(queryKeys.routines.lists(), context.previousRoutines)
      }
      if (context?.previousStreak) {
        queryClient.setQueryData(queryKeys.routineStreaks.current(), context.previousStreak)
      }
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.routineStats.current(), context.previousStats)
      }
      toast.error(error.message || 'Failed to complete routine')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routines.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStreaks.current() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStats.current() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineChallenges.list() })
    },
  })
}

/**
 * Claim a challenge reward
 */
export function useClaimChallengeReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: claimChallengeReward,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineChallenges.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStats.all })
      toast.success(`+${data.xp_earned} XP claimed!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to claim reward')
    },
  })
}

/**
 * Update challenge progress
 */
export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ challengeId, incrementBy }: { challengeId: string; incrementBy?: number }) =>
      updateChallengeProgress(challengeId, incrementBy),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineChallenges.all })
      if (data.justCompleted) {
        toast.success('Challenge completed!')
      }
    },
    onError: (error: Error) => {
      console.error('Failed to update challenge progress:', error)
    },
  })
}

/**
 * Create a journal entry
 */
export function useCreateJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineJournal.all })
      toast.success('Journal entry saved')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save journal entry')
    },
  })
}

/**
 * Update a journal entry
 */
export function useUpdateJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalEntryInput }) =>
      updateJournalEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineJournal.all })
      toast.success('Journal entry updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update journal entry')
    },
  })
}

/**
 * Delete a journal entry
 */
export function useDeleteJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineJournal.all })
      toast.success('Journal entry deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete journal entry')
    },
  })
}
