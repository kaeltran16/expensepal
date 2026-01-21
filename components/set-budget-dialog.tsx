'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBudgets, useCreateBudget, useUpdateBudget } from '@/lib/hooks'
import { formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SetBudgetDialogProps {
  isOpen: boolean
  onClose: () => void
  category: string
  categoryIcon?: string
  suggestedAmount?: number
  currentSpent?: number
}

export function SetBudgetDialog({
  isOpen,
  onClose,
  category,
  categoryIcon = '📦',
  suggestedAmount,
  currentSpent = 0,
}: SetBudgetDialogProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: budgets = [] } = useBudgets({ month: currentMonth })
  const createBudgetMutation = useCreateBudget()
  const updateBudgetMutation = useUpdateBudget()

  const existingBudget = budgets.find((b) => b.category === category)
  const [amount, setAmount] = useState('')

  // Initialize amount when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (suggestedAmount) {
        setAmount(suggestedAmount.toString())
      } else if (existingBudget) {
        setAmount(existingBudget.amount.toString())
      } else {
        setAmount('')
      }
    }
  }, [isOpen, suggestedAmount, existingBudget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return
    }

    try {
      if (existingBudget) {
        await updateBudgetMutation.mutateAsync({
          id: existingBudget.id,
          updates: { amount: numericAmount },
        })
      } else {
        await createBudgetMutation.mutateAsync({
          category,
          amount: numericAmount,
          month: currentMonth,
        })
      }
      onClose()
    } catch (error) {
      console.error('Error saving budget:', error)
    }
  }

  const isLoading = createBudgetMutation.isPending || updateBudgetMutation.isPending
  const numericAmount = parseFloat(amount)
  const isValid = !isNaN(numericAmount) && numericAmount > 0
  const willExceed = isValid && numericAmount < currentSpent

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />

          {/* Dialog */}
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none"
            onClick={onClose}
          >
            <motion.div
              data-testid="budget-dialog"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[calc(100vh-80px)] sm:max-h-[85vh] flex flex-col pointer-events-auto sm:mb-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                      {categoryIcon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{existingBudget ? 'Update' : 'Set'} Budget</h2>
                      <p className="text-sm text-muted-foreground">{category}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Current Spending Info */}
                {currentSpent > 0 && (
                  <div className="ios-card p-4 bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Current Spending</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(currentSpent, 'VND')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Spent this month
                    </p>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="budget-amount" className="text-sm font-medium">
                    Monthly Budget Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="budget-amount"
                      type="number"
                      inputMode="numeric"
                      step="1000"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-3xl font-bold h-16 pr-12 text-right"
                      required
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">
                      ₫
                    </span>
                  </div>

                  {/* Quick amount suggestions */}
                  {suggestedAmount && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground mr-1">Quick:</span>
                      {[
                        suggestedAmount * 0.8,
                        suggestedAmount,
                        suggestedAmount * 1.2,
                      ].map((quickAmount) => (
                        <button
                          key={quickAmount}
                          type="button"
                          onClick={() => setAmount(Math.round(quickAmount).toString())}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          ₫{(Math.round(quickAmount) / 1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Warning if budget is less than current spending */}
                {willExceed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="ios-card p-3 bg-yellow-500/10 border border-yellow-500/20"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                          Budget Below Current Spending
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          You've already spent {formatCurrency(currentSpent, 'VND')} this month.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Preview */}
                {isValid && !willExceed && (
                  <div className="ios-card p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining Budget</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(numericAmount - currentSpent, 'VND')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Usage</p>
                        <p className="text-xl font-bold">
                          {currentSpent > 0 ? ((currentSpent / numericAmount) * 100).toFixed(0) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {/* Action Footer */}
                <div className="border-t bg-background p-4 sm:p-6 flex-shrink-0">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 h-12 sm:h-14 text-base font-medium"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isValid || isLoading}
                      className="flex-1 h-12 sm:h-14 text-base font-bold shadow-lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : existingBudget ? (
                        '✓ Update Budget'
                      ) : (
                        '✓ Set Budget'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
