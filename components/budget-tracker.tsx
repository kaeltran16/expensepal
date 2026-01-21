'use client'

import { Button } from '@/components/ui/button'
import { useBudgets, useCategories } from '@/lib/hooks'
import { AddCategoryDialog } from '@/components/add-category-dialog'
import { SetBudgetDialog } from '@/components/set-budget-dialog'
import type { Expense } from '@/lib/supabase'
import { formatCurrency, hapticFeedback } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Edit2, Target } from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'

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
  initialEditCategory?: string
  initialEditValue?: number
}

export function BudgetTracker({ expenses, initialEditCategory, initialEditValue }: BudgetTrackerProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Fetch budgets using TanStack Query
  const { data: budgets = [], isLoading: loading } = useBudgets({ month: currentMonth })

  // Fetch categories (default + custom)
  const { data: categoriesData } = useCategories()

  // Combine default categories with custom ones
  const allCategories = useMemo(() => {
    if (!categoriesData) return CATEGORIES
    return categoriesData.map((c) => c.name)
  }, [categoriesData])

  const getCategoryEmoji = (categoryName: string) => {
    if (CATEGORY_EMOJI[categoryName]) return CATEGORY_EMOJI[categoryName]
    const customCat = categoriesData?.find((c) => c.name === categoryName)
    return customCat?.icon || '📦'
  }

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [dialogSuggestedAmount, setDialogSuggestedAmount] = useState<number | undefined>(undefined)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Open dialog if initialEditCategory is provided
  useEffect(() => {
    if (initialEditCategory && initialEditValue !== undefined) {
      setSelectedCategory(initialEditCategory)
      setDialogSuggestedAmount(initialEditValue)
      setDialogOpen(true)

      // Scroll to the category after a short delay to ensure rendering
      setTimeout(() => {
        categoryRefs.current[initialEditCategory]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }
  }, [initialEditCategory, initialEditValue])

  const openBudgetDialog = (category: string, suggestedAmount?: number) => {
    hapticFeedback('light')
    setSelectedCategory(category)
    setDialogSuggestedAmount(suggestedAmount)
    setDialogOpen(true)
  }

  const getCategorySpent = (category: string) => {
    const monthExpenses = expenses.filter((e) => {
      const expenseMonth = new Date(e.transaction_date).toISOString().slice(0, 7)
      return expenseMonth === currentMonth && e.category === category
    })
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  }

  const getBudgetForCategory = (category: string) => {
    const budget = budgets.find((b) => b.category === category)
    return budget ? budget.amount : null
  }

  const getStatus = (spent: number, budget: number | null) => {
    if (budget === null || budget === 0) return 'none'
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
          <AddCategoryDialog />
        </div>
      </div>

      {/* Budget List */}
      <div className="ios-list-group">
        {allCategories.map((category, index) => {
          const budget = getBudgetForCategory(category)
          const spent = getCategorySpent(category)
          const percentage = budget !== null && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
          const status = getStatus(spent, budget)

          return (
            <motion.div
              key={category}
              ref={(el) => { categoryRefs.current[category] = el }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="ios-list-item"
              data-testid="budget-card"
            >
              <div className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Emoji Icon */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                      {getCategoryEmoji(category)}
                    </div>

                    {/* Category Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ios-headline">{category}</span>
                        {budget !== null && budget > 0 && (
                          <>
                            {status === 'good' && (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            {status === 'warning' && (
                              <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                            {status === 'exceeded' && (
                              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" data-testid="over-budget-warning" />
                            )}
                          </>
                        )}
                      </div>
                      <p className="ios-caption text-muted-foreground">
                        {budget !== null && budget > 0 ? (
                          <>
                            {formatCurrency(spent, 'VND')} of {formatCurrency(budget, 'VND')}
                          </>
                        ) : (
                          <>
                            {formatCurrency(spent, 'VND')} spent • No budget set
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Set/Edit Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openBudgetDialog(category)}
                    className="h-9 px-3 ios-touch bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                    data-testid="set-budget-btn"
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" />
                    <span className="text-sm font-medium">
                      {budget !== null && budget > 0 ? 'Edit' : 'Set'}
                    </span>
                  </Button>
                </div>

                {/* Progress Bar */}
                {budget !== null && budget > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="ios-caption text-muted-foreground" data-testid="budget-progress">
                        {percentage.toFixed(0)}%
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

      {/* Budget Dialog */}
      {selectedCategory && (
        <SetBudgetDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          category={selectedCategory}
          categoryIcon={getCategoryEmoji(selectedCategory)}
          suggestedAmount={dialogSuggestedAmount}
          currentSpent={getCategorySpent(selectedCategory)}
        />
      )}
    </div>
  )
}
