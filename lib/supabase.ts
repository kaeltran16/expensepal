/**
 * Supabase Type Exports
 *
 * This file ONLY exports TypeScript types for database tables.
 * DO NOT import Supabase clients from here.
 *
 * For Supabase clients, use:
 * - Client components: import { createClient } from '@/lib/supabase/client'
 * - Server components/API routes: import { createClient } from '@/lib/supabase/server'
 * - Admin operations (bypasses RLS): import { supabaseAdmin } from '@/lib/supabase/admin'
 */

import type { Database } from './supabase/database.types'

// Export types from database.types.ts
export type { Database }
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']
export type Meal = Database['public']['Tables']['meals']['Row']
export type MealInsert = Database['public']['Tables']['meals']['Insert']
export type MealUpdate = Database['public']['Tables']['meals']['Update']
export type CalorieGoal = Database['public']['Tables']['calorie_goals']['Row']
export type CalorieGoalInsert = Database['public']['Tables']['calorie_goals']['Insert']
export type CalorieGoalUpdate = Database['public']['Tables']['calorie_goals']['Update']
export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']
export type SavedFood = Database['public']['Tables']['saved_foods']['Row']
export type SavedFoodInsert = Database['public']['Tables']['saved_foods']['Insert']
export type SavedFoodUpdate = Database['public']['Tables']['saved_foods']['Update']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type PushSubscriptionInsert = Database['public']['Tables']['push_subscriptions']['Insert']
export type PushSubscriptionUpdate = Database['public']['Tables']['push_subscriptions']['Update']
export type LLMLog = Database['public']['Tables']['llm_logs']['Row']
export type LLMLogInsert = Database['public']['Tables']['llm_logs']['Insert']
export type LLMLogUpdate = Database['public']['Tables']['llm_logs']['Update']
export type UserEmailSettings = Database['public']['Tables']['user_email_settings']['Row']
export type UserEmailSettingsInsert = Database['public']['Tables']['user_email_settings']['Insert']
export type UserEmailSettingsUpdate = Database['public']['Tables']['user_email_settings']['Update']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update']
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row']
export type WorkoutTemplateInsert = Database['public']['Tables']['workout_templates']['Insert']
export type WorkoutTemplateUpdate = Database['public']['Tables']['workout_templates']['Update']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']
export type WorkoutUpdate = Database['public']['Tables']['workouts']['Update']
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row']
export type WorkoutExerciseInsert = Database['public']['Tables']['workout_exercises']['Insert']
export type WorkoutExerciseUpdate = Database['public']['Tables']['workout_exercises']['Update']

export type RecurringExpense = Database['public']['Tables']['recurring_expenses']['Row']
export type RecurringExpenseInsert = Database['public']['Tables']['recurring_expenses']['Insert']
export type RecurringExpenseUpdate = Database['public']['Tables']['recurring_expenses']['Update']

// Workout Streaks & Achievements
export type UserWorkoutStreak = Database['public']['Tables']['user_workout_streaks']['Row']
export type UserWorkoutStreakInsert = Database['public']['Tables']['user_workout_streaks']['Insert']
export type UserWorkoutStreakUpdate = Database['public']['Tables']['user_workout_streaks']['Update']
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row']
export type UserAchievementInsert = Database['public']['Tables']['user_achievements']['Insert']
export type UserAchievementUpdate = Database['public']['Tables']['user_achievements']['Update']