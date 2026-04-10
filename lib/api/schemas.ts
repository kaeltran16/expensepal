import { z } from 'zod'

/**
 * Zod validation schemas for API request/response validation
 * Ensures type safety and data integrity across all API endpoints
 */

// ============================================================================
// Expense Schemas
// ============================================================================

export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('VND'),
  merchant: z.string().min(1, 'Merchant name is required').max(100),
  category: z.string().min(1, 'Category is required'),
  transaction_date: z.string().datetime('Invalid date format'),
  notes: z.string().max(500).optional(),
  source: z.enum(['manual', 'email']).default('manual'),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial()

export const ExpenseFiltersSchema = z.object({
  limit: z.coerce.number().positive().max(1000).default(100),
  offset: z.coerce.number().nonnegative().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
})

// ============================================================================
// Budget Schemas
// ============================================================================

export const CreateBudgetSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Budget amount must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  alert_threshold: z.number().min(0).max(100).default(80),
})

export const UpdateBudgetSchema = CreateBudgetSchema.partial()

// ============================================================================
// Goal Schemas
// ============================================================================

export const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  target_amount: z.number().positive('Target amount must be positive'),
  current_amount: z.number().nonnegative().default(0),
  deadline: z.string().datetime('Invalid deadline format'),
  category: z.string().optional(),
  description: z.string().max(500).optional(),
})

export const UpdateGoalSchema = CreateGoalSchema.partial()

// ============================================================================
// Meal Schemas
// ============================================================================

export const CreateMealSchema = z.object({
  description: z.string().min(1, 'Meal description is required').max(200),
  calories: z.number().positive('Calories must be positive').max(10000),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  meal_time: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  date: z.string().datetime('Invalid date format'),
})

export const UpdateMealSchema = CreateMealSchema.partial()

// ============================================================================
// Workout Schemas
// ============================================================================

export const CreateWorkoutSchema = z.object({
  date: z.string().datetime('Invalid date format'),
  template_id: z.string().uuid().optional(),
  template_name: z.string().optional(),
  exercises_completed: z.array(z.object({
    exercise_id: z.string().uuid(),
    exercise_name: z.string(),
    sets: z.array(z.object({
      reps: z.number().positive().int(),
      weight: z.number().nonnegative(),
      completed: z.boolean(),
    })),
    notes: z.string().optional(),
  })),
  duration_minutes: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})

export const UpdateWorkoutSchema = CreateWorkoutSchema.partial()

export const CreateWorkoutTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(500).optional(),
  exercises: z.array(z.object({
    exercise_id: z.string().uuid(),
    name: z.string().optional(), // Exercise name for display
    sets: z.number().positive().int(),
    reps: z.union([z.number().positive().int(), z.string()]), // Can be number or string like "8-12"
    rest: z.number().nonnegative().default(60), // rest in seconds
    notes: z.string().optional(),
    image_url: z.string().nullable().optional(), // Exercise image
    gif_url: z.string().nullable().optional(), // Exercise GIF
    order: z.number().nonnegative().int().optional(),
  })),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration_minutes: z.number().positive().int().optional(),
  tags: z.array(z.string()).optional(),
  target_goal: z.enum(['strength', 'hypertrophy', 'endurance', 'general_fitness']).optional(),
})

// ============================================================================
// Exercise Schemas
// ============================================================================

export const CreateCustomExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required').max(100),
  category: z.string().min(1, 'Category is required'),
  muscle_group: z.string().optional(),
  equipment: z.string().optional(),
  instructions: z.string().max(1000).optional(),
})

// ============================================================================
// Profile Schemas
// ============================================================================

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format').optional(),
  currency: z.enum(['VND', 'USD', 'EUR', 'GBP', 'JPY']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  has_seen_onboarding: z.boolean().optional(),
})

// ============================================================================
// Calorie Goal Schemas
// ============================================================================

export const CreateCalorieGoalSchema = z.object({
  daily_calories: z.number().positive('Daily calories must be positive').max(10000),
  protein_target: z.number().nonnegative().optional(),
  carbs_target: z.number().nonnegative().optional(),
  fat_target: z.number().nonnegative().optional(),
  goal_type: z.enum(['weight_loss', 'maintenance', 'muscle_gain']).default('maintenance'),
  notes: z.string().max(500).optional(),
  start_date: z.string().datetime().optional(),
})

export const UpdateCalorieGoalSchema = z.object({
  daily_calories: z.number().positive('Daily calories must be positive').max(10000),
  protein_target: z.number().nonnegative().optional(),
  carbs_target: z.number().nonnegative().optional(),
  fat_target: z.number().nonnegative().optional(),
})

// ============================================================================
// Category Schemas
// ============================================================================

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  icon: z.string().max(10).optional(),
})

// ============================================================================
// Helper Types
// ============================================================================

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>
export type CreateMealInput = z.infer<typeof CreateMealSchema>
export type UpdateMealInput = z.infer<typeof UpdateMealSchema>
export type CreateWorkoutInput = z.infer<typeof CreateWorkoutSchema>
export type UpdateWorkoutInput = z.infer<typeof UpdateWorkoutSchema>
export type CreateWorkoutTemplateInput = z.infer<typeof CreateWorkoutTemplateSchema>
export type CreateCustomExerciseInput = z.infer<typeof CreateCustomExerciseSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type CreateCalorieGoalInput = z.infer<typeof CreateCalorieGoalSchema>
export type UpdateCalorieGoalInput = z.infer<typeof UpdateCalorieGoalSchema>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>

// ============================================================================
// Weight Log Schemas
// ============================================================================

export const CreateWeightLogSchema = z.object({
  weight: z.number().positive('Weight must be positive').max(999.99, 'Weight too large'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  notes: z.string().max(500).optional(),
})

export const WeightLogFiltersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().positive().max(100).default(30),
})

export type CreateWeightLogInput = z.infer<typeof CreateWeightLogSchema>

// ============================================================================
// Water Log Schemas
// ============================================================================

export const UpdateWaterLogSchema = z.object({
  amount_ml: z.number().int().nonnegative('Amount must be non-negative').max(10000, 'Amount too large'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  timezoneOffset: z.number().int().optional(),
})

export const AddWaterSchema = z.object({
  amount_ml: z.number().int().positive('Amount must be positive').max(2000, 'Single add too large'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  timezoneOffset: z.number().int().optional(),
})

export type UpdateWaterLogInput = z.infer<typeof UpdateWaterLogSchema>
export type AddWaterInput = z.infer<typeof AddWaterSchema>

// ============================================================================
// Saved Foods / Favorites Schemas
// ============================================================================

export const CreateSavedFoodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  calories: z.number().positive('Calories must be positive').max(10000),
  protein: z.number().nonnegative().optional().default(0),
  carbs: z.number().nonnegative().optional().default(0),
  fat: z.number().nonnegative().optional().default(0),
  is_favorite: z.boolean().optional().default(false),
  portion_description: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
})

export const UpdateSavedFoodSchema = z.object({
  is_favorite: z.boolean().optional(),
  use_count: z.number().int().nonnegative().optional(),
  last_used_at: z.string().datetime().optional(),
  increment_use: z.boolean().optional(),
})

export type CreateSavedFoodInput = z.infer<typeof CreateSavedFoodSchema>
export type UpdateSavedFoodInput = z.infer<typeof UpdateSavedFoodSchema>

// ============================================================================
// Routine Schemas
// ============================================================================

export const CreateRoutineCompletionSchema = z.object({
  template_id: z.string().uuid().optional(),
  routine_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_of_day: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  duration_minutes: z.number().nonnegative().optional(),
  steps_completed: z.number().nonnegative().optional(),
  xp_earned: z.number().nonnegative().optional(),
  bonus_xp: z.number().nonnegative().optional(),
})

export const CreateRoutineTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  time_of_day: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
  estimated_minutes: z.number().positive().optional(),
  steps: z.array(z.object({
    step_id: z.string().optional(),
    name: z.string(),
    duration_seconds: z.number().nonnegative().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  frequency: z.object({ type: z.string() }).optional(),
})

export const UpdateRoutineTemplateSchema = CreateRoutineTemplateSchema.partial()

export const CreateCustomRoutineStepSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  tips: z.string().max(1000).optional(),
  image_url: z.string().url().optional(),
  gif_url: z.string().url().optional(),
  category: z.string().max(50).optional(),
  duration_seconds: z.number().positive().default(60),
})

export const UpdateRoutineStatsSchema = z.object({
  add_xp: z.number().nonnegative().optional(),
  total_xp: z.number().nonnegative().optional(),
  current_level: z.number().positive().optional(),
  lifetime_routines: z.number().nonnegative().optional(),
  perfect_weeks: z.number().nonnegative().optional(),
})

export const UpdateRoutineStreakSchema = z.object({
  current_streak: z.number().nonnegative().optional(),
  longest_streak: z.number().nonnegative().optional(),
  last_routine_date: z.string().optional(),
  total_completions: z.number().nonnegative().optional(),
})

export const CreateJournalEntrySchema = z.object({
  routine_completion_id: z.string().uuid().optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
})

export const UpdateJournalEntrySchema = z.object({
  mood: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
})

export const ChallengeActionSchema = z.object({
  action: z.enum(['update_progress', 'claim']).optional(),
  increment_by: z.number().positive().optional(),
})

// ============================================================================
// Scheduled Workout Schemas
// ============================================================================

export const CreateScheduledWorkoutSchema = z.object({
  template_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduled_date is required'),
  notes: z.string().max(500).optional(),
})

export const UpdateScheduledWorkoutSchema = z.object({
  template_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['scheduled', 'completed', 'skipped']).optional(),
  notes: z.string().max(500).optional(),
  completed_workout_id: z.string().uuid().optional(),
})

// ============================================================================
// Notification Schemas
// ============================================================================

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
})

export const UnsubscribeSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
})

// ============================================================================
// Settings Schemas
// ============================================================================

export const EmailSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  email_address: z.string().email('Valid email is required'),
  app_password: z.string().min(1, 'App password is required'),
  imap_host: z.string().default('imap.gmail.com'),
  imap_port: z.number().int().min(1).max(65535).default(993),
  imap_tls: z.boolean().default(true),
  is_enabled: z.boolean().default(true),
  trusted_senders: z.array(z.string()).optional(),
})

// ============================================================================
// Personal Record Schema
// ============================================================================

export const CreatePersonalRecordSchema = z.object({
  exercise_id: z.string().uuid(),
  record_type: z.enum(['1rm', 'max_reps', 'max_volume', 'max_weight']),
  value: z.number().positive(),
  unit: z.string().max(20).optional(),
  achieved_at: z.string().datetime().optional(),
  workout_exercise_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

// ============================================================================
// Achievement Schema
// ============================================================================

export const UnlockAchievementSchema = z.object({
  achievementType: z.string().min(1, 'achievementType is required'),
})

// ============================================================================
// Exercise Favorite Schema
// ============================================================================

export const ExerciseFavoriteSchema = z.object({
  exercise_id: z.string().uuid('Valid exercise_id is required'),
})

// ============================================================================
// Workout Update / Generate Schemas
// ============================================================================

export const UpdateWorkoutSchemaNew = z.object({
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  completed_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export const GenerateWorkoutSchema = z.object({
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  target_goal: z.enum(['strength', 'hypertrophy', 'endurance', 'general_fitness']).optional(),
  duration_minutes: z.number().positive().optional(),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
})

// ============================================================================
// Recurring Expense Schemas
// ============================================================================

export const CreateRecurringExpenseSchema = z.object({
  merchant: z.string().min(1, 'Merchant is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
})

export const UpdateRecurringExpenseSchema = z.object({
  merchant: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
})

export const SkipRecurringExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
})

export const SaveDetectedExpensesSchema = z.object({
  detectedExpenses: z.array(z.object({
    merchant: z.string().min(1),
    category: z.string().min(1),
    averageAmount: z.number().positive(),
    frequency: z.string(),
    intervalDays: z.number(),
    nextExpected: z.string(),
    confidence: z.number(),
  })).min(1, 'At least one detected expense is required'),
})

// ============================================================================
// Goal Update Schema (with field mapping)
// ============================================================================

export const UpdateGoalWithMappingSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().nonnegative().optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().nonnegative().optional(),
  deadline: z.string().optional(),
  icon: z.string().max(10).optional(),
})

// ============================================================================
// Budget Update Schema
// ============================================================================

export const UpdateBudgetAmountSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
})

// ============================================================================
// Cardio Plan Update Schema
// ============================================================================

export const UpdateCardioPlanSchema = z.object({
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  current_week: z.number().positive().optional(),
  current_session: z.number().positive().optional(),
})

// ============================================================================
// Workout Template Update Schema
// ============================================================================

export const UpdateWorkoutTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration_minutes: z.number().positive().optional(),
  exercises: z.array(z.object({
    exercise_id: z.string().uuid(),
    name: z.string().optional(),
    sets: z.number().positive().int(),
    reps: z.union([z.number().positive().int(), z.string()]),
    rest: z.number().nonnegative().default(60),
    notes: z.string().optional(),
    image_url: z.string().nullable().optional(),
    gif_url: z.string().nullable().optional(),
    order: z.number().nonnegative().int().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  target_goal: z.enum(['strength', 'hypertrophy', 'endurance', 'general_fitness']).optional(),
})

// ============================================================================
// AI Schemas
// ============================================================================

export const ParseInputSchema = z.object({
  input: z.string().min(1, 'Input text is required'),
})

export const AIInsightsSchema = z.object({
  expenses: z.array(z.any()),
  budgets: z.array(z.any()).optional(),
  timeRange: z.enum(['week', 'month', 'quarter']).optional(),
})

// ============================================================================
// Streak Update Schema
// ============================================================================

export const UpdateStreakSchema = z.object({
  type: z.enum(['workout', 'meal']).optional(),
  current_streak: z.number().nonnegative().optional(),
  longest_streak: z.number().nonnegative().optional(),
  last_activity_date: z.string().optional(),
})

// ============================================================================
// Custom Exercise Update Schema
// ============================================================================

export const UpdateCustomExerciseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).optional(),
  muscle_group: z.string().optional(),
  equipment: z.string().optional(),
  instructions: z.string().max(1000).optional(),
})

// ============================================================================
// Goal Input Schema (camelCase for client API)
// ============================================================================

export const CreateGoalInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().nonnegative().default(0),
  deadline: z.string().optional(),
  icon: z.string().max(10).default('\uD83C\uDFAF'),
})

// ============================================================================
// Meal Input Schema (with LLM estimation support)
// ============================================================================

export const CreateMealInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  calories: z.number().positive().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  meal_time: z.string().optional(),
  meal_date: z.string().min(1, 'meal_date is required'),
  expense_id: z.string().optional(),
  notes: z.string().max(500).optional(),
  estimate: z.boolean().optional(),
  portionSize: z.string().optional(),
})

// ============================================================================
// Additional Type Exports
// ============================================================================

export type CreateRoutineCompletionInput = z.infer<typeof CreateRoutineCompletionSchema>
export type CreateRoutineTemplateInput = z.infer<typeof CreateRoutineTemplateSchema>
export type CreateScheduledWorkoutInput = z.infer<typeof CreateScheduledWorkoutSchema>
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>
