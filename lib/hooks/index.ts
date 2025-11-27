/**
 * TanStack Query Hooks
 *
 * Centralized export for all custom hooks
 */

// Query keys
export { queryKeys } from './query-keys'
export type { ExpenseFilters, BudgetFilters, GoalFilters, MealFilters } from './query-keys'

// Expenses
export {
  useExpenses,
  useCreateExpense,
  useCreateExpenseOptimistic,
  useUpdateExpense,
  useDeleteExpense,
  useDeleteExpenseOptimistic,
} from './use-expenses'

// Budgets
export {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useUpdateBudgetOptimistic,
} from './use-budgets'

// Goals
export {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useUpdateGoalOptimistic,
  useDeleteGoalOptimistic,
} from './use-goals'

// Stats & Email Sync
export { useStats, useEmailSync } from './use-stats'
export type { StatsData, EmailSyncResponse } from './use-stats'

// Merchants
export { useCategorySuggestion } from './use-merchants'
export type { CategorySuggestion } from './use-merchants'

// Notifications
export {
  useSubscribePushNotifications,
  useUnsubscribePushNotifications,
} from './use-notifications'
export type { PushSubscription } from './use-notifications'

// Meals & Calorie Tracking
export {
  useMeals,
  useCalorieStats,
  useCalorieGoal,
  useCreateMealOptimistic,
  useDeleteMealOptimistic,
  type Meal,
  type MealInsert,
} from './use-meals'
export type { CalorieStats, CalorieGoal } from './use-meals'

// Custom UI Hooks
export { useExpenseFilters } from './use-expense-filters'
export { useMealFilters } from './use-meal-filters'
export { useExpenseOperations } from './use-expense-operations'
export { useSyncOperations } from './use-sync-operations'
export type { SyncStatus } from './use-sync-operations'
export { usePullToRefresh } from './use-pull-to-refresh'

// Analytics & Recommendations
export {
  useBudgetRecommendations,
  useSpendingPatterns,
  useBudgetAdjustmentCheck,
} from './use-budget-recommendations'
export { useAIInsights } from './use-ai-insights'

// Budget Predictions & Alerts
export {
  useBudgetPredictions,
  useCategories,
  useCreateCategory,
  useDismissAlert,
  getDismissedAlerts,
  clearDismissedAlerts,
} from './use-budget-predictions'
export type { BudgetPredictionsResponse, Category } from './use-budget-predictions'

// Offline Mode
export { useOfflineQueue } from './use-offline-queue'
export type { PendingMutation } from './use-offline-queue'

// Profile
export { useProfile, useUpdateProfile } from './use-profile'
