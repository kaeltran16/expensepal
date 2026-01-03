'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Repeat, AlertCircle, CheckCircle, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { detectRecurringExpenses, type RecurringExpense } from '@/lib/analytics/detect-recurring'
import type { Expense } from '@/lib/supabase'

interface RecurringViewProps {
  expenses: Expense[]
}

const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

const FREQUENCY_COLORS = {
  weekly: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  biweekly: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  monthly: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  quarterly: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
}

export function RecurringView({ expenses }: RecurringViewProps) {
  const recurringExpenses = useMemo(() => {
    return detectRecurringExpenses(expenses)
  }, [expenses])

  const stats = useMemo(() => {
    const totalMonthly = recurringExpenses
      .filter(r => r.frequency === 'monthly')
      .reduce((sum, r) => sum + r.averageAmount, 0)

    const totalYearly = recurringExpenses.reduce((sum, r) => sum + r.totalSpentThisYear, 0)

    const highConfidence = recurringExpenses.filter(r => r.confidence >= 80).length
    const missedPayments = recurringExpenses.filter(r => r.missedPayment).length

    return { totalMonthly, totalYearly, highConfidence, missedPayments }
  }, [recurringExpenses])

  if (recurringExpenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-6xl mb-4"
        >
          🔄
        </motion.div>
        <h3 className="ios-headline mb-2">No Recurring Expenses Detected</h3>
        <p className="ios-caption text-muted-foreground">
          Add more expenses to detect recurring patterns like subscriptions and bills
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Summary Card */}
      <div className="ios-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="ios-headline">Recurring Expenses</h3>
            <p className="ios-caption text-muted-foreground">
              {recurringExpenses.length} subscriptions detected
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="ios-caption text-muted-foreground mb-1">Monthly Total</p>
            <p className="ios-headline">{formatCurrency(stats.totalMonthly, 'VND')}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="ios-caption text-muted-foreground mb-1">Yearly Total</p>
            <p className="ios-headline">{formatCurrency(stats.totalYearly, 'VND')}</p>
          </div>
        </div>

        {stats.missedPayments > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="ios-caption text-destructive">
              {stats.missedPayments} subscription{stats.missedPayments > 1 ? 's' : ''} may be overdue
            </p>
          </motion.div>
        )}
      </div>

      {/* Recurring Expenses List */}
      <div className="ios-list-group">
        {recurringExpenses.map((recurring, index) => (
          <RecurringExpenseCard key={recurring.merchant} recurring={recurring} index={index} />
        ))}
      </div>
    </div>
  )
}

interface RecurringExpenseCardProps {
  recurring: RecurringExpense
  index: number
}

function RecurringExpenseCard({ recurring, index }: RecurringExpenseCardProps) {
  const nextDate = new Date(recurring.nextExpected)
  const isOverdue = recurring.missedPayment
  const daysUntilNext = Math.ceil(
    (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={`ios-list-item ${isOverdue ? 'border-l-4 border-l-destructive' : ''}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="ios-headline truncate">{recurring.merchant}</h4>
              {recurring.confidence >= 80 && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {isOverdue && (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
            </div>
            <p className="ios-caption text-muted-foreground">{recurring.category}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="ios-headline">{formatCurrency(recurring.averageAmount, 'VND')}</p>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                FREQUENCY_COLORS[recurring.frequency]
              }`}
            >
              {FREQUENCY_LABELS[recurring.frequency]}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="ios-caption text-muted-foreground">
              {isOverdue ? (
                <span className="text-destructive">Overdue</span>
              ) : daysUntilNext <= 7 ? (
                <span className="text-orange-500">
                  Due in {daysUntilNext} day{daysUntilNext !== 1 ? 's' : ''}
                </span>
              ) : (
                nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="ios-caption text-muted-foreground">
              {formatCurrency(recurring.totalSpentThisYear, 'VND')} this year
            </span>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="ios-caption text-muted-foreground">
              Confidence: {recurring.confidence}%
            </span>
            <span className="ios-caption text-muted-foreground">
              {recurring.transactions.length} transactions
            </span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${recurring.confidence}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className={`h-full rounded-full ${
                recurring.confidence >= 80
                  ? 'bg-green-500'
                  : recurring.confidence >= 60
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
