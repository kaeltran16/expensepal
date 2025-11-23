'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useBudgets } from '@/lib/hooks'
import type { Expense } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, X } from 'lucide-react'
import { useMemo, useState } from 'react'

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Bills: '💡',
  Health: '🏥',
  Other: '📦',
}

interface BudgetAlert {
  category: string
  spent: number
  budget: number
  percentage: number
  severity: 'warning' | 'critical'
}

interface BudgetAlertsProps {
  expenses: Expense[]
}

export function BudgetAlerts({ expenses }: BudgetAlertsProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: budgets = [], isLoading } = useBudgets({ month: currentMonth })
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const alerts: BudgetAlert[] = useMemo(() => {
    if (isLoading || budgets.length === 0) return []

    const categorySpending: Record<string, number> = {}

    // Calculate spending per category for current month
    expenses.forEach((expense) => {
      const expenseMonth = new Date(expense.transaction_date)
        .toISOString()
        .slice(0, 7)
      if (expenseMonth === currentMonth) {
        categorySpending[expense.category || 'Other'] =
          (categorySpending[expense.category || 'Other'] || 0) + expense.amount
      }
    })

    // Generate alerts for categories with budgets
    const generatedAlerts: BudgetAlert[] = []

    budgets.forEach((budget) => {
      const spent = categorySpending[budget.category] || 0
      const percentage = (spent / budget.amount) * 100

      // Only show alerts for budgets at 80% or above
      if (percentage >= 80) {
        generatedAlerts.push({
          category: budget.category,
          spent,
          budget: budget.amount,
          percentage,
          severity: percentage >= 100 ? 'critical' : 'warning',
        })
      }
    })

    // Sort by severity (critical first) and then by percentage (highest first)
    return generatedAlerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1
      }
      return b.percentage - a.percentage
    })
  }, [budgets, expenses, currentMonth, isLoading])

  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => !dismissedAlerts.has(alert.category))
  }, [alerts, dismissedAlerts])

  const handleDismiss = (category: string) => {
    setDismissedAlerts((prev) => new Set([...prev, category]))
  }

  if (isLoading || visibleAlerts.length === 0) return null

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert, index) => {
          const Icon = alert.severity === 'critical' ? AlertTriangle : AlertCircle
          const colorClass =
            alert.severity === 'critical'
              ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
          const iconColor =
            alert.severity === 'critical'
              ? 'text-red-600 dark:text-red-400'
              : 'text-yellow-600 dark:text-yellow-400'
          const remaining = alert.budget - alert.spent

          return (
            <motion.div
              key={alert.category}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.95 }}
              transition={{
                delay: index * 0.05,
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Card className={`frosted-card border-l-4 ${colorClass} relative`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CATEGORY_EMOJI[alert.category]}</span>
                          <h3 className="font-semibold text-sm">
                            {alert.severity === 'critical'
                              ? 'Budget Exceeded!'
                              : 'Budget Warning'}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismiss(alert.category)}
                          className="h-6 w-6 p-0 hover:bg-background/50 -mt-1 -mr-2"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Dismiss alert</span>
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-semibold text-foreground">
                          {alert.category}
                        </span>{' '}
                        {alert.severity === 'critical' ? (
                          <>
                            budget exceeded by{' '}
                            <span className="font-semibold text-destructive">
                              {formatCurrency(Math.abs(remaining), 'VND')}
                            </span>
                          </>
                        ) : (
                          <>
                            is at{' '}
                            <span className="font-semibold">
                              {alert.percentage.toFixed(0)}%
                            </span>{' '}
                            of budget
                          </>
                        )}
                      </p>

                      {/* Progress summary */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatCurrency(alert.spent, 'VND')} /{' '}
                          {formatCurrency(alert.budget, 'VND')}
                        </span>
                        {alert.severity === 'warning' && remaining > 0 && (
                          <span className="text-muted-foreground">
                            {formatCurrency(remaining, 'VND')} left
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(alert.percentage, 100)}%` }}
                          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                          className={`h-full rounded-full ${
                            alert.severity === 'critical'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
