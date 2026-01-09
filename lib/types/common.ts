/**
 * Common type definitions used across the application
 */

import type { Database } from '@/lib/supabase/database.types'
import type { LucideIcon } from 'lucide-react'

// Icon type for Lucide React icons
export type IconType = LucideIcon

// React component types
export type ReactNode = React.ReactNode
export type ReactElement = React.ReactElement

// Database types
export type Expense = Database['public']['Tables']['expenses']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type Meal = Database['public']['Tables']['meals']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row']

// Template exercise type (used in workout templates)
export interface TemplateExercise {
  id?: string
  exercise_id: string
  name?: string
  category?: string
  sets: number
  reps: string | number
  rest: number
  notes?: string
  order?: number
}

// Exercise log type (used when logging workouts)
export interface ExerciseLog {
  exercise_id: string
  exercise_name: string // renamed from 'name' for clarity
  sets: ExerciseSet[]
  target_sets?: number // optional: for workout logger UI
  target_reps?: string // optional: for workout logger UI (e.g., "8-12")
  target_rest?: number // optional: for workout logger UI (in seconds)
  notes?: string
}

// Exercise set type
export interface ExerciseSet {
  set_number?: number // optional: for set tracking
  reps: number
  weight?: number
  completed?: boolean
  rest?: number // in seconds (preferred)
  rest_seconds?: number // @deprecated Use 'rest' instead
}

// @deprecated Use ExerciseSet instead to avoid confusion with built-in Set type
export type Set = ExerciseSet

// Workout data for completion
export interface WorkoutData {
  template_id?: string | null
  template_name?: string
  date?: string
  duration_minutes?: number
  total_volume?: number
  notes?: string
  // Support both naming conventions for compatibility
  exercises_completed?: ExerciseLog[]
  exerciseLogs?: ExerciseLog[]
  personal_records?: Array<{ type: string; value: number; unit: string }>
}

// Chart tooltip props (for Recharts)
export interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color?: string
    payload?: Record<string, unknown>
  }>
  label?: string
}

// Generic async handler type
export type AsyncHandler<T = void> = (...args: unknown[]) => Promise<T>

// Generic event handler type
export type EventHandler<T = unknown> = (event: T) => void

// Filter types
export interface DateFilter {
  startDate?: string
  endDate?: string
}

export interface CategoryFilter {
  category?: string
  categories?: string[]
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// Sort types
export type SortDirection = 'asc' | 'desc'

export interface SortParams {
  field: string
  direction: SortDirection
}

// Meal time type
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

// Difficulty level type
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

// Insight type (for analytics)
export interface Insight {
  id: string
  type: 'trend' | 'pattern' | 'alert' | 'tip'
  severity: 'info' | 'warning' | 'success'
  title: string
  message: string
  icon: IconType
  data?: Record<string, unknown>
}

// Personal record type
export interface PersonalRecord {
  exercise_id: string
  exercise_name: string
  type: 'weight' | 'reps' | 'volume'
  value: number
  previous_value: number
  achieved_at: string
}
