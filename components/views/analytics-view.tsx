'use client'

import { AnalyticsCharts } from '@/components/analytics-charts';
import { CategoryInsights } from '@/components/category-insights';
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

  return (
    <div className="space-y-4 pb-24">
      <AnalyticsCharts expenses={expenses} />
      <CategoryInsights expenses={expenses} />
    </div>
  );
}
