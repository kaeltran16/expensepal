'use client'

import { BottomNavigation } from '@/components/bottom-navigation';
import { ErrorBoundary } from '@/components/error-boundary';
import { FilterSheet } from '@/components/filter-sheet';
import { Navbar } from '@/components/navbar';
import { NetworkStatus } from '@/components/network-status';
import { Onboarding } from '@/components/onboarding';
import { CollapsingHeader } from '@/components/collapsing-header';
import { ProgressIndicator } from '@/components/progress-indicator';
import { PullToRefreshWrapper } from '@/components/pull-to-refresh-wrapper';
import { PushNotificationManager } from '@/components/push-notification-manager';
import { NLInputSheet } from '@/components/nl-input-sheet';
import { QuickExpenseForm } from '@/components/quick-expense-form';
import { BentoStats, BentoStatsSkeleton } from '@/components/bento-stats';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
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
import type { ExerciseLog } from '@/lib/types/common';
import { hapticFeedback } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { SheetBackdropProvider, SheetBackdropContent } from '@/components/sheet-backdrop-context';
import { ViewTransition } from '@/components/view-transition';
import { AnimatePresence, motion } from 'motion/react';
import { Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoreSheet } from '@/components/more-sheet';

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

const ExpensesView = lazy(() => import('@/components/views').then(mod => ({ default: mod.ExpensesView })));
const AnalyticsInsightsView = lazy(() => import('@/components/views').then(mod => ({ default: mod.AnalyticsInsightsView })));
const BudgetView = lazy(() => import('@/components/views').then(mod => ({ default: mod.BudgetView })));
const GoalsView = lazy(() => import('@/components/views').then(mod => ({ default: mod.GoalsView })));
const SummaryView = lazy(() => import('@/components/views').then(mod => ({ default: mod.SummaryView })));
const CaloriesView = lazy(() => import('@/components/views').then(mod => ({ default: mod.CaloriesView })));
const RecurringView = lazy(() => import('@/components/views').then(mod => ({ default: mod.RecurringView })));
const WorkoutsView = lazy(() => import('@/components/views').then(mod => ({ default: mod.WorkoutsView })));
const ProfileView = lazy(() => import('@/components/views').then(mod => ({ default: mod.ProfileView })));
const RoutinesView = lazy(() => import('@/components/views').then(mod => ({ default: mod.RoutinesView })));
const FeedView = lazy(() => import('@/components/views').then(mod => ({ default: mod.FeedView })));

export function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<ViewType>((searchParams.get('view') as ViewType) || 'expenses');

  const { data: expenses = [], isLoading: expensesLoading, refetch: refetchExpenses } = useExpenses();
  const { isLoading: statsLoading, refetch: refetchStats } = useStats();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(
    { month: currentMonth },
    { enabled: ['budget', 'expenses'].includes(activeView) }
  );

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { mutateAsync: updateProfile } = useUpdateProfile();

  const twoWeeksAgo = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 14)
    return date.toISOString()
  }, [])
  const { data: workoutTemplates = [], isLoading: templatesLoading } = useWorkoutTemplates({
    enabled: activeView === 'workouts'
  })
  const { data: workouts = [] } = useWorkouts(
    { startDate: twoWeeksAgo },
    { enabled: activeView === 'workouts' }
  )
  const { data: exercises = [] } = useExercises({
    enabled: activeView === 'workouts'
  })
  const { mutateAsync: createWorkout } = useCreateWorkout()
  const { mutateAsync: createTemplate } = useCreateTemplate()
  const { mutateAsync: updateTemplate } = useUpdateTemplate()
  const { mutateAsync: deleteTemplate } = useDeleteTemplate()

  const loading = expensesLoading || statsLoading || budgetsLoading;

  const [showForm, setShowForm] = useState(false);
  const [showNLInput, setShowNLInput] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null | undefined>(undefined);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [editingWorkoutExercises, setEditingWorkoutExercises] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    contentRef.current?.scrollTo(0, 0);
  }, [activeView]);

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

  const queryClient = useQueryClient();
  useEffect(() => {
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
    }, 2000);

    return () => clearTimeout(prefetchTimer);
  }, [activeView, currentMonth, expenses.length, queryClient]);

  useEffect(() => {
    const currentView = searchParams.get('view') as ViewType;
    if (activeView !== 'expenses' && activeView !== currentView) {
      router.replace(`/?view=${activeView}`, { scroll: false });
    } else if (activeView === 'expenses' && currentView) {
      router.replace('/', { scroll: false });
    }
  }, [activeView, router, searchParams]);

  useEffect(() => {
    if (profileLoading || !profile) return;

    if (!profile.has_seen_onboarding) {
      setShowOnboarding(true);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('_auth')) {
      url.searchParams.delete('_auth')
      window.history.replaceState({}, '', url.pathname + url.search)

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_AUTH_CACHES'
        })
      }
    }
  }, [])

  useEffect(() => {
    const source = searchParams.get('source')
    const action = searchParams.get('action')

    if (source === 'share' && action === 'add' && 'caches' in window) {
      const handleShare = async () => {
        try {
          const cacheNames = await caches.keys()
          const dynamicCache = cacheNames.find(name => name.startsWith('dynamic-'))
          if (!dynamicCache) return

          const cache = await caches.open(dynamicCache)
          const response = await cache.match('/shared-data')
          if (!response) return

          const data = await response.json()
          console.log('[Share Target] Received shared data:', data)
          setActiveView('expenses')
          setShowForm(true)

          const url = new URL(window.location.href)
          url.searchParams.delete('source')
          url.searchParams.delete('action')
          window.history.replaceState({}, '', url.pathname + url.search)
        } catch (error) {
          console.error('[Share Target] Error handling shared data:', error)
          toast.error('Failed to process shared data')
        }
      }
      handleShare()
    }
  }, [searchParams])

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

  const todayExpenses = useMemo(() => {
    const today = new Date().toDateString();
    return expenses.filter((e) => new Date(e.transaction_date).toDateString() === today);
  }, [expenses]);

  const todayTotal = useMemo(() => todayExpenses.reduce((sum, e) => sum + e.amount, 0), [todayExpenses]);

  const weekExpenses = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return expenses.filter((e) => new Date(e.transaction_date) >= weekStart);
  }, [expenses]);
  const weekTotal = useMemo(() => weekExpenses.reduce((sum, e) => sum + e.amount, 0), [weekExpenses]);

  const monthExpenses = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return expenses.filter((e) => new Date(e.transaction_date) >= monthStart);
  }, [expenses]);
  const monthTotal = useMemo(() => monthExpenses.reduce((sum, e) => sum + e.amount, 0), [monthExpenses]);

  return (
    <>
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

      <SheetBackdropProvider>
      <SheetBackdropContent>
      <PullToRefreshWrapper
        onRefresh={handleRefresh}
        enabled={['expenses', 'budget', 'insights', 'calories', 'routines'].includes(activeView)}
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

        <CollapsingHeader activeView={activeView} scrollContainerRef={contentRef} />

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

        <div className="px-4 space-y-4 mt-4">
          {activeView === 'expenses' && (
            <>
              {loading ? (
                <BentoStatsSkeleton />
              ) : (
                <BentoStats
                  todayTotal={todayTotal}
                  todayCount={todayExpenses.length}
                  weekTotal={weekTotal}
                  monthTotal={monthTotal}
                  currency={profile?.currency || 'VND'}
                  budgets={budgets}
                  expenses={monthExpenses}
                  onBudgetTap={() => {
                    setActiveView('budget')
                    hapticFeedback('light')
                  }}
                />
              )}

              <div className="flex gap-3 pt-2">
                <div className="flex-1">
                  <SearchBar
                    expenses={expenses}
                    onSearch={(query) => setSearchQuery(query)}
                  />
                </div>

                <Pressable>
                  <Button
                    variant={hasActiveFilters ? 'default' : 'outline'}
                    className="ripple-effect min-h-touch gap-2 whitespace-nowrap px-4 rounded-2xl"
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
                </Pressable>
              </div>

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
                  <Pressable>
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
                  </Pressable>
                )}
              </div>
            </>
          )}

          <ViewTransition activeView={activeView}>
            {activeView === 'feed' ? (
              <Suspense fallback={<ViewSkeleton />}>
                <ErrorBoundary errorTitle="Failed to load feed" errorDescription="Something went wrong while loading your daily feed">
                  <FeedView onNavigate={setActiveView} />
                </ErrorBoundary>
              </Suspense>
            ) : activeView === 'expenses' ? (
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
            ) : activeView === 'budget' ? (
              <Suspense fallback={<BudgetViewSkeleton />}>
                <ErrorBoundary errorTitle="Failed to load budget" errorDescription="Something went wrong while loading your budget">
                  <BudgetView expenses={expenses} loading={loading} />
                </ErrorBoundary>
              </Suspense>
            ) : activeView === 'recurring' ? (
              <Suspense fallback={<RecurringViewSkeleton />}>
                <ErrorBoundary errorTitle="Failed to load recurring" errorDescription="Unable to load your subscriptions">
                  <RecurringView expenses={expenses} />
                </ErrorBoundary>
              </Suspense>
            ) : activeView === 'insights' ? (
              <Suspense fallback={<AnalyticsViewSkeleton />}>
                <ErrorBoundary errorTitle="Failed to load insights" errorDescription="Unable to generate spending insights">
                  <AnalyticsInsightsView expenses={expenses} loading={loading} onNavigate={setActiveView} />
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
            ) : activeView === 'workouts' ? (
              <Suspense fallback={<WorkoutsViewSkeleton />}>
                <ErrorBoundary errorTitle="Failed to load workouts" errorDescription="Unable to load your workout data">
                  <WorkoutsView
                    templates={workoutTemplates}
                    recentWorkouts={workouts}
                    exercises={exercises}
                    loading={templatesLoading}
                    onStartWorkout={(template) => {
                      setActiveWorkout(template)
                      setExerciseLogs([])
                      setEditingWorkoutExercises(false)
                      setActiveView('summary')
                      hapticFeedback('medium')
                    }}
                    onStartEmptyWorkout={() => {
                      setActiveWorkout(null)
                      setExerciseLogs([])
                      setEditingWorkoutExercises(false)
                      setActiveView('summary')
                      hapticFeedback('medium')
                    }}
                    onCreateTemplate={async (templateData) => {
                      await createTemplate(templateData as any)
                    }}
                    onUpdateTemplate={async (id, templateData) => {
                      await updateTemplate({ id, ...templateData } as any)
                    }}
                    onDeleteTemplate={async (id) => {
                      await deleteTemplate(id)
                    }}
                    activeWorkout={activeWorkout}
                    exerciseLogs={exerciseLogs}
                    editingWorkoutExercises={editingWorkoutExercises}
                    onReturnToWorkout={() => {
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
            ) : activeView === 'routines' ? (
              <Suspense fallback={<ViewSkeleton />}>
                <ErrorBoundary errorTitle="Failed to load routines" errorDescription="Unable to load your routines">
                  <RoutinesView />
                </ErrorBoundary>
              </Suspense>
            ) : null}
          </ViewTransition>
        </div>
        </div>
      </PullToRefreshWrapper>
      </SheetBackdropContent>

      <MoreSheet
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        onNavigate={setActiveView}
        activeView={activeView}
      />

      <NetworkStatus syncing={isSyncing} lastSynced={lastSynced} />

      <NLInputSheet
        open={showNLInput}
        onOpenChange={setShowNLInput}
        onFallbackToForm={() => setShowForm(true)}
        onStartWorkout={() => setActiveView('workouts')}
        onStartRoutine={() => setActiveView('routines')}
      />

      <AnimatePresence>
        {showForm && (
          <QuickExpenseForm
            expense={editingExpense}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingExpense(undefined);
            }}
          />
        )}
      </AnimatePresence>

      <PushNotificationManager />

      {showOnboarding && (
        <Onboarding
          onComplete={async () => {
            setShowOnboarding(false);
            try {
              await updateProfile({ has_seen_onboarding: true });
            } catch (error) {
              console.error('Failed to update onboarding status:', error);
            }
          }}
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

      <AnimatePresence>
        {activeWorkout !== undefined && activeView !== 'workouts' && (
          <WorkoutLogger
            template={activeWorkout}
            exercises={exercises}
            onComplete={async (workoutData) => {
              try {
                const now = new Date().toISOString()
                const apiData: WorkoutCompletionData = {
                  template_id: workoutData.template_id ?? undefined,
                  started_at: now,
                  completed_at: now,
                  duration_minutes: workoutData.duration_minutes ?? 0,
                  exerciseLogs: (workoutData.exercises_completed ?? []).map((log) => ({
                    exercise_id: log.exercise_id,
                    sets: log.sets,
                    notes: log.exercise_name,
                  })),
                }
                await createWorkout(apiData)
                setActiveWorkout(undefined)
                setExerciseLogs([])
              } catch (error) {
                console.error('Failed to save workout:', error)
                toast.error('Failed to save workout. Your data is preserved — please try again.')
              }
            }}
            onCancel={() => {
              setActiveWorkout(undefined)
              setExerciseLogs([])
            }}
            onEditExercises={() => {
              setEditingWorkoutExercises(true)
              setActiveView('workouts')
            }}
            onExerciseLogsChange={setExerciseLogs}
          />
        )}
      </AnimatePresence>
      </SheetBackdropProvider>

      {/* outside SheetBackdropProvider -- its motion.div applies scale/filter
          transforms that create a containing block and break position:fixed */}
      <BottomNavigation
        activeView={activeView}
        onViewChange={setActiveView}
        onAddExpense={() => {
          setEditingExpense(undefined);
          setShowNLInput(true);
          hapticFeedback('medium');
        }}
        onOpenMore={() => setShowMoreSheet(true)}
        isMoreOpen={showMoreSheet}
      />
    </>
  );
}
