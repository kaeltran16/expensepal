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

  // Budgets
  budgets: {
    all: ['budgets'] as const,
    lists: () => [...queryKeys.budgets.all, 'list'] as const,
    list: (filters?: BudgetFilters) => [...queryKeys.budgets.lists(), filters] as const,
    details: () => [...queryKeys.budgets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.budgets.details(), id] as const,
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
