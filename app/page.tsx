'use client'

export const dynamic = 'force-dynamic'

import { BottomNavigation } from '@/components/bottom-navigation';
import { BudgetAlerts } from '@/components/budget-alerts';
import { ErrorBoundary } from '@/components/error-boundary';
import { FilterSheet } from '@/components/filter-sheet';
import { FloatingActionMenu } from '@/components/floating-action-menu';
import { Navbar } from '@/components/navbar';
import { NetworkStatus } from '@/components/network-status';
import { Onboarding } from '@/components/onboarding';
import { PageHeader } from '@/components/page-header';
import { ProgressIndicator } from '@/components/progress-indicator';
import { PullToRefreshWrapper } from '@/components/pull-to-refresh-wrapper';
import { PushNotificationManager } from '@/components/push-notification-manager';
import { QuickExpenseForm } from '@/components/quick-expense-form';
import { QuickStatsOverview } from '@/components/quick-stats-overview';
import { QuickStatsSkeleton } from '@/components/quick-stats-skeleton';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import {
  AnalyticsViewSkeleton,
  BudgetViewSkeleton,
  CaloriesViewSkeleton,
  GoalsViewSkeleton,
  RecurringViewSkeleton,
  ViewSkeleton,
  WorkoutsViewSkeleton,
} from '@/components/views/skeletons';
import { WorkoutLogger } from '@/components/workout-logger';
import type { ExerciseLog } from '@/components/workouts/workout-summary';
import type { ViewType } from '@/lib/constants/filters';
import {
  queryKeys,
  useBudgets,
  useCalorieStats,
  useCreateTemplate,
  useCreateWorkout,
  useDeleteTemplate,
  useExercises,
  useExpenseFilters,
  useExpenseOperations,
  useExpenses,
  useMeals,
  useProfile,
  useStats,
  useSyncOperations,
  useUpdateProfile,
  useUpdateTemplate,
  useWorkouts,
  useWorkoutTemplates,
  workoutKeys,
} from '@/lib/hooks';
import type { Expense } from '@/lib/supabase';
import type { WorkoutTemplate } from '@/lib/types';
import { hapticFeedback } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

// Type definitions for template operations
type TemplateExercise = {
  exercise_id: string
  name: string
  category: string
  sets: number
  reps: string
  rest_seconds: number
  notes?: string
  order?: number
}

type TemplateData = {
  name: string
  description?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number
  exercises: TemplateExercise[]
}

type UpdateTemplateData = TemplateData & { id: string }

type WorkoutCompletionData = {
  template_id?: string
  started_at: string
  completed_at: string
  duration_minutes: number
  notes?: string
  exerciseLogs: {
    exercise_id: string
    sets: {
      reps: number
      weight?: number
      completed?: boolean
    }[]
    notes?: string
  }[]
}

// Lazy load view components for code splitting and better performance
const ExpensesView = lazy(() => import('@/components/views').then(mod => ({ default: mod.ExpensesView })));
const AnalyticsInsightsView = lazy(() => import('@/components/views').then(mod => ({ default: mod.AnalyticsInsightsView })));
const BudgetView = lazy(() => import('@/components/views').then(mod => ({ default: mod.BudgetView })));
const GoalsView = lazy(() => import('@/components/views').then(mod => ({ default: mod.GoalsView })));
const SummaryView = lazy(() => import('@/components/views').then(mod => ({ default: mod.SummaryView })));
const CaloriesView = lazy(() => import('@/components/views').then(mod => ({ default: mod.CaloriesView })));
const RecurringView = lazy(() => import('@/components/views').then(mod => ({ default: mod.RecurringView })));
const WorkoutsView = lazy(() => import('@/components/views').then(mod => ({ default: mod.WorkoutsView })));
const ProfileView = lazy(() => import('@/components/views').then(mod => ({ default: mod.ProfileView })));

function HomeContent() {
  // Client-side UI state (needs to be before hooks that depend on it)
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<ViewType>((searchParams.get('view') as ViewType) || 'expenses');

  // Core hooks - always loaded for expenses view (default)
  const { data: expenses = [], isLoading: expensesLoading, refetch: refetchExpenses } = useExpenses();
  const { isLoading: statsLoading, refetch: refetchStats } = useStats();

  // Conditionally load data based on active view
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(
    { month: currentMonth },
    { enabled: ['budget', 'expenses'].includes(activeView) } // Load for budget view + expenses (for alerts)
  );

  const { data: profile, isLoading: profileLoading } = useProfile({
    enabled: activeView === 'profile'
  });
  const { mutateAsync: updateProfile } = useUpdateProfile();

  // Workout tracking hooks - only load when viewing workouts
  const weekAgo = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString()
  }, [])
  const { data: workoutTemplates = [], isLoading: templatesLoading } = useWorkoutTemplates({
    enabled: activeView === 'workouts'
  })
  const { data: workouts = [] } = useWorkouts(
    { startDate: weekAgo },
    { enabled: activeView === 'workouts' }
  )
  const { data: exercises = [] } = useExercises({
    enabled: activeView === 'workouts'
  })
  const { mutateAsync: createWorkout } = useCreateWorkout()
  const { mutateAsync: createTemplate } = useCreateTemplate()
  const { mutateAsync: updateTemplate } = useUpdateTemplate()
  const { mutateAsync: deleteTemplate } = useDeleteTemplate()

  // Derived loading state for expenses view
  const loading = expensesLoading || statsLoading || budgetsLoading;

  // Client-side UI state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [editingWorkoutExercises, setEditingWorkoutExercises] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  // Custom hooks for complex logic
  const {
    filteredExpenses,
    quickFilter,
    categoryFilter,
    searchQuery: _searchQuery,
    setQuickFilter,
    setCategoryFilter,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  } = useExpenseFilters(expenses);

  const {
    handleDelete,
    handleUpdateNotes,
    handleSubmit: handleExpenseSubmit,
  } = useExpenseOperations(expenses);

  const {
    syncProgress,
    syncStatus,
    syncDetail,
    lastSynced,
    handleSync,
    isSyncing,
  } = useSyncOperations();

  const handleRefresh = async () => {
    await refetchExpenses();
    await refetchStats();
  };

  // Calorie tracking state - now using TanStack Query hooks
  const startDate = useMemo(() => {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }, []);

  const { data: meals = [], isLoading: loadingMeals } = useMeals(
    { startDate, limit: 100 },
    { enabled: activeView === 'calories' }
  );
  const { data: calorieStats } = useCalorieStats(
    { startDate },
    { enabled: activeView === 'calories' && meals.length > 0 }
  );

  // Prefetch data for likely next views to make navigation instant
  const queryClient = useQueryClient();
  useEffect(() => {
    // When on expenses view, prefetch budget view data (most common navigation)
    if (activeView === 'expenses') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.budgets.list({ month: currentMonth }),
        queryFn: async () => {
          const params = new URLSearchParams();
          params.append('month', currentMonth);
          const response = await fetch(`/api/budgets?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch budgets');
          const data = await response.json();
          return data.budgets || data || [];
        },
      });
    }

    // When on budget view, prefetch insights data
    if (activeView === 'budget' && expenses.length > 0) {
      // No specific prefetch needed as insights use already-loaded expenses
    }

    // When on any view, prefetch workouts if user might navigate there
    // This is lower priority, only prefetch after a delay
    const prefetchTimer = setTimeout(() => {
      if (activeView !== 'workouts') {
        queryClient.prefetchQuery({
          queryKey: workoutKeys.templates,
          queryFn: async () => {
            const res = await fetch('/api/workout-templates');
            if (!res.ok) throw new Error('failed to fetch workout templates');
            const data = await res.json();
            return data.templates;
          },
        });
      }
    }, 2000); // Prefetch after 2 seconds

    return () => clearTimeout(prefetchTimer);
  }, [activeView, currentMonth, expenses.length, queryClient]);

  // Check if should show onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const currentScrollY = contentRef.current.scrollTop;

      if (currentScrollY > 100) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      lastScrollY.current = currentScrollY;
    };

    const ref = contentRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (ref) {
        ref.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
    hapticFeedback('light');
  };

  const handleSubmit = async (data: {
    amount: number
    merchant: string
    category: string
    transaction_date: string
    transaction_type?: string
    currency?: string
    notes?: string
  }) => {
    await handleExpenseSubmit(data, editingExpense, {
      onBeforeSubmit: () => {
        setShowForm(false);
        setEditingExpense(undefined);
      },
      onError: () => {
        setShowForm(true);
        setEditingExpense(editingExpense);
      },
    });
  };

  const todayExpenses = expenses.filter((e) => {
    const today = new Date().toDateString();
    const expenseDate = new Date(e.transaction_date).toDateString();
    return today === expenseDate;
  });

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate week total
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.transaction_date);
    return expenseDate >= weekStart;
  });
  const weekTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate month total
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.transaction_date);
    return expenseDate >= monthStart;
  });
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate last month total for comparison
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  lastMonthStart.setHours(0, 0, 0, 0);

  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  const lastMonthExpenses = expenses.filter((e) => {
    const expenseDate = new Date(e.transaction_date);
    return expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd;
  });
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      {/* Navbar */}
      <Navbar
        onSyncEmails={handleSync}
        isSyncing={isSyncing}
        onOpenProfile={() => {
          setActiveView('profile')
          hapticFeedback('light')
        }}
        onLogoClick={() => {
          setActiveView('expenses')
          hapticFeedback('light')
        }}
      />

      <PullToRefreshWrapper
        onRefresh={handleRefresh}
        enabled={['expenses', 'budget', 'insights', 'calories'].includes(activeView)}
      >
        <div
          ref={contentRef}
          className="min-h-screen overflow-auto overscroll-behavior-none"
          style={{
            WebkitOverflowScrolling: 'touch',
            paddingTop: 'calc(4rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))',
            background: 'var(--background)',
          }}
        >

        {/* Header */}
        <PageHeader activeView={activeView} scrolled={scrolled} />

        {/* Sync Progress */}
        <AnimatePresence>
          {syncStatus !== 'idle' && (
            <div className="px-4 mb-4">
              <ProgressIndicator
                status={syncStatus}
                message={syncProgress}
                detail={syncDetail}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Content based on active view - iOS inset grouping */}
        <div className="px-4 space-y-4 mt-4">
          {activeView === 'expenses' && (
            <>
              {/* Quick Stats Overview */}
              {loading ? (
                <QuickStatsSkeleton />
              ) : (
                <QuickStatsOverview
                  todayTotal={todayTotal}
                  todayCount={todayExpenses.length}
                  weekTotal={weekTotal}
                  monthTotal={monthTotal}
                  lastMonthTotal={lastMonthTotal}
                />
              )}

              {/* Budget Alerts */}
              {!loading && <BudgetAlerts expenses={expenses} />}

              {/* Search and Filter Bar - iOS optimized */}
              <div className="flex gap-3 pt-2">
                <div className="flex-1">
                  <SearchBar
                    expenses={expenses}
                    onSearch={(query) => setSearchQuery(query)}
                  />
                </div>

                {/* Filter Button */}
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={hasActiveFilters ? 'default' : 'outline'}
                    className="ripple-effect min-h-touch gap-2 whitespace-nowrap px-4 rounded-2xl ios-press"
                    onClick={() => {
                      setShowFilterSheet(true);
                      hapticFeedback('light');
                    }}
                  >
                    <Filter className="h-5 w-5" />
                    {hasActiveFilters && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-2 w-2 rounded-full bg-white"
                      />
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between pt-4 pb-2">
                <div>
                  <h2 className="ios-headline mb-0.5">Recent Transactions</h2>
                  <p className="ios-caption text-muted-foreground">
                    {filteredExpenses.length === expenses.length
                      ? `${expenses.length} total`
                      : `${filteredExpenses.length} of ${expenses.length} expenses`}
                  </p>
                </div>
                {filteredExpenses.length > 10 && (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAllExpenses(!showAllExpenses);
                        hapticFeedback('light');
                      }}
                      className="gap-2 ios-touch min-h-touch text-primary rounded-full px-4"
                    >
                      {showAllExpenses ? 'Less' : 'All'}
                    </Button>
                  </motion.div>
                )}
              </div>
            </>
          )}

          {activeView === 'expenses' ? (
            <Suspense fallback={<ViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load expenses" errorDescription="Something went wrong while loading your expenses">
                <ExpensesView
                  expenses={expenses}
                  filteredExpenses={filteredExpenses}
                  loading={loading}
                  showAllExpenses={showAllExpenses}
                  isSyncing={isSyncing}
                  onShowForm={() => setShowForm(true)}
                  onSync={handleSync}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onUpdate={handleUpdateNotes}
                  onClearFilters={clearFilters}
                />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'insights' ? (
            <Suspense fallback={<AnalyticsViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load insights" errorDescription="Unable to generate spending insights">
                <AnalyticsInsightsView expenses={expenses} loading={loading} onNavigate={setActiveView} />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'budget' ? (
            <Suspense fallback={<BudgetViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load budget" errorDescription="Something went wrong while loading your budget">
                <BudgetView expenses={expenses} loading={loading} />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'goals' ? (
            <Suspense fallback={<GoalsViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load goals" errorDescription="Unable to load your savings goals">
                <GoalsView loading={loading} />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'summary' ? (
            <Suspense fallback={<ViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load summary" errorDescription="Unable to load weekly summary">
                <SummaryView expenses={expenses} loading={loading} />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'calories' ? (
            <Suspense fallback={<CaloriesViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load calories" errorDescription="Unable to load your calorie tracking data">
                <CaloriesView
                  meals={meals}
                  calorieStats={calorieStats ?? null}
                  loading={loadingMeals}
                  showAllMeals={showAllMeals}
                  onToggleShowAll={() => setShowAllMeals(!showAllMeals)}
                />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'recurring' ? (
            <Suspense fallback={<RecurringViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load recurring expenses" errorDescription="Unable to load your subscriptions">
                <RecurringView expenses={expenses} />
              </ErrorBoundary>
            </Suspense>
          ) : activeView === 'workouts' ? (
            <Suspense fallback={<WorkoutsViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load workouts" errorDescription="Unable to load your workout data">
                <WorkoutsView
              templates={workoutTemplates}
              recentWorkouts={workouts}
              loading={templatesLoading}
              onStartWorkout={(template) => {
                setActiveWorkout(template)
                setExerciseLogs([]) // Reset logs for new workout
                setEditingWorkoutExercises(false) // Not editing, starting fresh
                setActiveView('summary') // Switch away from workouts view so WorkoutLogger can show
                hapticFeedback('medium')
              }}
              onCreateTemplate={async (templateData) => {
                // Convert from Partial to required type
                await createTemplate(templateData as TemplateData)
              }}
              onUpdateTemplate={async (id, templateData) => {
                // Convert from Partial to required type with id
                await updateTemplate({ id, ...templateData } as UpdateTemplateData)
              }}
              onDeleteTemplate={async (id) => {
                await deleteTemplate(id)
              }}
              activeWorkout={activeWorkout}
              exerciseLogs={exerciseLogs}
              editingWorkoutExercises={editingWorkoutExercises}
              onReturnToWorkout={() => {
                // Switch back to previous view (or summary) to show workout logger
                setEditingWorkoutExercises(false)
                setActiveView('summary')
              }}
            />
            </ErrorBoundary>
            </Suspense>
          ) : activeView === 'profile' ? (
            <Suspense fallback={<ViewSkeleton />}>
              <ErrorBoundary errorTitle="Failed to load profile" errorDescription="Unable to load your profile settings">
                <ProfileView
                  profile={profile ?? null}
                  loading={profileLoading}
                  onUpdate={updateProfile}
                />
              </ErrorBoundary>
            </Suspense>
          ) : null}
        </div>
        {/* Floating Action Menu */}
        <FloatingActionMenu
          onAddExpense={() => {
            setEditingExpense(undefined);
            setShowForm(true);
          }}
          onSyncEmails={handleSync}
          syncing={isSyncing}
        />

        {/* Bottom Navigation */}
        <BottomNavigation activeView={activeView} onViewChange={setActiveView} />

        {/* Network Status */}
        <NetworkStatus syncing={isSyncing} lastSynced={lastSynced} />

        {/* Expense Form Modal */}
        <AnimatePresence>
          {showForm && (
            <QuickExpenseForm
              expense={editingExpense}
              onSubmit={async (data) => {
                await handleSubmit(data)
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingExpense(undefined);
              }}
            />
          )}
        </AnimatePresence>

        {/* Push Notification Manager */}
        <PushNotificationManager />

        {/* Onboarding */}
        {showOnboarding && (
          <Onboarding
            onComplete={() => setShowOnboarding(false)}
            onAddExpense={() => {
              setShowForm(true);
              setShowOnboarding(false);
            }}
            onSyncEmails={() => {
              handleSync();
              setShowOnboarding(false);
            }}
          />
        )}

        {/* Filter Sheet */}
        <FilterSheet
          isOpen={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          quickFilter={quickFilter}
          categoryFilter={categoryFilter}
          onQuickFilterChange={setQuickFilter}
          onCategoryFilterChange={setCategoryFilter}
          onReset={() => {
            clearFilters();
            setShowFilterSheet(false);
          }}
          expenses={expenses}
          budgets={budgets}
          currentMonth={currentMonth}
        />

        {/* Workout Logger - only show when not editing exercises */}
        <AnimatePresence>
          {(() => {
            const shouldShow = activeWorkout && activeView !== 'workouts'
            return shouldShow && (
              <WorkoutLogger
                template={activeWorkout}
                exercises={exercises}
                onComplete={async (workoutData) => {
                  // Transform workout data to API format
                  const now = new Date().toISOString()
                  const apiData: WorkoutCompletionData = {
                    template_id: workoutData.template_id,
                    started_at: now,  // These would ideally come from the component
                    completed_at: now,
                    duration_minutes: workoutData.duration_minutes,
                    exerciseLogs: workoutData.exercises_completed.map((log) => ({
                      exercise_id: log.exercise_id,
                      sets: log.sets,
                      notes: log.exercise_name,  // Preserve exercise name in notes
                    })),
                  }
                  await createWorkout(apiData)
                  setActiveWorkout(null)
                  setExerciseLogs([])
                }}
                onCancel={() => {
                  setActiveWorkout(null)
                  setExerciseLogs([])
                }}
                onEditExercises={() => {
                  console.log('onEditExercises called - switching to workouts view, activeWorkout:', activeWorkout?.name)
                  setEditingWorkoutExercises(true)
                  setActiveView('workouts')
                }}
                onExerciseLogsChange={setExerciseLogs}
              />
            )
          })()}
        </AnimatePresence>
        </div>
      </PullToRefreshWrapper>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
