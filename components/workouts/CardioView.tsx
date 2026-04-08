'use client'

import { useState, useMemo } from 'react'
import { startOfWeek, isThisWeek } from 'date-fns'
import {
  useActiveCardioPlan,
  useCardioSessions,
  useGenerateCardioPlan,
  useCreateCardioPlan,
  useCreateCardioSession,
} from '@/lib/hooks/use-cardio'
import { computeCardioWeeklyStats } from '@/lib/types/cardio'
import type { CardioPlanData, CardioPlanInput, CardioSegmentInput } from '@/lib/types/cardio'
import { CardioPlanHero } from './CardioPlanHero'
import { CardioSessionPreview } from './CardioSessionPreview'
import { CardioQuickStats } from './CardioQuickStats'
import { CardioRecentSessions } from './CardioRecentSessions'
import { CardioPlanDialog } from './CardioPlanDialog'
import { CardioPlanPreview } from './CardioPlanPreview'
import { CardioSessionLogger } from './CardioSessionLogger'
import { CardioSessionSummary } from './CardioSessionSummary'

export function CardioView() {
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showPlanPreview, setShowPlanPreview] = useState(false)
  const [showSessionLogger, setShowSessionLogger] = useState(false)
  const [sessionResult, setSessionResult] = useState<{
    segments: CardioSegmentInput[]
    totalDuration: number
    totalDistance: number
  } | null>(null)

  const [generatedPlan, setGeneratedPlan] = useState<{
    name: string
    totalWeeks: number
    sessionsPerWeek: number
    planData: CardioPlanData
    input: CardioPlanInput
  } | null>(null)

  const { data: activePlan, isLoading: planLoading } = useActiveCardioPlan()
  const weekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0],
    []
  )
  const { data: sessions = [], isLoading: sessionsLoading } = useCardioSessions({ startDate: weekStart })

  const generatePlan = useGenerateCardioPlan()
  const createPlan = useCreateCardioPlan()
  const createSession = useCreateCardioSession()

  const weekSessions = useMemo(
    () => sessions.filter(s => isThisWeek(new Date(s.session_date), { weekStartsOn: 1 })),
    [sessions]
  )

  const weeklyStats = useMemo(
    () => computeCardioWeeklyStats(weekSessions),
    [weekSessions]
  )

  const todaySegments = useMemo(() => {
    if (!activePlan || activePlan.status === 'completed') return []
    const week = activePlan.plan_data.weeks.find(w => w.week_number === activePlan.current_week)
    const session = week?.sessions.find(s => s.session_number === activePlan.current_session)
    return session?.segments || []
  }, [activePlan])

  const handleGenerate = async (input: CardioPlanInput) => {
    const result = await generatePlan.mutateAsync(input)
    setGeneratedPlan({
      name: result.name,
      totalWeeks: result.total_weeks,
      sessionsPerWeek: result.sessions_per_week,
      planData: result.plan_data,
      input,
    })
    setShowPlanDialog(false)
    setShowPlanPreview(true)
  }

  const handleConfirmPlan = async () => {
    if (!generatedPlan) return
    await createPlan.mutateAsync({
      exercise_type: generatedPlan.input.exercise_type,
      name: generatedPlan.name,
      goal: generatedPlan.input.goal,
      fitness_level: generatedPlan.input.fitness_level,
      total_weeks: generatedPlan.totalWeeks,
      sessions_per_week: generatedPlan.sessionsPerWeek,
      plan_data: generatedPlan.planData,
    })
    setShowPlanPreview(false)
    setGeneratedPlan(null)
  }

  const handleSessionComplete = async (
    segments: CardioSegmentInput[],
    totalDuration: number,
    totalDistance: number,
    startedAt: string,
  ) => {
    const completedAt = new Date().toISOString()
    const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : undefined

    await createSession.mutateAsync({
      plan_id: activePlan?.id,
      exercise_type: 'treadmill',
      started_at: startedAt,
      completed_at: completedAt,
      duration_minutes: totalDuration / 60,
      total_distance: totalDistance || undefined,
      avg_speed: avgSpeed,
      plan_week: activePlan?.current_week,
      plan_session: activePlan?.current_session,
      segments,
    })

    setShowSessionLogger(false)
    setSessionResult({ segments, totalDuration, totalDistance })
  }

  if (planLoading || sessionsLoading) {
    return (
      <div className="space-y-3">
        <div className="ios-card h-32 animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 ios-card h-16 animate-pulse" />)}
        </div>
        <div className="ios-card h-24 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <CardioPlanHero
        plan={activePlan}
        onStartSession={() => setShowSessionLogger(true)}
        onGeneratePlan={() => setShowPlanDialog(true)}
      />

      {todaySegments.length > 0 && (
        <CardioSessionPreview segments={todaySegments} />
      )}

      <CardioQuickStats
        totalDistance={weeklyStats.totalDistance}
        avgSpeed={weeklyStats.avgSpeed}
        totalMinutes={weeklyStats.totalMinutes}
      />

      <CardioRecentSessions sessions={sessions} />

      <CardioPlanDialog
        isOpen={showPlanDialog}
        onClose={() => setShowPlanDialog(false)}
        onGenerate={handleGenerate}
        isGenerating={generatePlan.isPending}
      />

      {generatedPlan && (
        <CardioPlanPreview
          isOpen={showPlanPreview}
          name={generatedPlan.name}
          totalWeeks={generatedPlan.totalWeeks}
          sessionsPerWeek={generatedPlan.sessionsPerWeek}
          planData={generatedPlan.planData}
          onConfirm={handleConfirmPlan}
          onRegenerate={() => {
            setShowPlanPreview(false)
            setShowPlanDialog(true)
          }}
          onClose={() => {
            setShowPlanPreview(false)
            setGeneratedPlan(null)
          }}
          isSaving={createPlan.isPending}
        />
      )}

      {showSessionLogger && todaySegments.length > 0 && (
        <CardioSessionLogger
          segments={todaySegments}
          onComplete={handleSessionComplete}
          onCancel={() => setShowSessionLogger(false)}
        />
      )}

      {sessionResult && (
        <CardioSessionSummary
          totalDuration={sessionResult.totalDuration}
          totalDistance={sessionResult.totalDistance}
          segments={sessionResult.segments}
          planWeek={activePlan?.current_week}
          planSession={activePlan?.current_session}
          sessionsPerWeek={activePlan?.sessions_per_week}
          onClose={() => setSessionResult(null)}
        />
      )}
    </div>
  )
}
