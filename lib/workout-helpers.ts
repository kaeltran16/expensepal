/**
 * workout helper functions
 * progressive overload, PR detection, and workout metrics
 */

export interface ProgressiveOverloadSuggestion {
  type: 'increase_weight' | 'increase_reps' | 'increase_sets' | 'decrease_weight' | 'maintain' | 'deload'
  suggestion: string
  recommendedWeight?: number
  recommendedReps?: number
  recommendedSets?: number
  reason: string
}

interface WorkoutSet {
  set_number?: number
  reps?: number
  weight?: number
  rpe?: number
  completed?: boolean
}

// Renamed to avoid conflict with database ExerciseHistory type
// This interface represents the structure needed for workout analysis functions
// The API may return additional fields which are ignored by these functions
export interface ExerciseHistoryData {
  sets: WorkoutSet[]
  workouts: {
    workout_date: string
    completed_at: string
    [key: string]: any // Allow additional fields from API
  }
  [key: string]: any // Allow additional top-level fields from API
}

/**
 * analyze exercise history and provide progressive overload suggestion
 */
export function getProgressiveOverloadSuggestion(
  history: ExerciseHistoryData[],
  targetRepsMin: number = 8,
  targetRepsMax: number = 12
): ProgressiveOverloadSuggestion {
  if (!history || history.length === 0) {
    return {
      type: 'maintain',
      suggestion: 'start with a comfortable weight',
      reason: 'no previous data',
    }
  }

  const recentWorkouts = history.slice(0, 3)
  const lastWorkout = recentWorkouts[0]

  if (!lastWorkout || !lastWorkout.sets || lastWorkout.sets.length === 0) {
    return {
      type: 'maintain',
      suggestion: 'continue with previous weight',
      reason: 'incomplete data',
    }
  }

  // get last working set (exclude warmups if marked)
  const workingSets = lastWorkout.sets.filter(s => !s.completed || s.rpe || (s.reps ?? 0) > 0)
  if (workingSets.length === 0) {
    return {
      type: 'maintain',
      suggestion: 'continue with previous weight',
      reason: 'no working sets found',
    }
  }

  const lastWeight = Math.max(...workingSets.map(s => s.weight || 0))
  const avgReps = workingSets.reduce((sum, s) => sum + (s.reps || 0), 0) / workingSets.length
  const maxReps = Math.max(...workingSets.map(s => s.reps || 0))

  // check rpe if available
  const setsWithRpe = workingSets.filter(s => s.rpe != null)
  const avgRpe = setsWithRpe.length > 0
    ? setsWithRpe.reduce((sum, s) => sum + (s.rpe || 0), 0) / setsWithRpe.length
    : null

  // check consistency across recent workouts
  const hitTargetRepsConsistently = recentWorkouts.every(workout => {
    const sets = workout.sets.filter(s => !s.completed || s.rpe || (s.reps ?? 0) > 0)
    return sets.length > 0 && sets.every(s => (s.reps || 0) >= targetRepsMin)
  })

  const strugglingRecently = recentWorkouts.some(workout => {
    const sets = workout.sets.filter(s => !s.completed || s.rpe || (s.reps ?? 0) > 0)
    return sets.length > 0 && sets.some(s => (s.reps || 0) < targetRepsMin - 2)
  })

  // progressive overload logic

  // 1. consistently hitting top of rep range → increase weight
  if (hitTargetRepsConsistently && avgReps >= targetRepsMax) {
    const increment = lastWeight >= 100 ? 5 : 2.5
    return {
      type: 'increase_weight',
      suggestion: `you've been hitting ${Math.round(avgReps)} reps consistently. time to add weight!`,
      recommendedWeight: lastWeight + increment,
      reason: `hitting ${targetRepsMax}+ reps for ${recentWorkouts.length} workouts`,
    }
  }

  // 2. rpe consistently low → increase weight
  if (avgRpe !== null && avgRpe < 7 && avgReps >= targetRepsMin) {
    const increment = lastWeight >= 100 ? 5 : 2.5
    return {
      type: 'increase_weight',
      suggestion: `rpe of ${avgRpe.toFixed(1)} is low. you can handle more weight`,
      recommendedWeight: lastWeight + increment,
      reason: 'low rpe indicates room for progression',
    }
  }

  // 3. struggling with current weight → reduce slightly
  if (strugglingRecently || (avgRpe !== null && avgRpe > 9)) {
    const reduction = lastWeight * 0.1
    return {
      type: 'decrease_weight',
      suggestion: 'reduce weight slightly to focus on form and recovery',
      recommendedWeight: lastWeight - reduction,
      reason: 'struggling with current weight or high rpe',
    }
  }

  // 4. hitting target range but not maxed out → increase reps
  if (avgReps >= targetRepsMin && avgReps < targetRepsMax) {
    return {
      type: 'increase_reps',
      suggestion: `aim for ${targetRepsMax} reps before adding weight`,
      recommendedReps: Math.min(targetRepsMax, Math.ceil(avgReps) + 1),
      reason: 'progress reps within target range first',
    }
  }

  // 5. check for plateau (same weight/reps for 4+ workouts)
  if (history.length >= 4) {
    const last4Workouts = history.slice(0, 4)
    const weights = last4Workouts.map(w => {
      const sets = w.sets.filter(s => !s.completed || s.rpe || (s.reps ?? 0) > 0)
      return Math.max(...sets.map(s => s.weight || 0))
    })
    const allSameWeight = weights.every(w => w === weights[0])

    if (allSameWeight) {
      return {
        type: 'deload',
        suggestion: 'plateau detected. consider a deload week or changing rep ranges',
        recommendedWeight: lastWeight * 0.85,
        reason: 'same weight for 4+ workouts indicates plateau',
      }
    }
  }

  // default: maintain current approach
  return {
    type: 'maintain',
    suggestion: 'keep current weight and aim for consistent reps',
    recommendedWeight: lastWeight,
    reason: 'progressing steadily',
  }
}

/**
 * check if a new personal record was achieved
 */
export function detectPersonalRecords(
  currentSets: WorkoutSet[],
  previousBest: {
    max_weight?: number
    max_reps?: number
    max_volume?: number
    estimated_1rm?: number
  }
): Array<{
  type: '1rm' | 'max_weight' | 'max_reps' | 'max_volume'
  value: number
  unit: string
}> {
  const records: Array<{
    type: '1rm' | 'max_weight' | 'max_reps' | 'max_volume'
    value: number
    unit: string
  }> = []

  if (!currentSets || currentSets.length === 0) return records

  // calculate current metrics
  const maxWeight = Math.max(...currentSets.map(s => s.weight || 0))
  const maxReps = Math.max(...currentSets.map(s => s.reps || 0))
  const totalVolume = currentSets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0)

  // calculate estimated 1RM using epley formula
  const bestSet = currentSets.reduce((best, current) => {
    const bestScore = (best.weight || 0) * (1 + (best.reps || 0) / 30)
    const currentScore = (current.weight || 0) * (1 + (current.reps || 0) / 30)
    return currentScore > bestScore ? current : best
  }, currentSets[0]!)

  let estimated1RM = 0
  if (bestSet && bestSet.weight && bestSet.reps) {
    if (bestSet.reps === 1) {
      estimated1RM = bestSet.weight
    } else if (bestSet.reps <= 12) {
      estimated1RM = bestSet.weight * (1 + bestSet.reps / 30)
    }
  }

  // check for PRs
  if (maxWeight > (previousBest.max_weight || 0)) {
    records.push({
      type: 'max_weight',
      value: maxWeight,
      unit: 'kg',
    })
  }

  if (maxReps > (previousBest.max_reps || 0)) {
    records.push({
      type: 'max_reps',
      value: maxReps,
      unit: 'reps',
    })
  }

  if (totalVolume > (previousBest.max_volume || 0)) {
    records.push({
      type: 'max_volume',
      value: totalVolume,
      unit: 'kg',
    })
  }

  if (estimated1RM > (previousBest.estimated_1rm || 0)) {
    records.push({
      type: '1rm',
      value: Math.round(estimated1RM * 10) / 10,
      unit: 'kg',
    })
  }

  return records
}

/**
 * calculate workout volume (sets * reps * weight)
 */
export function calculateWorkoutVolume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, set) => {
    return sum + (set.reps || 0) * (set.weight || 0)
  }, 0)
}

/**
 * format workout duration
 */
export function formatWorkoutDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
