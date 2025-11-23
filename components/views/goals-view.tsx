'use client'

import { SavingsGoals } from '@/components/savings-goals';
import { InsightCardSkeleton } from '@/components/skeleton-loader';

interface GoalsViewProps {
  loading: boolean;
}

export function GoalsView({ loading }: GoalsViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
    );
  }

  return <SavingsGoals />;
}
