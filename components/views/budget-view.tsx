'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Repeat } from 'lucide-react'
import { BudgetTracker } from '@/components/budget-tracker';
import { BudgetPredictionsPanel } from '@/components/budget-predictions-panel';
import { BudgetCardSkeleton } from '@/components/skeleton-loader';
import { RecurringView } from '@/components/views/recurring-view';
import { detectRecurringExpenses } from '@/lib/analytics/detect-recurring'
import type { Expense } from '@/lib/supabase';

interface BudgetViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function BudgetView({ expenses, loading }: BudgetViewProps) {
  const [activeTab, setActiveTab] = useState<'budgets' | 'recurring'>('budgets')
  const [editBudgetCategory, setEditBudgetCategory] = useState<string | undefined>(undefined)
  const [editBudgetValue, setEditBudgetValue] = useState<number | undefined>(undefined)

  const recurringExpenses = useMemo(() => {
    return detectRecurringExpenses(expenses)
  }, [expenses])

  const handleSetBudget = (category: string, suggestedAmount: number) => {
    // Switch to budgets tab if not already there
    setActiveTab('budgets')

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

  const recurringCount = recurringExpenses.length

  return (
    <div className="space-y-4 pb-24">
      {/* Tab Switcher */}
      <div className="ios-card p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all ${
            activeTab === 'budgets'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="h-4 w-4" />
          <span className="font-medium">Budgets</span>
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all relative ${
            activeTab === 'recurring'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Repeat className="h-4 w-4" />
          <span className="font-medium">Recurring</span>
          {recurringCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'recurring'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-primary/10 text-primary'
            }`}>
              {recurringCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: activeTab === 'budgets' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'budgets' ? (
          <div className="space-y-4">
            {/* Smart Predictions & Alerts */}
            <BudgetPredictionsPanel onSetBudget={handleSetBudget} />

            {/* Budget Tracker */}
            <BudgetTracker
              expenses={expenses}
              initialEditCategory={editBudgetCategory}
              initialEditValue={editBudgetValue}
            />
          </div>
        ) : (
          <RecurringView expenses={expenses} />
        )}
      </motion.div>
    </div>
  );
}

