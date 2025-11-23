'use client'

import { Button } from '@/components/ui/button';
import { QUICK_FILTERS, CATEGORY_FILTERS, type QuickFilterType } from '@/lib/constants/filters';
import type { Expense } from '@/lib/supabase';
import { formatCurrency, hapticFeedback } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  quickFilter: QuickFilterType;
  categoryFilter: string;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  onCategoryFilterChange: (category: string) => void;
  onReset: () => void;
  expenses: Expense[];
  budgets: any[];
  currentMonth: string;
}

export function FilterSheet({
  isOpen,
  onClose,
  quickFilter,
  categoryFilter,
  onQuickFilterChange,
  onCategoryFilterChange,
  onReset,
  expenses,
  budgets,
  currentMonth,
}: FilterSheetProps) {
  const getCategorySpent = (category: string) => {
    const monthExpenses = expenses.filter((e) => {
      const expenseMonth = new Date(e.transaction_date)
        .toISOString()
        .slice(0, 7);
      return expenseMonth === currentMonth && e.category === category;
    });
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  };

  const getBudgetForCategory = (category: string) => {
    return budgets.find((b: any) => b.category === category)?.amount || 0;
  };

  const getBudgetPercentage = (category: string) => {
    const budget = getBudgetForCategory(category);
    if (budget === 0) return 0;
    const spent = getCategorySpent(category);
    return Math.min((spent / budget) * 100, 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              onClose();
              hapticFeedback('light');
            }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              duration: 0.35,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card/95 backdrop-blur-xl rounded-t-[2rem] shadow-2xl border-t border-border/50"
            style={{ maxHeight: '75vh' }}
          >
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: '75vh' }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-4 pb-3">
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
              </div>

              <div className="px-6 pb-8">
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Filters
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                    Refine your expense view
                  </p>
                </div>

                {/* Time Range - Segmented Control Style */}
                <div className="mb-10">
                  <h3 className="text-sm font-semibold mb-4 text-foreground/80">
                    TIME RANGE
                  </h3>
                  <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
                    {QUICK_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => {
                          onQuickFilterChange(
                            filter.id as QuickFilterType
                          );
                          hapticFeedback('light');
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                          quickFilter === filter.id
                            ? 'bg-card shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category - Chip Selection with Budget Indicators */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-4 text-foreground/80">
                    CATEGORY
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_FILTERS.map((cat) => {
                      const budget = getBudgetForCategory(cat);
                      const spent = getCategorySpent(cat);
                      const percentage = getBudgetPercentage(cat);
                      const hasBudget = budget > 0 && cat !== 'All';

                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            onCategoryFilterChange(cat);
                            hapticFeedback('medium');
                          }}
                          className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 overflow-hidden ${
                            categoryFilter === cat
                              ? 'bg-primary text-primary-foreground shadow-md scale-105'
                              : 'bg-muted/50 text-foreground/70 hover:bg-muted hover:text-foreground active:scale-95'
                          }`}
                        >
                          {/* Budget progress indicator */}
                          {hasBudget && (
                            <div
                              className={`absolute inset-0 transition-all duration-300 ${
                                percentage >= 100
                                  ? 'bg-destructive/20'
                                  : percentage >= 80
                                  ? 'bg-yellow-500/20'
                                  : 'bg-green-500/20'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            {cat}
                            {hasBudget && (
                              <span className="text-[10px] opacity-70">
                                {Math.round(percentage)}%
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {categoryFilter !== 'All' &&
                    getBudgetForCategory(categoryFilter) > 0 && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">
                            Spent this month
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              getCategorySpent(categoryFilter),
                              'VND'
                            )}{' '}
                            /{' '}
                            {formatCurrency(
                              getBudgetForCategory(categoryFilter),
                              'VND'
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              getBudgetPercentage(categoryFilter) >= 100
                                ? 'bg-destructive'
                                : getBudgetPercentage(categoryFilter) >= 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${getBudgetPercentage(categoryFilter)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 min-h-touch-lg rounded-xl font-medium"
                    onClick={() => {
                      onReset();
                      hapticFeedback('light');
                    }}
                  >
                    Reset All
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 min-h-touch-lg rounded-xl font-medium shadow-lg"
                    onClick={() => {
                      onClose();
                      hapticFeedback('medium');
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
