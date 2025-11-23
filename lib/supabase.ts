import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Client for frontend (respects RLS policies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Admin client for backend operations (bypasses RLS)
// Use this ONLY in API routes, never expose to frontend
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export type Expense = {
  id: string
  user_id?: string | null  // Added for authentication
  card_number: string | null
  cardholder: string | null
  transaction_type: string | null
  amount: number
  currency: string
  transaction_date: string
  merchant: string
  category?: string | null
  notes?: string | null
  source: string
  email_subject?: string | null
  created_at: string | null
  updated_at: string | null
}

export type Meal = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal_time: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
  meal_date: string
  source: 'manual' | 'llm' | 'usda' | 'saved' | 'email'
  confidence?: 'high' | 'medium' | 'low' | null
  expense_id?: string | null
  notes?: string | null
  llm_reasoning?: string | null
  created_at: string
  updated_at: string
}

export type SavedFood = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: 'manual' | 'llm' | 'usda'
  is_favorite: boolean
  use_count: number
  last_used_at?: string | null
  notes?: string | null
  portion_description?: string | null
  created_at: string
  updated_at: string
}

export type CalorieGoal = {
  id: string
  daily_calories: number
  protein_target?: number | null
  carbs_target?: number | null
  fat_target?: number | null
  start_date: string
  end_date?: string | null
  goal_type: 'weight_loss' | 'weight_gain' | 'maintenance' | 'custom'
  notes?: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at' | 'updated_at'>>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Meal, 'id' | 'created_at' | 'updated_at'>>
      }
      saved_foods: {
        Row: SavedFood
        Insert: Omit<SavedFood, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SavedFood, 'id' | 'created_at' | 'updated_at'>>
      }
      calorie_goals: {
        Row: CalorieGoal
        Insert: Omit<CalorieGoal, 'id' | 'created_at'>
        Update: Partial<Omit<CalorieGoal, 'id' | 'created_at'>>
      }
    }
  }
}
