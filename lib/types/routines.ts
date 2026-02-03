/**
 * Routine-related type definitions
 */

// Time of day options for routines
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

// Step categories
export type StepCategory = 'skincare' | 'hygiene' | 'morning' | 'evening' | 'fitness' | 'mindfulness'

// Mood options for journal
export type RoutineMood = 'great' | 'good' | 'okay' | 'tired' | 'stressed'

// Challenge types
export type ChallengeType = 'weekly' | 'monthly' | 'special'

// Requirement types for challenges
export type RequirementType = 'completion_count' | 'streak_days' | 'total_minutes'

// Base routine step (from library)
export interface RoutineStep {
  id: string
  name: string
  description?: string | null
  tips?: string | null
  image_url?: string | null
  gif_url?: string | null
  category: StepCategory
  duration_seconds: number
  is_default: boolean
  created_at: string
}

// Custom routine step (user-created)
export interface CustomRoutineStep {
  id: string
  user_id: string
  name: string
  description?: string | null
  tips?: string | null
  image_url?: string | null
  gif_url?: string | null
  category?: string | null
  duration_seconds: number
  created_at: string
}

// Step reference in a template
export interface TemplateStepRef {
  step_id: string
  order: number
  notes?: string
  custom_duration?: number
  is_custom?: boolean // true if from custom_routine_steps table
}

// Routine template
export interface RoutineTemplate {
  id: string
  user_id?: string | null
  name: string
  description?: string | null
  icon?: string | null
  time_of_day?: TimeOfDay | null
  estimated_minutes?: number | null
  steps: TemplateStepRef[]
  is_default: boolean
  tags?: string[] | null
  created_at: string
  updated_at: string
}

// Completed step during a routine
export interface CompletedStep {
  step_id: string
  step_name: string
  completed_at: string
  skipped?: boolean
}

// Routine completion record
export interface RoutineCompletion {
  id: string
  user_id: string
  template_id?: string | null
  routine_date: string
  time_of_day?: string | null
  started_at?: string | null
  completed_at?: string | null
  duration_minutes?: number | null
  steps_completed?: CompletedStep[] | null
  xp_earned: number
  bonus_xp: number
  created_at: string
}

// User streak data
export interface UserRoutineStreak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_routine_date?: string | null
  total_completions: number
  created_at: string
  updated_at: string
}

// User stats (XP, levels)
export interface UserRoutineStats {
  id: string
  user_id: string
  total_xp: number
  current_level: number
  lifetime_routines: number
  perfect_weeks: number
  created_at: string
  updated_at: string
}

// Journal entry
export interface RoutineJournalEntry {
  id: string
  user_id: string
  routine_completion_id?: string | null
  entry_date: string
  mood?: RoutineMood | null
  energy_level?: number | null
  notes?: string | null
  tags?: string[] | null
  created_at: string
}

// Challenge definition
export interface RoutineChallenge {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  challenge_type?: ChallengeType | null
  requirement_type: RequirementType
  requirement_value: number
  requirement_metadata?: Record<string, unknown> | null
  xp_reward: number
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  created_at: string
}

// User's progress on a challenge
export interface UserChallengeProgress {
  id: string
  user_id: string
  challenge_id: string
  current_progress: number
  is_completed: boolean
  completed_at?: string | null
  xp_claimed: boolean
  created_at: string
  // Joined data
  challenge?: RoutineChallenge
}

// Input types for creating/updating

export interface CreateRoutineStepInput {
  name: string
  description?: string
  tips?: string
  image_url?: string
  gif_url?: string
  category?: string
  duration_seconds?: number
}

export interface CreateRoutineTemplateInput {
  name: string
  description?: string
  icon?: string
  time_of_day?: TimeOfDay
  estimated_minutes?: number
  steps: TemplateStepRef[]
  tags?: string[]
}

export interface UpdateRoutineTemplateInput {
  name?: string
  description?: string
  icon?: string
  time_of_day?: TimeOfDay
  estimated_minutes?: number
  steps?: TemplateStepRef[]
  tags?: string[]
}

export interface CompleteRoutineInput {
  template_id?: string
  time_of_day?: TimeOfDay
  started_at: string
  completed_at: string
  duration_minutes: number
  steps_completed: CompletedStep[]
  xp_earned: number
  bonus_xp?: number
}

export interface CreateJournalEntryInput {
  routine_completion_id?: string
  entry_date?: string
  mood?: RoutineMood
  energy_level?: number
  notes?: string
  tags?: string[]
}

export interface UpdateJournalEntryInput {
  mood?: RoutineMood
  energy_level?: number
  notes?: string
  tags?: string[]
}

// Expanded step for UI display (combines step data with template reference)
export interface ExpandedRoutineStep {
  id: string
  name: string
  description?: string | null
  tips?: string | null
  image_url?: string | null
  gif_url?: string | null
  category?: string | null
  duration_seconds: number
  order: number
  notes?: string
  is_custom: boolean
}

// Active routine state (during execution)
export interface ActiveRoutineState {
  template: RoutineTemplate
  steps: ExpandedRoutineStep[]
  currentStepIndex: number
  startedAt: string
  completedSteps: CompletedStep[]
  isPaused: boolean
}

// Level thresholds and rewards
export interface LevelInfo {
  level: number
  minXp: number
  maxXp: number
  title: string
}

// Achievement definition
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  requirement: {
    type: 'completions' | 'streak' | 'level' | 'challenge'
    value: number
  }
  xpReward: number
  isUnlocked?: boolean
  unlockedAt?: string
}

// XP breakdown for a completed routine
export interface XPBreakdown {
  baseXp: number
  streakBonus: number
  perfectBonus: number
  challengeBonus: number
  total: number
}
