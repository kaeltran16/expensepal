'use client'

import { BudgetTracker } from '@/components/budget-tracker';
import { BudgetCardSkeleton } from '@/components/skeleton-loader';
import type { Expense } from '@/lib/supabase';

interface BudgetViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function BudgetView({ expenses, loading }: BudgetViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <BudgetCardSkeleton />
        <BudgetCardSkeleton />
        <BudgetCardSkeleton />
        <BudgetCardSkeleton />
      </div>
    );
  }

  return <BudgetTracker expenses={expenses} />;
}
