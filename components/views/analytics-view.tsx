'use client'

import { AnalyticsCharts } from '@/components/analytics-charts';
import { ChartSkeleton } from '@/components/skeleton-loader';
import type { Expense } from '@/lib/supabase';

interface AnalyticsViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function AnalyticsView({ expenses, loading }: AnalyticsViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return <AnalyticsCharts expenses={expenses} />;
}
