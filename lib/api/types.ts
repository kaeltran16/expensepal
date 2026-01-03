import type { Database } from '@/lib/supabase/database.types'

/**
 * API Response Types
 * Standardized response structures for all API endpoints
 * Ensures type safety and consistency across frontend and backend
 */

// ============================================================================
// Generic Response Types
// ============================================================================

/**
 * Standard API response wrapper
 * All API endpoints should return this structure
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

/**
 * Success response helper
 */
export interface SuccessResponse<T> {
  data: T
  message?: string
}

/**
 * Error response helper
 */
export interface ErrorResponse {
  error: string
  details?: Array<{
    path: string
    message: string
  }>
}

/**
 * Paginated response wrapper
 * Used for list endpoints with pagination support
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * List response without pagination
 * Simpler structure for endpoints that don't need pagination
 */
export interface ListResponse<T> {
  data: T[]
  count?: number
}

// ============================================================================
// Database Entity Types (extracted from Database types)
// ============================================================================

export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type Meal = Database['public']['Tables']['meals']['Row']
export type MealInsert = Database['public']['Tables']['meals']['Insert']
export type MealUpdate = Database['public']['Tables']['meals']['Update']

export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']
export type WorkoutUpdate = Database['public']['Tables']['workouts']['Update']

export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row']
export type WorkoutTemplateInsert = Database['public']['Tables']['workout_templates']['Insert']
export type WorkoutTemplateUpdate = Database['public']['Tables']['workout_templates']['Update']

export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update']


export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type CalorieGoal = Database['public']['Tables']['calorie_goals']['Row']
export type CalorieGoalInsert = Database['public']['Tables']['calorie_goals']['Insert']
export type CalorieGoalUpdate = Database['public']['Tables']['calorie_goals']['Update']


// ============================================================================
// Specific API Response Types
// ============================================================================

// Expense API Responses
export type GetExpensesResponse = ListResponse<Expense>
export type GetExpenseResponse = SuccessResponse<Expense>
export type CreateExpenseResponse = SuccessResponse<Expense>
export type UpdateExpenseResponse = SuccessResponse<Expense>
export type DeleteExpenseResponse = SuccessResponse<{ id: string }>

// Budget API Responses
export type GetBudgetsResponse = ListResponse<Budget>
export type GetBudgetResponse = SuccessResponse<Budget>
export type CreateBudgetResponse = SuccessResponse<Budget>
export type UpdateBudgetResponse = SuccessResponse<Budget>
export type DeleteBudgetResponse = SuccessResponse<{ id: string }>


// Meal API Responses
export type GetMealsResponse = ListResponse<Meal>
export type GetMealResponse = SuccessResponse<Meal>
export type CreateMealResponse = SuccessResponse<Meal>
export type UpdateMealResponse = SuccessResponse<Meal>
export type DeleteMealResponse = SuccessResponse<{ id: string }>

// Workout API Responses
export type GetWorkoutsResponse = ListResponse<Workout>
export type GetWorkoutResponse = SuccessResponse<Workout>
export type CreateWorkoutResponse = SuccessResponse<Workout>
export type UpdateWorkoutResponse = SuccessResponse<Workout>
export type DeleteWorkoutResponse = SuccessResponse<{ id: string }>

// Workout Template API Responses
export type GetWorkoutTemplatesResponse = ListResponse<WorkoutTemplate>
export type GetWorkoutTemplateResponse = SuccessResponse<WorkoutTemplate>
export type CreateWorkoutTemplateResponse = SuccessResponse<WorkoutTemplate>
export type UpdateWorkoutTemplateResponse = SuccessResponse<WorkoutTemplate>
export type DeleteWorkoutTemplateResponse = SuccessResponse<{ id: string }>

// Exercise API Responses
export type GetExercisesResponse = ListResponse<Exercise>
export type GetExerciseResponse = SuccessResponse<Exercise>
export type CreateExerciseResponse = SuccessResponse<Exercise>


// ============================================================================
// Analytics and Stats Response Types
// ============================================================================

export interface ExpenseStats {
  totalSpent: number
  averageTransaction: number
  transactionCount: number
  topCategories: Array<{
    category: string
    total: number
    percentage: number
  }>
  monthlyTrend: Array<{
    month: string
    total: number
  }>
}

export type GetExpenseStatsResponse = SuccessResponse<ExpenseStats>

export interface BudgetPrediction {
  category: string
  currentSpend: number
  budgetAmount: number
  projectedSpend: number
  daysRemaining: number
  onTrack: boolean
  suggestedDailyLimit: number
}

export type GetBudgetPredictionsResponse = ListResponse<BudgetPrediction>

export interface CalorieStats {
  date: string
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  goalCalories: number
  goalProtein?: number
  goalCarbs?: number
  goalFat?: number
  mealsCount: number
}

export type GetCalorieStatsResponse = ListResponse<CalorieStats>

export interface WorkoutStats {
  totalWorkouts: number
  totalDuration: number
  averageDuration: number
  exercisesCompleted: number
  personalRecords: number
  weeklyFrequency: number
}

export type GetWorkoutStatsResponse = SuccessResponse<WorkoutStats>

// ============================================================================
// AI/LLM Response Types
// ============================================================================

export interface InsightData {
  type: 'alert' | 'trend' | 'suggestion' | 'achievement'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category?: string
  actionable?: boolean
  metadata?: Record<string, unknown>
}

export type GetInsightsResponse = ListResponse<InsightData>

export interface CalorieEstimate {
  description: string
  estimatedCalories: number
  confidence: 'high' | 'medium' | 'low'
  macros?: {
    protein?: number
    carbs?: number
    fat?: number
  }
}

export type EstimateCaloriesResponse = SuccessResponse<CalorieEstimate>

// ============================================================================
// Email Integration Response Types
// ============================================================================

export interface EmailSyncResult {
  totalProcessed: number
  newExpenses: number
  failedEmails: number
  lastSyncedAt: string
}

export type EmailSyncResponse = SuccessResponse<EmailSyncResult>

// ============================================================================
// Push Notification Response Types
// ============================================================================

export interface PushSubscription {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export type SubscribePushResponse = SuccessResponse<{ subscribed: boolean }>

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T> | ErrorResponse
): response is SuccessResponse<T> {
  return 'data' in response && response.data !== undefined
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: ApiResponse | ErrorResponse
): response is ErrorResponse {
  return 'error' in response && response.error !== undefined
}

/**
 * Type guard to check if response is paginated
 */
export function isPaginatedResponse<T>(
  response: ApiResponse<unknown>
): response is PaginatedResponse<T> {
  return (
    'data' in response &&
    'pagination' in response &&
    Array.isArray(response.data)
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    data,
    ...(message && { message }),
  }
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  details?: Array<{ path: string; message: string }>
): ErrorResponse {
  return {
    error,
    ...(details && { details }),
  }
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)
  const hasMore = page < totalPages

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
    },
  }
}

/**
 * Create a list response
 */
export function createListResponse<T>(
  data: T[],
  count?: number
): ListResponse<T> {
  return {
    data,
    ...(count !== undefined && { count }),
  }
}
