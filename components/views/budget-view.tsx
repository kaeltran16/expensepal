'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Repeat } from 'lucide-react'
import { BudgetTracker } from '@/components/budget-tracker';
import { BudgetPredictionsPanel } from '@/components/budget-predictions-panel';
import { BudgetCardSkeleton } from '@/components/skeleton-loader';
import { detectRecurringExpenses } from '@/lib/analytics/detect-recurring'
import type { Expense } from '@/lib/supabase';

interface BudgetViewProps {
  expenses: Expense[];
  loading: boolean;
}

export function BudgetView({ expenses, loading }: BudgetViewProps) {
  const [activeTab, setActiveTab] = useState<'budgets' | 'recurring'>('budgets')

  const recurringExpenses = useMemo(() => {
    return detectRecurringExpenses(expenses)
  }, [expenses])

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
  const totalMonthlyRecurring = recurringExpenses
    .filter(r => r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.averageAmount, 0)

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
            <BudgetPredictionsPanel />

            {/* Budget Tracker */}
            <BudgetTracker expenses={expenses} />
          </div>
        ) : (
          <RecurringExpensesSection expenses={expenses} />
        )}
      </motion.div>
    </div>
  );
}

// Compact recurring expenses section
function RecurringExpensesSection({ expenses }: { expenses: Expense[] }) {
  const recurringExpenses = useMemo(() => {
    return detectRecurringExpenses(expenses)
  }, [expenses])

  const stats = useMemo(() => {
    const totalMonthly = recurringExpenses
      .filter(r => r.frequency === 'monthly')
      .reduce((sum, r) => sum + r.averageAmount, 0)
    const totalYearly = recurringExpenses.reduce((sum, r) => sum + r.totalSpentThisYear, 0)
    const missedPayments = recurringExpenses.filter(r => r.missedPayment).length
    return { totalMonthly, totalYearly, missedPayments }
  }, [recurringExpenses])

  if (recurringExpenses.length === 0) {
    return (
      <div className="ios-card p-8 text-center">
        <div className="text-5xl mb-3">🔄</div>
        <h3 className="ios-headline mb-1">No Recurring Expenses</h3>
        <p className="ios-caption text-muted-foreground">
          Add more expenses to detect subscriptions
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="ios-card p-4">
          <p className="ios-caption text-muted-foreground mb-1">Monthly</p>
          <p className="text-xl font-semibold">₫{(stats.totalMonthly / 1000).toFixed(0)}k</p>
        </div>
        <div className="ios-card p-4">
          <p className="ios-caption text-muted-foreground mb-1">This Year</p>
          <p className="text-xl font-semibold">₫{(stats.totalYearly / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* Compact List */}
      <div className="ios-list-group">
        {recurringExpenses.map((recurring, index) => {
          const nextDate = new Date(recurring.nextExpected)
          const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

          return (
            <motion.div
              key={recurring.merchant}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`ios-list-item ${recurring.missedPayment ? 'border-l-2 border-l-destructive' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="ios-headline truncate">{recurring.merchant}</h4>
                  <p className="ios-caption text-muted-foreground">
                    {recurring.frequency} • {recurring.missedPayment ? (
                      <span className="text-destructive">Overdue</span>
                    ) : daysUntil <= 7 ? (
                      <span className="text-orange-500">Due in {daysUntil}d</span>
                    ) : (
                      nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold">₫{(recurring.averageAmount / 1000).toFixed(0)}k</p>
                  <p className="ios-caption text-muted-foreground">{recurring.confidence}%</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
