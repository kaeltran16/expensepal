'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, hapticFeedback } from '@/lib/utils'
import { AlertCircle, CheckCircle, Edit2, Save, X, Target } from 'lucide-react'
import type { Expense } from '@/lib/supabase'
import { useBudgets, useCreateBudget, useUpdateBudget } from '@/lib/hooks'
import { motion } from 'framer-motion'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Other']

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Bills: '💡',
  Health: '🏥',
  Other: '📦',
}

interface BudgetTrackerProps {
  expenses: Expense[]
}

export function BudgetTracker({ expenses }: BudgetTrackerProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Fetch budgets using TanStack Query
  const { data: budgets = [], isLoading: loading } = useBudgets({ month: currentMonth })

  // Mutation hooks
  const createBudgetMutation = useCreateBudget()
  const updateBudgetMutation = useUpdateBudget()

  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const saveBudget = async (category: string, amount: number) => {
    try {
      const existing = budgets.find((b) => b.category === category)

      if (existing) {
        await updateBudgetMutation.mutateAsync({
          id: existing.id,
          updates: { amount },
        })
      } else {
        await createBudgetMutation.mutateAsync({
          category,
          amount,
          month: currentMonth,
        })
      }

      setEditing(null)
    } catch (error) {
      console.error('Error saving budget:', error)
    }
  }

  const getCategorySpent = (category: string) => {
    const monthExpenses = expenses.filter((e) => {
      const expenseMonth = new Date(e.transaction_date).toISOString().slice(0, 7)
      return expenseMonth === currentMonth && e.category === category
    })
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  }

  const getBudgetForCategory = (category: string) => {
    return budgets.find((b) => b.category === category)?.amount || 0
  }

  const getStatus = (spent: number, budget: number) => {
    if (budget === 0) return 'none'
    const percentage = (spent / budget) * 100
    if (percentage >= 100) return 'exceeded'
    if (percentage >= 80) return 'warning'
    return 'good'
  }

  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="ios-caption text-muted-foreground">Loading budgets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="ios-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="ios-headline">Monthly Budget</h3>
              <p className="ios-caption text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="ios-list-group">
        {CATEGORIES.map((category, index) => {
          const budget = getBudgetForCategory(category)
          const spent = getCategorySpent(category)
          const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
          const status = getStatus(spent, budget)
          const isEditing = editing === category

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="ios-list-item"
            >
              <div className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Emoji Icon */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                      {CATEGORY_EMOJI[category]}
                    </div>

                    {/* Category Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ios-headline">{category}</span>
                        {budget > 0 && (
                          <>
                            {status === 'good' && (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            {status === 'warning' && (
                              <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                            {status === 'exceeded' && (
                              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                          </>
                        )}
                      </div>
                      <p className="ios-caption text-muted-foreground">
                        {formatCurrency(spent, 'VND')} spent
                        {budget > 0 && ` of ${formatCurrency(budget, 'VND')}`}
                      </p>
                    </div>
                  </div>

                  {/* Edit Button or Input */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-9 text-sm ios-body"
                        placeholder="0"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          hapticFeedback('medium')
                          saveBudget(category, parseFloat(editValue))
                        }}
                        disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending}
                        className="h-9 w-9 p-0 ios-touch"
                      >
                        <Save className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          hapticFeedback('light')
                          setEditing(null)
                        }}
                        className="h-9 w-9 p-0 ios-touch"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        hapticFeedback('light')
                        setEditing(category)
                        setEditValue(budget.toString())
                      }}
                      className="h-9 px-3 ios-touch text-primary"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {budget > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="ios-caption text-muted-foreground">
                        {percentage.toFixed(0)}% used
                      </span>
                      <span className="ios-caption text-muted-foreground">
                        {formatCurrency(Math.max(0, budget - spent), 'VND')} left
                      </span>
                    </div>
                    {/* iOS-style Progress Bar */}
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        className={`h-full rounded-full ${
                          status === 'exceeded'
                            ? 'bg-destructive'
                            : status === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
