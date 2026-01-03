'use client'

import { ExpandableExpenseCard } from '@/components/expandable-expense-card';
import { ExpenseCardSkeleton } from '@/components/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import { useRef } from 'react';

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
  // Hooks must be called unconditionally at the top of the component
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calculate displayed expenses for virtualizer
  const displayedExpenses = showAllExpenses ? filteredExpenses : filteredExpenses.slice(0, 10);
  
  // Virtual scrolling for large lists (only when showing all expenses)
  const virtualizer = useVirtualizer({
    count: displayedExpenses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height of collapsed expense card
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  // Use virtual scrolling for large lists (100+ items), otherwise use regular rendering for animations
  const useVirtualScroll = showAllExpenses && displayedExpenses.length > 50;

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

  return (
    <div
      ref={parentRef}
      className={useVirtualScroll ? 'h-[calc(100vh-280px)] overflow-auto' : 'space-y-3'}
      style={useVirtualScroll ? { contain: 'strict' } : undefined}
    >
      {useVirtualScroll ? (
        // Virtual scrolling mode (for 50+ items)
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const expense = displayedExpenses[virtualItem.index];
            if (!expense) return null;
            return (
              <div
                key={expense.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="pb-3">
                  <ExpandableExpenseCard
                    expense={expense}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onUpdate={onUpdate}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Regular mode with animations (for <50 items)
        <AnimatePresence mode="popLayout">
          {displayedExpenses.map((expense, index) => (
            <motion.div
              key={expense.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
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
      )}
    </div>
  );
}
