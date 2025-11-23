'use client'

import { StatsCard } from '@/components/stats-card';
import { StatsCardSkeleton } from '@/components/skeleton-loader';
import { formatCurrency } from '@/lib/utils';
import { Wallet } from 'lucide-react';

interface StatsSectionProps {
  loading: boolean;
  stats?: {
    total: number;
    count: number;
  };
}

export function StatsSection({ loading, stats }: StatsSectionProps) {
  if (loading) {
    return (
      <div className="px-4 mt-4 mb-4">
        <StatsCardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="px-4 mt-4 mb-4">
      <StatsCard
        title="Total Spent"
        value={formatCurrency(stats.total, 'VND')}
        icon={Wallet}
        description={`${stats.count} transactions`}
        index={0}
      />
    </div>
  );
}
