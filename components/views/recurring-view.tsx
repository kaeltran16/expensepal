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
  CreditCard,
  Edit2,
  Plus,
  Repeat,
  Save,
  SkipForward,
  Sparkles,
  TrendingUp,
  Trash2,
  Zap
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
  weekly: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  biweekly: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  monthly: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  quarterly: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  yearly: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  custom: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
}

const CATEGORY_ICONS: Record<string, string> = {
  'Entertainment': '🎬',
  'Subscriptions': '📱',
  'Utilities': '💡',
  'Insurance': '🛡️',
  'Rent': '🏠',
  'Internet': '🌐',
  'Phone': '📞',
  'Streaming': '📺',
  'Music': '🎵',
  'Gaming': '🎮',
  'Cloud Storage': '☁️',
  'Software': '💻',
  'Gym': '💪',
  'Other': '📋',
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
      const totalMonthly = savedRecurring.reduce((sum, r) => {
        const amount = r.amount
        switch (r.frequency) {
          case 'weekly':
            return sum + amount * 4.33
          case 'biweekly':
            return sum + amount * 2.17
          case 'monthly':
            return sum + amount
          case 'quarterly':
            return sum + amount / 3
          case 'yearly':
            return sum + amount / 12
          default:
            return sum + amount
        }
      }, 0)

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
      const totalMonthly = detectedRecurring.reduce(
        (sum: number, r: DetectedRecurringExpense) => {
          switch (r.frequency) {
            case 'weekly':
              return sum + r.averageAmount * 4.33
            case 'biweekly':
              return sum + r.averageAmount * 2.17
            case 'monthly':
              return sum + r.averageAmount
            case 'quarterly':
              return sum + r.averageAmount / 3
            default:
              return sum + r.averageAmount
          }
        },
        0
      )

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

  // Hero content based on state
  const getHeroContent = () => {
    if (activeTab === 'detected') {
      if (detectedRecurring.length > 0) {
        return {
          icon: <Sparkles className="h-5 w-5 text-primary" />,
          badge: 'AI Detected',
          title: `${detectedRecurring.length} Pattern${detectedRecurring.length > 1 ? 's' : ''} Found`,
          description: 'We found recurring payments in your transactions. Review and save them.',
        }
      }
      return {
        icon: <Zap className="h-5 w-5 text-primary" />,
        badge: 'Detection',
        title: 'No Patterns Yet',
        description: 'Add more transactions to detect recurring payments automatically.',
      }
    }

    if (savedRecurring.length === 0) {
      return {
        icon: <CreditCard className="h-5 w-5 text-primary" />,
        badge: 'Get Started',
        title: 'Track Your Subscriptions',
        description: 'Add recurring expenses to stay on top of your bills.',
      }
    }

    if (stats.overdue > 0) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-destructive" />,
        badge: 'Attention Needed',
        title: `${stats.overdue} Payment${stats.overdue > 1 ? 's' : ''} Overdue`,
        description: 'Some subscriptions are past their due date.',
      }
    }

    return {
      icon: <CheckCircle className="h-5 w-5 text-primary" />,
      badge: 'All Good',
      title: 'Subscriptions on Track',
      description: `Managing ${savedRecurring.length} recurring payment${savedRecurring.length > 1 ? 's' : ''}.`,
    }
  }

  const heroContent = getHeroContent()

  return (
    <div className="space-y-5 pb-24">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-primary/10 border border-primary/20"
      >
        <div className="relative z-10">
          <motion.div
            className="flex items-center gap-2 mb-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {heroContent.icon}
            </motion.div>
            <span className="ios-subheadline text-primary font-medium">{heroContent.badge}</span>
          </motion.div>

          <motion.h2
            className="ios-title1 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
          >
            {heroContent.title}
          </motion.h2>

          <motion.p
            className="ios-body text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {heroContent.description}
          </motion.p>
        </div>

        {/* Decorative elements */}
        <motion.div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/10 blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.8, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </motion.div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ios-card p-4 text-center"
        >
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-blue-500" />
          </div>
          <p className="ios-headline">{stats.count}</p>
          <p className="ios-caption text-muted-foreground">Active</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="ios-card p-4 text-center"
        >
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="ios-headline text-sm">{formatCurrency(stats.totalMonthly, 'VND')}</p>
          <p className="ios-caption text-muted-foreground">Monthly</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="ios-card p-4 text-center"
        >
          <div className={cn(
            "w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center",
            stats.overdue > 0 ? "bg-destructive/10" : "bg-orange-500/10"
          )}>
            {stats.overdue > 0 ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Calendar className="h-5 w-5 text-orange-500" />
            )}
          </div>
          <p className={cn("ios-headline", stats.overdue > 0 && "text-destructive")}>{stats.overdue}</p>
          <p className="ios-caption text-muted-foreground">Overdue</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="ios-card p-1.5">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <CreditCard className="h-4 w-4" />
            Active ({savedRecurring.length})
          </button>
          <button
            onClick={() => setActiveTab('detected')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'detected'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Detected ({detectedRecurring.length})
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex-1 gap-2 min-h-touch">
              <Plus className="h-4 w-4" />
              Add Subscription
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

        {activeTab === 'detected' && detectedRecurring.length > 0 && (
          <Button
            onClick={handleSaveAllDetected}
            disabled={saveDetectedMutation.isPending}
            variant="outline"
            className="gap-2 min-h-touch"
          >
            <Save className="h-4 w-4" />
            Save All
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <RecurringSkeleton />
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

function RecurringSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ios-card p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-muted rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="text-right space-y-2">
              <div className="h-5 w-20 bg-muted rounded ml-auto" />
              <div className="h-5 w-16 bg-muted rounded ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ActiveRecurringList({ recurring }: { recurring: RecurringExpense[] }) {
  if (recurring.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="text-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center"
        >
          <CreditCard className="h-10 w-10 text-primary" />
        </motion.div>
        <h3 className="ios-headline mb-2">No Active Subscriptions</h3>
        <p className="ios-body text-muted-foreground max-w-xs mx-auto">
          Add recurring expenses manually or save detected patterns from your transactions
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="text-center py-16 px-4"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: 10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center"
        >
          <Sparkles className="h-10 w-10 text-primary" />
        </motion.div>
        <h3 className="ios-headline mb-2">No Patterns Detected</h3>
        <p className="ios-body text-muted-foreground max-w-xs mx-auto">
          Add more transactions and we'll automatically detect your recurring payments
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
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

  const categoryIcon = CATEGORY_ICONS[recurring.category || 'Other'] || CATEGORY_ICONS['Other']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, type: "spring", stiffness: 300 }}
      className={cn(
        'ios-card p-4 overflow-hidden',
        isOverdue && 'ring-2 ring-destructive/20',
        !recurring.is_active && 'opacity-50'
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
              isOverdue ? "bg-destructive/10" : "bg-primary/10"
            )}
          >
            {categoryIcon}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="ios-headline truncate">{recurring.name}</h4>
              {recurring.is_detected && recurring.confidence_score && recurring.confidence_score >= 80 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs border',
                  FREQUENCY_COLORS[recurring.frequency as keyof typeof FREQUENCY_COLORS]
                )}
              >
                {FREQUENCY_LABELS[recurring.frequency as keyof typeof FREQUENCY_LABELS]}
              </Badge>
              <span className="ios-caption text-muted-foreground">{recurring.category}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className="ios-headline">{formatCurrency(recurring.amount, recurring.currency)}</p>
          </div>
        </div>

        {/* Due Date Banner */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl",
          isOverdue
            ? "bg-destructive/10"
            : daysUntilNext <= 3
              ? "bg-orange-500/10"
              : "bg-secondary/50"
        )}>
          <div className="flex items-center gap-2">
            <Calendar className={cn(
              "h-4 w-4",
              isOverdue ? "text-destructive" : daysUntilNext <= 3 ? "text-orange-500" : "text-muted-foreground"
            )} />
            <span className={cn(
              "ios-subheadline",
              isOverdue ? "text-destructive" : daysUntilNext <= 3 ? "text-orange-500" : "text-foreground"
            )}>
              {isOverdue ? (
                'Overdue'
              ) : daysUntilNext === 0 ? (
                'Due today'
              ) : daysUntilNext === 1 ? (
                'Due tomorrow'
              ) : daysUntilNext <= 7 ? (
                `Due in ${daysUntilNext} days`
              ) : (
                `Due ${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              )}
            </span>
          </div>
          {isOverdue && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1 gap-2">
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

          <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={handleSkip}>
            <SkipForward className="h-3.5 w-3.5" />
            Skip
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
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

  const categoryIcon = CATEGORY_ICONS[recurring.category || 'Other'] || CATEGORY_ICONS['Other']

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'Very High'
    if (confidence >= 80) return 'High'
    if (confidence >= 70) return 'Good'
    return 'Moderate'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, type: "spring", stiffness: 300 }}
      className={cn(
        'ios-card p-4 overflow-hidden relative',
        isOverdue && 'ring-2 ring-destructive/20'
      )}
    >
      {/* AI Badge */}
      <div className="absolute top-3 right-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: index * 0.05 + 0.2, type: "spring" }}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary"
        >
          <Sparkles className="h-3 w-3" />
          <span className="text-xs font-medium">AI</span>
        </motion.div>
      </div>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4 pr-12">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0",
              isOverdue ? "bg-destructive/10" : "bg-secondary"
            )}
          >
            {categoryIcon}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="ios-headline truncate mb-1">{recurring.merchant}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs border',
                  FREQUENCY_COLORS[recurring.frequency as keyof typeof FREQUENCY_COLORS]
                )}
              >
                {FREQUENCY_LABELS[recurring.frequency as keyof typeof FREQUENCY_LABELS]}
              </Badge>
              <span className="ios-caption text-muted-foreground">{recurring.category}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="ios-caption text-muted-foreground mb-0.5">Avg Amount</p>
            <p className="ios-subheadline font-semibold">{formatCurrency(recurring.averageAmount, 'VND')}</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="ios-caption text-muted-foreground mb-0.5">This Year</p>
            <p className="ios-subheadline font-semibold">{formatCurrency(recurring.totalSpentThisYear, 'VND')}</p>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "ios-subheadline font-medium",
                recurring.confidence >= 80 ? "text-green-600 dark:text-green-400" :
                recurring.confidence >= 70 ? "text-yellow-600 dark:text-yellow-400" :
                "text-orange-600 dark:text-orange-400"
              )}>
                {getConfidenceLabel(recurring.confidence)} Confidence
              </span>
              {recurring.confidence >= 80 && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <span className="ios-caption text-muted-foreground">
              {recurring.transactions.length} matches
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${recurring.confidence}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: index * 0.05 + 0.3 }}
              className={cn(
                'h-full rounded-full',
                recurring.confidence >= 80
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : recurring.confidence >= 70
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    : 'bg-gradient-to-r from-orange-500 to-orange-400'
              )}
            />
          </div>
        </div>

        {/* Next Expected */}
        {!isOverdue && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="ios-caption text-muted-foreground">
              Next expected: {nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {daysUntilNext <= 7 && daysUntilNext > 0 && (
                <span className="text-orange-500 ml-1">({daysUntilNext} days)</span>
              )}
            </span>
          </div>
        )}

        {isOverdue && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="ios-caption text-destructive">Payment may have been missed</span>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saveDetectedMutation.isPending}
          className="w-full gap-2"
        >
          <Save className="h-4 w-4" />
          Save to Active
        </Button>
      </div>
    </motion.div>
  )
}
