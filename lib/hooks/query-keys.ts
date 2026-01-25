/**
 * Query Keys Factory
 *
 * Centralized query keys for TanStack Query
 * Following best practices for query key management
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

export const queryKeys = {
  // Expenses
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters?: ExpenseFilters) => [...queryKeys.expenses.lists(), filters] as const,
    details: () => [...queryKeys.expenses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.expenses.details(), id] as const,
  },

  // Stats / Analytics
  stats: {
    all: ['stats'] as const,
    summary: (period?: string) => [...queryKeys.stats.all, 'summary', period] as const,
  },

  // Advanced Analytics
  analytics: {
    all: ['analytics'] as const,
    budgetRecommendations: (expenseCount: number, budgetCount: number) =>
      [...queryKeys.analytics.all, 'budget-recommendations', expenseCount, budgetCount] as const,
    spendingPatterns: (expenseCount: number, budgetCount: number) =>
      [...queryKeys.analytics.all, 'spending-patterns', expenseCount, budgetCount] as const,
    budgetAdjustmentCheck: (expenseCount: number, budgetCount: number) =>
      [...queryKeys.analytics.all, 'budget-adjustment-check', expenseCount, budgetCount] as const,
  },

  // Insights (cached expensive calculations)
  insights: {
    all: ['insights'] as const,
    preprocessed: (cacheKey: string) => [...queryKeys.insights.all, 'preprocessed', cacheKey] as const,
    byExpenses: (expenseCount: number) => [...queryKeys.insights.all, expenseCount] as const,
  },

  // Budgets
  budgets: {
    all: ['budgets'] as const,
    lists: () => [...queryKeys.budgets.all, 'list'] as const,
    list: (filters?: BudgetFilters) => [...queryKeys.budgets.lists(), filters] as const,
    details: () => [...queryKeys.budgets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.budgets.details(), id] as const,
    predictions: (month?: string) => [...queryKeys.budgets.all, 'predictions', month] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
  },

  // Goals
  goals: {
    all: ['goals'] as const,
    lists: () => [...queryKeys.goals.all, 'list'] as const,
    list: (filters?: GoalFilters) => [...queryKeys.goals.lists(), filters] as const,
    details: () => [...queryKeys.goals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.goals.details(), id] as const,
  },

  // Merchants (for category suggestions)
  merchants: {
    all: ['merchants'] as const,
    categorySuggestion: (merchant: string) =>
      [...queryKeys.merchants.all, 'category-suggestion', merchant] as const,
  },

  // Meals (for calorie tracking)
  meals: {
    all: ['meals'] as const,
    lists: () => [...queryKeys.meals.all, 'list'] as const,
    list: (filters?: MealFilters) => [...queryKeys.meals.lists(), filters] as const,
    details: () => [...queryKeys.meals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.meals.details(), id] as const,
  },

  // Calorie Stats
  calorieStats: {
    all: ['calorieStats'] as const,
    summary: (filters?: MealFilters) => [...queryKeys.calorieStats.all, 'summary', filters] as const,
  },

  // Calorie Goal
  calorieGoal: {
    all: ['calorieGoal'] as const,
    detail: () => [...queryKeys.calorieGoal.all, 'detail'] as const,
  },

  // Workouts
  workouts: {
    all: ['workouts'] as const,
    lists: () => [...queryKeys.workouts.all, 'list'] as const,
    list: (filters?: WorkoutFilters) => [...queryKeys.workouts.lists(), filters] as const,
    details: () => [...queryKeys.workouts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workouts.details(), id] as const,
  },

  // Exercises
  exercises: {
    all: ['exercises'] as const,
    lists: () => [...queryKeys.exercises.all, 'list'] as const,
    list: (filters?: ExerciseFilters) => [...queryKeys.exercises.lists(), filters] as const,
    details: () => [...queryKeys.exercises.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.exercises.details(), id] as const,
  },

  // Exercise History
  exerciseHistory: {
    all: ['exerciseHistory'] as const,
    lists: () => [...queryKeys.exerciseHistory.all, 'list'] as const,
    list: (exerciseId?: string) => [...queryKeys.exerciseHistory.lists(), exerciseId] as const,
    details: () => [...queryKeys.exerciseHistory.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.exerciseHistory.details(), id] as const,
  },

  // Recurring Expenses
  recurringExpenses: {
    all: ['recurringExpenses'] as const,
    lists: () => [...queryKeys.recurringExpenses.all, 'list'] as const,
    list: (filters?: RecurringExpenseFilters) =>
      [...queryKeys.recurringExpenses.lists(), filters] as const,
    details: () => [...queryKeys.recurringExpenses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.recurringExpenses.details(), id] as const,
    detected: (expenseCount: number) =>
      [...queryKeys.recurringExpenses.all, 'detected', expenseCount] as const,
    due: () => [...queryKeys.recurringExpenses.all, 'due'] as const,
    upcoming: (days?: number) => [...queryKeys.recurringExpenses.all, 'upcoming', days] as const,
  },
  // Weight Logs
  weightLogs: {
    all: ['weightLogs'] as const,
    lists: () => [...queryKeys.weightLogs.all, 'list'] as const,
    list: (filters?: WeightLogFilters) => [...queryKeys.weightLogs.lists(), filters] as const,
  },

  // Water Logs
  waterLogs: {
    all: ['waterLogs'] as const,
    today: (date?: string) => [...queryKeys.waterLogs.all, 'today', date] as const,
  },

  // Meal Streaks
  mealStreaks: {
    all: ['mealStreaks'] as const,
    current: () => [...queryKeys.mealStreaks.all, 'current'] as const,
  },

  // Saved Foods / Favorites
  savedFoods: {
    all: ['savedFoods'] as const,
    lists: () => [...queryKeys.savedFoods.all, 'list'] as const,
    list: (favoritesOnly?: boolean) => [...queryKeys.savedFoods.lists(), { favoritesOnly }] as const,
    favorites: () => [...queryKeys.savedFoods.all, 'favorites'] as const,
  },
} as const

// Filter types
export interface ExpenseFilters {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  merchant?: string
  category?: string
}

export interface BudgetFilters {
  month?: string
  category?: string
}

export interface GoalFilters {
  active?: boolean
}

export interface MealFilters {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  mealTime?: string
}

export interface WorkoutFilters {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  templateId?: string
}

export interface ExerciseFilters {
  category?: string
  muscleGroup?: string
  equipment?: string
  favoriteOnly?: boolean
}

export interface RecurringExpenseFilters {
  isActive?: boolean
  source?: 'manual' | 'detected'
  category?: string
}

export interface WeightLogFilters {
  startDate?: string
  endDate?: string
  limit?: number
}
