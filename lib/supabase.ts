import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Client for frontend (respects RLS policies)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Admin client for backend operations (bypasses RLS)
// Use this ONLY in API routes, never expose to frontend
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

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