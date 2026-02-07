'use client'

import { useState, useCallback } from 'react'
import { cn, hapticFeedback } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, History, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { XPProgressBar } from './XPProgressBar'
import { RoutineStreakBanner } from './RoutineStreakBanner'
import { RoutineTemplatesList } from './RoutineTemplatesList'
import { RoutineTemplateBuilder } from './RoutineTemplateBuilder'
import { RoutineLogger } from './RoutineLogger'
import { RoutineCompletionSummary } from './RoutineCompletionSummary'
import { ChallengesCard } from './ChallengesCard'
import { HabitCoachCard } from '@/components/habit-coach-card'
import { JournalEntrySheet } from './JournalEntrySheet'
import {
  useRoutineSteps,
  useRoutineTemplates,
  useRoutineStreak,
  useRoutineStats,
  useRoutineChallenges,
  useCreateRoutineTemplate,
  useUpdateRoutineTemplate,
  useDeleteRoutineTemplate,
  useCompleteRoutine,
  useClaimChallengeReward,
  useCreateJournalEntry,
} from '@/lib/hooks/use-routines'
import { calculateRoutineXP, checkLevelUp } from '@/lib/routine-gamification'
import { checkNewAchievements } from '@/lib/routine-achievements'
import type {
  RoutineTemplate,
  CompleteRoutineInput,
  CreateRoutineTemplateInput,
  XPBreakdown,
  Achievement,
} from '@/lib/types/routines'

export function RoutinesView() {
  // Local state - declare first so we can use for query enabling
  const [activeTab, setActiveTab] = useState('routines')

  // Queries - lazy load based on active tab
  const { data: stepsData, isLoading: stepsLoading } = useRoutineSteps()
  const { data: templatesData, isLoading: templatesLoading } = useRoutineTemplates()
  const { data: streakData } = useRoutineStreak()
  const { data: statsData } = useRoutineStats()
  // Only fetch challenges when on challenges tab
  const { data: challengesData, isLoading: challengesLoading } = useRoutineChallenges(undefined, {
    enabled: activeTab === 'challenges',
  })

  // Mutations
  const createTemplate = useCreateRoutineTemplate()
  const updateTemplate = useUpdateRoutineTemplate()
  const deleteTemplate = useDeleteRoutineTemplate()
  const completeRoutine = useCompleteRoutine()
  const claimReward = useClaimChallengeReward()
  const createJournalEntry = useCreateJournalEntry()

  // Local state
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<RoutineTemplate | null>(null)
  const [activeRoutine, setActiveRoutine] = useState<RoutineTemplate | null>(null)
  const [completionSummaryOpen, setCompletionSummaryOpen] = useState(false)
  const [journalSheetOpen, setJournalSheetOpen] = useState(false)

  // Completion state for summary
  const [lastCompletion, setLastCompletion] = useState<{
    routineName: string
    duration: number
    stepsCompleted: CompleteRoutineInput['steps_completed']
    totalSteps: number
    xpBreakdown: XPBreakdown
    previousXP: number
    newXP: number
    currentStreak: number
    newAchievements: Achievement[]
    completionId?: string
  } | null>(null)

  const templates = templatesData?.templates || []
  const steps = stepsData?.steps || []
  const customSteps = stepsData?.customSteps || []
  const streak = streakData?.streak || null
  const stats = statsData?.stats || null
  const challenges = challengesData?.challenges || []

  const handleStartRoutine = useCallback((template: RoutineTemplate) => {
    hapticFeedback('medium')
    setActiveRoutine(template)
  }, [])

  const handleCancelRoutine = useCallback(() => {
    setActiveRoutine(null)
  }, [])

  const handleCompleteRoutine = useCallback(async (data: CompleteRoutineInput) => {
    const previousXP = stats?.total_xp || 0
    const previousStats = stats
    const previousStreak = streak

    try {
      const result = await completeRoutine.mutateAsync(data)

      // Calculate XP and achievements
      const completedCount = data.steps_completed.filter(s => !s.skipped).length
      const totalSteps = activeRoutine?.steps?.length || 0
      const xpBreakdown = calculateRoutineXP({
        completedSteps: completedCount,
        totalSteps,
        currentStreak: (streak?.current_streak || 0) + 1,
      })

      const newTotalXP = previousXP + xpBreakdown.total

      // Check for new achievements
      const mockNewStats = {
        ...stats,
        total_xp: newTotalXP,
        lifetime_routines: (stats?.lifetime_routines || 0) + 1,
      }
      const mockNewStreak = {
        ...streak,
        current_streak: (streak?.current_streak || 0) + 1,
        total_completions: (streak?.total_completions || 0) + 1,
      }

      const newAchievements = checkNewAchievements(
        previousStats || null,
        previousStreak || null,
        mockNewStats as any,
        mockNewStreak as any
      )

      setLastCompletion({
        routineName: activeRoutine?.name || 'Routine',
        duration: data.duration_minutes,
        stepsCompleted: data.steps_completed,
        totalSteps,
        xpBreakdown,
        previousXP,
        newXP: newTotalXP,
        currentStreak: (streak?.current_streak || 0) + 1,
        newAchievements,
        completionId: result.completion.id,
      })

      setActiveRoutine(null)
      setCompletionSummaryOpen(true)
    } catch (error) {
      console.error('Failed to complete routine:', error)
    }
  }, [stats, streak, activeRoutine, completeRoutine])

  const handleCreateTemplate = useCallback(() => {
    setEditingTemplate(null)
    setBuilderOpen(true)
  }, [])

  const handleEditTemplate = useCallback((template: RoutineTemplate) => {
    setEditingTemplate(template)
    setBuilderOpen(true)
  }, [])

  const handleDeleteTemplate = useCallback((template: RoutineTemplate) => {
    if (confirm('Are you sure you want to delete this routine?')) {
      deleteTemplate.mutate(template.id)
    }
  }, [deleteTemplate])

  const handleSaveTemplate = useCallback((data: CreateRoutineTemplateInput) => {
    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, data },
        { onSuccess: () => setBuilderOpen(false) }
      )
    } else {
      createTemplate.mutate(data, { onSuccess: () => setBuilderOpen(false) })
    }
  }, [editingTemplate, createTemplate, updateTemplate])

  const handleClaimReward = useCallback((challengeId: string) => {
    hapticFeedback('medium')
    claimReward.mutate(challengeId)
  }, [claimReward])

  const handleAddJournalEntry = useCallback(() => {
    setCompletionSummaryOpen(false)
    setJournalSheetOpen(true)
  }, [])

  // If actively running a routine, show the logger
  if (activeRoutine) {
    // Wait for steps data to load
    if (stepsLoading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-teal-500" />
        </div>
      )
    }

    return (
      <RoutineLogger
        template={activeRoutine}
        availableSteps={steps}
        customSteps={customSteps}
        currentStreak={streak?.current_streak || 0}
        onComplete={handleCompleteRoutine}
        onCancel={handleCancelRoutine}
      />
    )
  }

  return (
    <div className="flex flex-col pb-32">
      {/* Header with stats */}
      <div className="space-y-4 p-4">
        {/* XP Progress */}
        <div className="ios-card p-4">
          <XPProgressBar totalXp={stats?.total_xp || 0} showDetails />
        </div>

        {/* Streak Banner */}
        <RoutineStreakBanner streak={streak} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="mx-4 grid w-auto grid-cols-3">
          <TabsTrigger value="routines" className="text-xs">
            Routines
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs">
            Challenges
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routines" className="mt-4 px-4 space-y-4">
          <RoutineTemplatesList
            templates={templates}
            onStartRoutine={handleStartRoutine}
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateTemplate={handleCreateTemplate}
            loading={templatesLoading || stepsLoading}
          />

          {/* AI Coach - below routines so it doesn't push main content down */}
          <HabitCoachCard />
        </TabsContent>

        <TabsContent value="challenges" className="mt-4 px-4">
          <ChallengesCard
            challenges={challenges}
            onClaimReward={handleClaimReward}
            loading={challengesLoading}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4 px-4">
          <div className="ios-card flex flex-col items-center justify-center p-8 text-center">
            <History className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Your completed routines will appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Builder Sheet */}
      <RoutineTemplateBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSave={handleSaveTemplate}
        template={editingTemplate}
        availableSteps={steps}
        customSteps={customSteps}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      {/* Completion Summary */}
      {lastCompletion && (
        <RoutineCompletionSummary
          open={completionSummaryOpen}
          onOpenChange={setCompletionSummaryOpen}
          routineName={lastCompletion.routineName}
          duration={lastCompletion.duration}
          stepsCompleted={lastCompletion.stepsCompleted}
          totalSteps={lastCompletion.totalSteps}
          xpBreakdown={lastCompletion.xpBreakdown}
          previousXP={lastCompletion.previousXP}
          newXP={lastCompletion.newXP}
          currentStreak={lastCompletion.currentStreak}
          newAchievements={lastCompletion.newAchievements}
          onAddJournalEntry={handleAddJournalEntry}
        />
      )}

      {/* Journal Entry Sheet */}
      <JournalEntrySheet
        open={journalSheetOpen}
        onOpenChange={setJournalSheetOpen}
        onSave={(entry) => {
          createJournalEntry.mutate({
            ...entry,
            routine_completion_id: lastCompletion?.completionId,
          })
          setJournalSheetOpen(false)
        }}
        routineCompletionId={lastCompletion?.completionId}
        isLoading={createJournalEntry.isPending}
      />
    </div>
  )
}
