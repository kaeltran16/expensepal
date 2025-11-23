'use client'

import { ChartSkeleton, InsightCardSkeleton } from '@/components/skeleton-loader';
import { WeeklySummary } from '@/components/weekly-summary';
import type { Expense } from '@/lib/supabase';

interface SummaryViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function SummaryView({ expenses, loading }: SummaryViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <InsightCardSkeleton />
      </div>
    );
  }

  return <WeeklySummary expenses={expenses} />;
}
