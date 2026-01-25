'use client'

import { useState } from 'react'
import { BudgetTracker } from '@/components/budget-tracker';
import { BudgetPredictionsPanel } from '@/components/budget-predictions-panel';
import { AIBudgetRecommendationsPanel } from '@/components/ai-budget-recommendations-panel';
import { BudgetCardSkeleton } from '@/components/skeleton-loader';
import type { Expense } from '@/lib/supabase';

interface BudgetViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function BudgetView({ expenses, loading }: BudgetViewProps) {
  const [editBudgetCategory, setEditBudgetCategory] = useState<string | undefined>(undefined)
  const [editBudgetValue, setEditBudgetValue] = useState<number | undefined>(undefined)

  const handleSetBudget = (category: string, suggestedAmount: number) => {
    // Set the edit state
    setEditBudgetCategory(category)
    setEditBudgetValue(suggestedAmount)

    // Clear after a short delay to allow the effect to trigger
    setTimeout(() => {
      setEditBudgetCategory(undefined)
      setEditBudgetValue(undefined)
    }, 500)
  }

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

  return (
    <div className="space-y-4" data-testid="budget-tracker">
      {/* AI Budget Recommendations */}
      <AIBudgetRecommendationsPanel onSetBudget={handleSetBudget} />

      {/* Smart Predictions & Alerts */}
      <BudgetPredictionsPanel onSetBudget={handleSetBudget} />

      {/* Budget Tracker */}
      <BudgetTracker
        expenses={expenses}
        initialEditCategory={editBudgetCategory}
        initialEditValue={editBudgetValue}
      />
    </div>
  );
}
