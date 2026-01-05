'use client'

import { RecurringExpenseForm } from '@/components/recurring-expenses/recurring-expense-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  useDeleteRecurringExpense,
  useDetectedRecurringExpenses,
  useRecurringExpenses,
  useSaveDetectedExpenses,
  useSkipRecurringExpenseDate
} from '@/lib/hooks/use-recurring-expenses'
import type { RecurringExpense } from '@/lib/supabase'
import type { DetectedRecurringExpense } from '@/lib/analytics/detect-recurring'
import type { Expense } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  DollarSign,
  Edit2,
  Plus,
  Repeat,
  Save,
  SkipForward,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface RecurringViewProps {
  expenses: Expense[]
}

const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
}

const FREQUENCY_COLORS = {
  weekly: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  biweekly: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  monthly: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  quarterly: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  yearly: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300',
  custom: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
}

type TabType = 'active' | 'detected'

export function RecurringView({ expenses }: RecurringViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Fetch saved recurring expenses from database
  const { data: savedRecurring = [], isLoading: loadingSaved } = useRecurringExpenses({
    isActive: true,
  })

  // Detect patterns from transaction history (cached)
  const { data: detectedRecurring = [], isLoading: loadingDetected } =
    useDetectedRecurringExpenses(expenses.length)

  const saveDetectedMutation = useSaveDetectedExpenses()

  const stats = useMemo(() => {
    if (activeTab === 'active') {
      const totalMonthly = savedRecurring
        .filter((r) => r.frequency === 'monthly')
        .reduce((sum, r) => sum + r.amount, 0)

      const totalYearly = savedRecurring.reduce((sum, r) => {
        const amount = r.amount
        switch (r.frequency) {
          case 'weekly':
            return sum + amount * 52
          case 'biweekly':
            return sum + amount * 26
          case 'monthly':
            return sum + amount * 12
          case 'quarterly':
            return sum + amount * 4
          case 'yearly':
            return sum + amount
          default:
            return sum + amount * 12
        }
      }, 0)

      const count = savedRecurring.length
      const highConfidence = savedRecurring.filter(
        (r) => r.is_detected && (r.confidence_score || 0) >= 80
      ).length
      const overdue = savedRecurring.filter((r) => {
        const dueDate = new Date(r.next_due_date)
        return dueDate < new Date()
      }).length

      return { totalMonthly, totalYearly, count, highConfidence, overdue }
    } else {
      const totalMonthly = detectedRecurring
        .filter((r: DetectedRecurringExpense) => r.intervalDays >= 28 && r.intervalDays <= 31)
        .reduce((sum: number, r: DetectedRecurringExpense) => sum + r.averageAmount, 0)

      const totalYearly = detectedRecurring.reduce(
        (sum: number, r: DetectedRecurringExpense) => sum + r.totalSpentThisYear,
        0
      )

      const count = detectedRecurring.length
      const highConfidence = detectedRecurring.filter((r: DetectedRecurringExpense) => r.confidence >= 80).length
      const overdue = detectedRecurring.filter((r: DetectedRecurringExpense) => r.missedPayment).length

      return { totalMonthly, totalYearly, count, highConfidence, overdue }
    }
  }, [savedRecurring, detectedRecurring, activeTab])

  const handleSaveAllDetected = () => {
    if (detectedRecurring.length === 0) return

    saveDetectedMutation.mutate(detectedRecurring)
  }

  const isLoading = activeTab === 'active' ? loadingSaved : loadingDetected

  return (
    <div className="space-y-4 pb-24">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="ios-title">Recurring Expenses</h2>
          <p className="ios-caption text-muted-foreground">
            Manage your subscriptions and recurring payments
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Recurring Expense</DialogTitle>
              <DialogDescription>
                Create a new recurring expense or subscription
              </DialogDescription>
            </DialogHeader>
            <RecurringExpenseForm onSuccess={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="ios-card p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Active ({savedRecurring.length})
          </button>
          <button
            onClick={() => setActiveTab('detected')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'detected'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Detected ({detectedRecurring.length})
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="ios-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="ios-headline">
              {activeTab === 'active' ? 'Your Subscriptions' : 'Detected Patterns'}
            </h3>
            <p className="ios-caption text-muted-foreground">
              {stats.count} {activeTab === 'active' ? 'active' : 'detected'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="ios-caption text-muted-foreground mb-1">Monthly Est.</p>
            <p className="ios-headline">{formatCurrency(stats.totalMonthly, 'VND')}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="ios-caption text-muted-foreground mb-1">Yearly Est.</p>
            <p className="ios-headline">{formatCurrency(stats.totalYearly, 'VND')}</p>
          </div>
        </div>

        {stats.overdue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="ios-caption text-destructive">
              {stats.overdue} {activeTab === 'active' ? 'payment' : 'subscription'}
              {stats.overdue > 1 ? 's' : ''} overdue
            </p>
          </motion.div>
        )}

        {activeTab === 'detected' && detectedRecurring.length > 0 && (
          <Button
            onClick={handleSaveAllDetected}
            disabled={saveDetectedMutation.isPending}
            className="w-full mt-3 gap-2"
            variant="outline"
          >
            <Save className="h-4 w-4" />
            Save All Detected ({detectedRecurring.length})
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'active' ? (
            <ActiveRecurringList key="active" recurring={savedRecurring} />
          ) : (
            <DetectedRecurringList key="detected" recurring={detectedRecurring} />
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

function ActiveRecurringList({ recurring }: { recurring: RecurringExpense[] }) {
  if (recurring.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-6xl mb-4"
        >
          📝
        </motion.div>
        <h3 className="ios-headline mb-2">No Active Subscriptions</h3>
        <p className="ios-caption text-muted-foreground">
          Add recurring expenses manually or save detected patterns
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ios-list-group"
    >
      {recurring.map((item, index) => (
        <ActiveRecurringCard key={item.id} recurring={item} index={index} />
      ))}
    </motion.div>
  )
}

function DetectedRecurringList({ recurring }: { recurring: DetectedRecurringExpense[] }) {
  if (recurring.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-6xl mb-4"
        >
          🔍
        </motion.div>
        <h3 className="ios-headline mb-2">No Patterns Detected</h3>
        <p className="ios-caption text-muted-foreground">
          Add more expenses to detect recurring patterns
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ios-list-group"
    >
      {recurring.map((item, index) => (
        <DetectedRecurringCard key={item.merchant} recurring={item} index={index} />
      ))}
    </motion.div>
  )
}

function ActiveRecurringCard({ recurring, index }: { recurring: RecurringExpense; index: number }) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const deleteMutation = useDeleteRecurringExpense()
  const skipMutation = useSkipRecurringExpenseDate()

  const nextDate = new Date(recurring.next_due_date)
  const isOverdue = nextDate < new Date()
  const daysUntilNext = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const handleDelete = () => {
    if (confirm(`Delete ${recurring.name}?`)) {
      deleteMutation.mutate(recurring.id)
    }
  }

  const handleSkip = () => {
    const dateStr = recurring.next_due_date
    skipMutation.mutate({ id: recurring.id, date: dateStr })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'ios-list-item',
        isOverdue && 'border-l-4 border-l-destructive',
        !recurring.is_active && 'opacity-50'
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="ios-headline truncate">{recurring.name}</h4>
              {recurring.is_detected && recurring.confidence_score && recurring.confidence_score >= 80 && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {isOverdue && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
            </div>
            <p className="ios-caption text-muted-foreground">{recurring.category}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="ios-headline">{formatCurrency(recurring.amount, recurring.currency)}</p>
            <Badge variant="secondary" className={cn('text-xs', FREQUENCY_COLORS[recurring.frequency as keyof typeof FREQUENCY_COLORS])}>
              {FREQUENCY_LABELS[recurring.frequency as keyof typeof FREQUENCY_LABELS]}
            </Badge>
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit {recurring.name}</DialogTitle>
              </DialogHeader>
              <RecurringExpenseForm
                initialData={recurring}
                onSuccess={() => setShowEditDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="outline" className="gap-2" onClick={handleSkip}>
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function DetectedRecurringCard({ recurring, index }: { recurring: DetectedRecurringExpense; index: number }) {
  const saveDetectedMutation = useSaveDetectedExpenses()

  const nextDate = new Date(recurring.nextExpected)
  const isOverdue = recurring.missedPayment
  const daysUntilNext = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const handleSave = () => {
    saveDetectedMutation.mutate([recurring])
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn('ios-list-item', isOverdue && 'border-l-4 border-l-destructive')}
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
              {isOverdue && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
            </div>
            <p className="ios-caption text-muted-foreground">{recurring.category}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="ios-headline">{formatCurrency(recurring.averageAmount, 'VND')}</p>
            <Badge variant="secondary" className={cn('text-xs', FREQUENCY_COLORS[recurring.frequency as keyof typeof FREQUENCY_COLORS])}>
              {FREQUENCY_LABELS[recurring.frequency as keyof typeof FREQUENCY_LABELS]}
            </Badge>
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
              className={cn(
                'h-full rounded-full',
                recurring.confidence >= 80
                  ? 'bg-green-500'
                  : recurring.confidence >= 60
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              )}
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saveDetectedMutation.isPending}
          size="sm"
          variant="outline"
          className="w-full gap-2"
        >
          <Save className="h-3.5 w-3.5" />
          Save to Active
        </Button>
      </div>
    </motion.div>
  )
}
