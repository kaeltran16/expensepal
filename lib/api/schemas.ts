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
