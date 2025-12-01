import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/exercises/[id]/history - get exercise history for progress tracking
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // get workout exercises for this exercise, ordered by workout date
    const { data: history, error } = await supabaseAdmin
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
      .eq('workouts.user_id', user.id)
      .eq('workouts.status', 'completed')
      .order('workouts(workout_date)', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('error fetching exercise history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // calculate metrics for each workout
    const historyWithMetrics = history.map((entry: any) => {
      const sets = entry.sets as any[]

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
        ? rpeSets.reduce((sum, s) => sum + s.rpe, 0) / rpeSets.length
        : null

      // calculate estimated 1RM using epley formula on best set
      let estimated1RM = 0
      const bestSet = sets.reduce((best, current) => {
        const bestScore = (best.weight || 0) * (1 + (best.reps || 0) / 30)
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
  } catch (error) {
    console.error('error in GET /api/exercises/[id]/history:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
