'use client'

import { ExpandableExpenseCard } from '@/components/expandable-expense-card';
import { ExpenseCardSkeleton } from '@/components/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { springs, variants, getStaggerDelay } from '@/lib/animation-config';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import { useMemo, useRef } from 'react';

type ListItem =
  | { type: 'header'; label: string; key: string }
  | { type: 'expense'; expense: Expense }

function getDateGroupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  // Same week (Sun-Sat): check if target is in the current week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  if (target >= startOfWeek && diffDays < 7) {
    return target.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Older: "Month Day"
  return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {label}
      </p>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

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

  // Group expenses by date
  const groupedItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let lastLabel = '';

    for (const expense of displayedExpenses) {
      const label = getDateGroupLabel(new Date(expense.transaction_date));
      if (label !== lastLabel) {
        items.push({ type: 'header', label, key: `header-${label}` });
        lastLabel = label;
      }
      items.push({ type: 'expense', expense });
    }

    return items;
  }, [displayedExpenses]);

  // Virtual scrolling for large lists (only when showing all expenses)
  const virtualizer = useVirtualizer({
    count: groupedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = groupedItems[index];
      return item?.type === 'header' ? 40 : 120;
    },
    overscan: 5,
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
        data-testid="empty-expenses"
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
      data-testid="expense-list"
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
            const item = groupedItems[virtualItem.index];
            if (!item) return null;

            return (
              <div
                key={item.type === 'header' ? item.key : item.expense.id}
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
                {item.type === 'header' ? (
                  <DateGroupHeader label={item.label} />
                ) : (
                  <div className="pb-3">
                    <ExpandableExpenseCard
                      expense={item.expense}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onUpdate={onUpdate}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Regular mode with animations (for <50 items)
        <AnimatePresence mode="popLayout">
          {groupedItems.map((item, index) =>
            item.type === 'header' ? (
              <motion.div
                key={item.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: getStaggerDelay(index) }}
              >
                <DateGroupHeader label={item.label} />
              </motion.div>
            ) : (
              <motion.div
                key={item.expense.id}
                {...variants.listItem}
                transition={{
                  ...springs.default,
                  delay: getStaggerDelay(index),
                }}
                className="will-animate-all"
              >
                <ExpandableExpenseCard
                  expense={item.expense}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
