'use client'

import { CategoryInsights } from '@/components/category-insights';
import { InsightsCards } from '@/components/insights-cards';
import { SpendingAdvisor } from '@/components/spending-advisor';
import { InsightCardSkeleton } from '@/components/skeleton-loader';
import type { Expense } from '@/lib/supabase';

interface InsightsViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function InsightsView({ expenses, loading }: InsightsViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <InsightCardSkeleton />
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InsightsCards expenses={expenses} />
      <SpendingAdvisor expenses={expenses} />
      <CategoryInsights expenses={expenses} />
    </div>
  );
}
