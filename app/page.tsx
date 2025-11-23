'use client'

import { BottomNavigation } from '@/components/bottom-navigation';
import { BudgetAlerts } from '@/components/budget-alerts';
import { FilterSheet } from '@/components/filter-sheet';
import { FloatingActionMenu } from '@/components/floating-action-menu';
import { Navbar } from '@/components/navbar';
import { NetworkStatus } from '@/components/network-status';
import { Onboarding } from '@/components/onboarding';
import { PageHeader } from '@/components/page-header';
import { ProgressIndicator } from '@/components/progress-indicator';
import { PushNotificationManager } from '@/components/push-notification-manager';
import { QuickExpenseForm } from '@/components/quick-expense-form';
import { QuickStatsOverview } from '@/components/quick-stats-overview';
import { QuickStatsSkeleton } from '@/components/quick-stats-skeleton';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import {
  AnalyticsView,
  BudgetView,
  CaloriesView,
  ExpensesView,
  GoalsView,
  InsightsView,
  SummaryView,
} from '@/components/views';
import type { ViewType } from '@/lib/constants/filters';
import {
  useBudgets,
  useCalorieStats,
  useExpenseFilters,
  useExpenseOperations,
  useExpenses,
  useMeals,
  usePullToRefresh,
  useStats,
  useSyncOperations,
} from '@/lib/hooks';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export default function Home() {
  // TanStack Query hooks for server state
  const { data: expenses = [], isLoading: expensesLoading, refetch: refetchExpenses } = useExpenses();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets({ month: currentMonth });

  // Derived loading state
  const loading = expensesLoading || statsLoading || budgetsLoading;

  // Client-side UI state
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('expenses');
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
    searchQuery,
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

  const {
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: activeView === 'expenses',
  });

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

  const handleSubmit = async (data: any) => {
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
      <Navbar onSyncEmails={handleSync} isSyncing={isSyncing} />

      <div
        ref={contentRef}
        className="min-h-screen overflow-auto overscroll-behavior-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(4rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))',
          background: 'var(--background)',
        }}
        onTouchStart={(e) => handleTouchStart(e, contentRef)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator - Enhanced iOS style */}
        <AnimatePresence>
          {pullDistance > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{
                opacity: Math.min(pullDistance / 70, 1),
                y: Math.min(pullDistance / 3, 30),
                scale: pullDistance > 70 ? 1.1 : 1,
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-16 left-0 right-0 flex justify-center z-40 pointer-events-none"
            >
              <motion.div
                className="bg-card/90 backdrop-blur-xl rounded-full p-3 shadow-lg border border-border/50"
                animate={{
                  boxShadow: pullDistance > 70
                    ? '0 10px 40px -10px rgba(0, 122, 255, 0.3)'
                    : '0 4px 12px -4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <motion.div
                  animate={{ rotate: isRefreshing ? 360 : pullDistance * 3 }}
                  transition={{
                    duration: isRefreshing ? 1 : 0.2,
                    repeat: isRefreshing ? Infinity : 0,
                    ease: isRefreshing ? 'linear' : 'easeOut',
                  }}
                >
                  <RefreshCw
                    className={`h-5 w-5 transition-colors ${
                      pullDistance > 70 ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
          ) : activeView === 'analytics' ? (
            <AnalyticsView expenses={expenses} loading={loading} />
          ) : activeView === 'budget' ? (
            <BudgetView expenses={expenses} loading={loading} />
          ) : activeView === 'goals' ? (
            <GoalsView loading={loading} />
          ) : activeView === 'summary' ? (
            <SummaryView expenses={expenses} loading={loading} />
          ) : activeView === 'insights' ? (
            <InsightsView expenses={expenses} loading={loading} />
          ) : activeView === 'calories' ? (
            <CaloriesView
              meals={meals}
              calorieStats={calorieStats}
              loading={loadingMeals}
              showAllMeals={showAllMeals}
              onToggleShowAll={() => setShowAllMeals(!showAllMeals)}
            />
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
              onSubmit={handleSubmit}
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
      </div>
    </>
  );
}
