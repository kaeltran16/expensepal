export type CardioExerciseType = 'treadmill' | 'cycling' | 'rowing'

export type CardioPlanStatus = 'active' | 'paused' | 'completed'

export type SegmentType = 'warm_up' | 'main' | 'cool_down' | 'interval'

export const SEGMENT_LABELS: Record<SegmentType, string> = {
  warm_up: 'Warm-up',
  main: 'Main',
  cool_down: 'Cool-down',
  interval: 'Interval',
}

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'

export interface CardioSegmentData {
  type: SegmentType
  duration_seconds: number
  speed: number
  settings: Record<string, number>
}

export interface CardioSessionData {
  session_number: number
  segments: CardioSegmentData[]
}

export interface CardioWeekData {
  week_number: number
  sessions: CardioSessionData[]
}

export interface CardioPlanData {
  weeks: CardioWeekData[]
  summary?: string
}

export interface CardioPlan {
  id: string
  user_id: string
  exercise_type: CardioExerciseType
  name: string
  goal: string
  fitness_level: FitnessLevel
  total_weeks: number
  sessions_per_week: number
  plan_data: CardioPlanData
  status: CardioPlanStatus
  current_week: number
  current_session: number
  created_at: string
}

export interface CardioSession {
  id: string
  user_id: string
  plan_id: string | null
  exercise_type: CardioExerciseType
  session_date: string
  started_at: string
  completed_at: string
  duration_minutes: number
  total_distance: number | null
  avg_speed: number | null
  plan_week: number | null
  plan_session: number | null
  notes: string | null
}

export interface CardioSegment {
  id: string
  session_id: string
  segment_order: number
  segment_type: SegmentType
  duration_seconds: number
  distance: number | null
  speed: number | null
  settings: Record<string, number>
  is_planned: boolean
  completed: boolean
}

export interface CardioPlanInput {
  goal: string
  fitness_level: FitnessLevel
  sessions_per_week: number
  exercise_type: CardioExerciseType
}

export interface CardioSegmentInput {
  segment_order: number
  segment_type: SegmentType
  duration_seconds: number
  distance?: number
  speed?: number
  settings?: Record<string, number>
  is_planned: boolean
  completed: boolean
}

export interface CardioSessionInput {
  plan_id?: string
  exercise_type: CardioExerciseType
  started_at: string
  completed_at: string
  duration_minutes: number
  total_distance?: number
  avg_speed?: number
  plan_week?: number
  plan_session?: number
  notes?: string
  segments: CardioSegmentInput[]
}

export function formatPace(speedKmh: number): string {
  if (speedKmh <= 0) return '--'
  const minutesPerKm = 60 / speedKmh
  const mins = Math.floor(minutesPerKm)
  const secs = Math.round((minutesPerKm - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDistance(km: number): string {
  return km.toFixed(1)
}

export function computeCardioWeeklyStats(
  sessions: Array<{ duration_minutes: number; total_distance: number | null; avg_speed: number | null }>
) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalDistance = sessions.reduce((sum, s) => sum + (s.total_distance || 0), 0)
  const avgSpeed = totalDistance > 0 && totalMinutes > 0
    ? (totalDistance / totalMinutes) * 60
    : 0

  return { totalMinutes, totalDistance, avgSpeed }
}
