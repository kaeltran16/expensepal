'use client'

import { ExpandableExpenseCard } from '@/components/expandable-expense-card';
import { ExpenseCardSkeleton } from '@/components/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  filteredExpenses: Expense[];
  loading: boolean;
  showAllExpenses: boolean;
  isSyncing: boolean;
  onShowForm: () => void;
  onSync: () => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onUpdate: (expense: Expense) => void;
  onClearFilters: () => void;
}

export function ExpensesView({
  expenses,
  filteredExpenses,
  loading,
  showAllExpenses,
  isSyncing,
  onShowForm,
  onSync,
  onDelete,
  onEdit,
  onUpdate,
  onClearFilters,
}: ExpensesViewProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <ExpenseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state - no expenses at all
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon="💸"
        title="No expenses yet"
        description="Start tracking your spending by adding an expense manually or syncing your emails"
        size="lg"
        animationVariant="bounce"
        action={{
          label: 'Add Your First Expense',
          onClick: onShowForm,
          icon: <Plus className="h-5 w-5" />,
        }}
        secondaryAction={{
          label: 'Or Sync from Email',
          onClick: onSync,
          variant: 'outline',
          icon: <RefreshCw className="h-5 w-5" />,
          loading: isSyncing,
        }}
      />
    );
  }

  // Empty state - filtered results
  if (filteredExpenses.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title="No matching expenses"
        description="Try adjusting your filters or search terms to find what you're looking for"
        animationVariant="rotate"
        action={{
          label: 'Add Expense',
          onClick: onShowForm,
          icon: <Plus className="h-4 w-4" />,
        }}
        secondaryAction={{
          label: 'Clear All Filters',
          onClick: () => {
            onClearFilters();
            hapticFeedback('light');
          },
          variant: 'outline',
        }}
      />
    );
  }

  // Expense list
  const displayedExpenses = showAllExpenses ? filteredExpenses : filteredExpenses.slice(0, 10);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {displayedExpenses.map((expense, index) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{
              duration: 0.3,
              delay: index < 10 ? index * 0.05 : 0,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <ExpandableExpenseCard
              expense={expense}
              onDelete={onDelete}
              onEdit={onEdit}
              onUpdate={onUpdate}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
