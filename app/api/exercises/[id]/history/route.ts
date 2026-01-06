import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import type { User } from '@supabase/supabase-js'

// Helper function to wrap route handlers with params
function withAuthParams<TParams>(
  handler: (request: NextRequest, user: User, params: TParams) => Promise<Response>
) {
  return (request: NextRequest, context: { params: TParams }) => {
    return withAuth((req, user) => handler(req, user, context.params))(request)
  }
}

interface ExerciseSet {
  reps?: number
  weight?: number
  rpe?: number
}

// GET /api/exercises/[id]/history - get exercise history for progress tracking
export const GET = withAuthParams<{ id: string }>(async (request, user, params) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  // get workout exercises for this exercise, ordered by workout date
  // RLS on workouts table automatically filters by user_id
  const { data: history, error } = await supabase
    .from('workout_exercises')
    .select(`
      *,
      workouts!inner (
        id,
        workout_date,
        completed_at,
        status
      )
    `)
    .eq('exercise_id', params.id)
    .eq('workouts.status', 'completed')
    .order('workouts(workout_date)', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('error fetching exercise history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // calculate metrics for each workout
  const historyWithMetrics = history.map((entry) => {
    const sets = entry.sets as ExerciseSet[] | null

    if (!sets || sets.length === 0) {
      return {
        ...entry,
        maxWeight: 0,
        totalVolume: 0,
        totalSets: 0,
        totalReps: 0,
        avgRpe: null,
        estimated1RM: 0,
      }
    }

    const maxWeight = Math.max(...sets.map(s => s.weight || 0))
    const totalVolume = sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0)
    const totalSets = sets.length
    const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0)

    // calculate avg RPE if available
    const rpeSets = sets.filter(s => s.rpe != null)
    const avgRpe = rpeSets.length > 0
      ? rpeSets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / rpeSets.length
      : null

    // calculate estimated 1RM using epley formula on best set
    let estimated1RM = 0
    const bestSet = sets.reduce((best, current) => {
      const bestScore = (best?.weight || 0) * (1 + (best?.reps || 0) / 30)
      const currentScore = (current.weight || 0) * (1 + (current.reps || 0) / 30)
      return currentScore > bestScore ? current : best
    }, sets[0])

    if (bestSet && bestSet.weight && bestSet.reps) {
      if (bestSet.reps === 1) {
        estimated1RM = bestSet.weight
      } else if (bestSet.reps <= 12) {
        estimated1RM = bestSet.weight * (1 + bestSet.reps / 30)
      }
    }

    return {
      ...entry,
      maxWeight,
      totalVolume,
      totalSets,
      totalReps,
      avgRpe,
      estimated1RM: Math.round(estimated1RM * 10) / 10,
    }
  })

  return NextResponse.json({ history: historyWithMetrics })
})
