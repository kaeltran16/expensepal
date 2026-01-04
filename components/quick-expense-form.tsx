'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { springs, variants } from '@/lib/animation-config'
import type { Expense } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Plus, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useCategories } from '@/lib/hooks'

interface ExpenseFormData {
  amount: number
  merchant: string
  category: string
  notes: string
  transactionDate: string
  transactionType: string
  currency: string
  source: string
}

interface QuickExpenseFormProps {
  expense?: Expense
  onSubmit: (data: ExpenseFormData) => Promise<void>
  onCancel?: () => void
}

// Top 5 most common categories to show by default
const COMMON_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Other']

export function QuickExpenseForm({ expense, onSubmit, onCancel }: QuickExpenseFormProps) {
  const { data: categories = [] } = useCategories()

  const [loading, setLoading] = useState(false)
  const [dateOption, setDateOption] = useState<'today' | 'yesterday'>('today')
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(!!expense?.notes)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [formData, setFormData] = useState({
    amount: expense?.amount?.toString() || '',
    merchant: expense?.merchant || '',
    category: expense?.category || '',
    notes: expense?.notes || '',
  })

  // Fetch category suggestion when merchant changes
  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!formData.merchant || formData.merchant.length < 3) {
        setSuggestedCategory(null)
        return
      }

      try {
        const response = await fetch(
          `/api/merchants/suggest-category?merchant=${encodeURIComponent(formData.merchant)}`
        )
        const data = await response.json()

        if (data.suggestion && !formData.category) {
          setSuggestedCategory(data.suggestion)
          // Auto-apply suggestion if no category selected yet
          setFormData(prev => ({ ...prev, category: data.suggestion }))
        } else if (data.suggestion) {
          setSuggestedCategory(data.suggestion)
        } else {
          setSuggestedCategory(null)
        }
      } catch (error) {
        console.error('Error fetching suggestion:', error)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestion, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.merchant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const now = new Date()
      const submitDate = new Date()

      if (dateOption === 'yesterday') {
        // Set to yesterday
        submitDate.setDate(now.getDate() - 1)
      }
      // 'today' is already set by default

      // Use current time
      submitDate.setHours(now.getHours(), now.getMinutes(), 0, 0)

      await onSubmit({
        amount: parseFloat(formData.amount),
        merchant: formData.merchant,
        category: formData.category || 'Other',
        notes: formData.notes,
        transactionDate: submitDate.toISOString(),
        transactionType: 'Expense',
        currency: 'VND',
        source: 'manual',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      {...variants.fade}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onCancel}
    >
      <motion.div
        {...variants.bottomSheet}
        transition={springs.gentle}
        className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto will-animate"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 pb-8">
          {/* Amount - Big and prominent */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm text-muted-foreground">
              Amount
            </Label>
            <div className="relative">
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                step="1000"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="text-4xl font-bold h-20 pr-16 text-right"
                required
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                ₫
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="merchant" className="text-sm text-muted-foreground">
              What did you buy?
            </Label>
            <Input
              id="merchant"
              name="merchant"
              placeholder="e.g., Lunch, Coffee, Groceries"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
              className="text-lg h-12"
              required
            />
          </div>

          {/* Category Pills - Compact */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Category</Label>
              {suggestedCategory && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {suggestedCategory}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((cat) =>
                  showAllCategories ||
                  COMMON_CATEGORIES.includes(cat.name) ||
                  cat.name === formData.category ||
                  cat.name === suggestedCategory
                )
                .map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.name })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all relative ${
                      formData.category === cat.name
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.name}
                    {suggestedCategory === cat.name && formData.category !== cat.name && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}
                  </button>
                ))}
              {!showAllCategories && categories.length > COMMON_CATEGORIES.length && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-secondary/50 hover:bg-secondary transition-all"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  More
                </button>
              )}
            </div>
          </div>

          {/* Date - Compact */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Date</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDateOption('today')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateOption === 'today'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateOption('yesterday')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateOption === 'yesterday'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                Yesterday
              </button>
            </div>
          </div>

          {/* Notes - Collapsible */}
          <AnimatePresence mode="wait">
            {!showNotes ? (
              <motion.div
                key="notes-button"
                {...variants.fade}
                transition={springs.default}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotes(true)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  <StickyNote className="h-4 w-4 mr-2" />
                  Add note (optional)
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="notes-field"
                {...variants.slideUp}
                transition={springs.default}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes" className="text-sm text-muted-foreground">
                    Notes
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotes(false)
                      setFormData({ ...formData, notes: '' })
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Add details about this expense..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="resize-none"
                  rows={2}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-12 text-base"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 text-base font-semibold"
            >
              {loading ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
