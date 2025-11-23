'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, hapticFeedback } from '@/lib/utils'
import { Plus, Edit2, Trash2, Save, X, Target, Calendar as CalendarIcon } from 'lucide-react'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/lib/hooks'
import type { Tables } from '@/lib/supabase/database.types'
import { getNowInGMT7 } from '@/lib/timezone'

type SavingsGoal = Tables<'savings_goals'>

export function SavingsGoals() {
  // Fetch goals using TanStack Query
  const { data: goals = [], isLoading: loading } = useGoals()

  // Mutation hooks
  const createGoalMutation = useCreateGoal()
  const updateGoalMutation = useUpdateGoal()
  const deleteGoalMutation = useDeleteGoal()

  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    icon: '🎯',
  })

  const GOAL_ICONS = ['🎯', '🏠', '✈️', '🚗', '💰', '🎓', '💍', '🎉']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          updates: {
            name: formData.name,
            target_amount: parseFloat(formData.targetAmount),
            current_amount: parseFloat(formData.currentAmount || '0'),
            deadline: formData.deadline || null,
            icon: formData.icon,
          },
        })
      } else {
        await createGoalMutation.mutateAsync({
          name: formData.name,
          target_amount: parseFloat(formData.targetAmount),
          current_amount: parseFloat(formData.currentAmount || '0'),
          deadline: formData.deadline || null,
          icon: formData.icon,
        })
      }

      setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', icon: '🎯' })
      setShowForm(false)
      setEditingGoal(null)
    } catch (error) {
      console.error('Error saving goal:', error)
    }
  }

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: goal.target_amount.toString(),
      currentAmount: (goal.current_amount || 0).toString(),
      deadline: goal.deadline || '',
      icon: goal.icon || '🎯',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return

    try {
      await deleteGoalMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const handleAddProgress = async (goal: SavingsGoal, amount: number) => {
    try {
      await updateGoalMutation.mutateAsync({
        id: goal.id,
        updates: {
          current_amount: (goal.current_amount || 0) + amount,
        },
      })
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="ios-caption text-muted-foreground">Loading goals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Goal Button */}
      {!showForm && (
        <Button
          onClick={() => {
            hapticFeedback('light')
            setEditingGoal(null)
            setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', icon: '🎯' })
            setShowForm(true)
          }}
          className="w-full ios-press min-h-touch gap-2"
        >
          <Plus className="h-5 w-5" />
          Add New Goal
        </Button>
      )}

      {/* Goal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="ios-card p-5">
              <h3 className="ios-headline mb-4">
                {editingGoal ? 'Edit Goal' : 'New Goal'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Icon Selector */}
                <div>
                  <Label className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
                    Goal Icon
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {GOAL_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          hapticFeedback('light')
                          setFormData({ ...formData, icon })
                        }}
                        className={`text-2xl w-12 h-12 rounded-xl ios-press transition-all ${
                          formData.icon === icon
                            ? 'bg-primary/20 scale-105 ring-2 ring-primary'
                            : 'bg-secondary'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal Name */}
                <div>
                  <Label htmlFor="name" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
                    Goal Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Vacation to Bali"
                    className="ios-body min-h-touch"
                    required
                  />
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="targetAmount" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
                      Target (₫)
                    </Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="10,000,000"
                      className="ios-body min-h-touch"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="currentAmount" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
                      Current (₫)
                    </Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      value={formData.currentAmount}
                      onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                      placeholder="0"
                      className="ios-body min-h-touch"
                    />
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <Label htmlFor="deadline" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
                    Deadline (Optional)
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="ios-body min-h-touch"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    className="flex-1 ios-press min-h-touch gap-2"
                    disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {editingGoal ? 'Update Goal' : 'Create Goal'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      hapticFeedback('light')
                      setShowForm(false)
                      setEditingGoal(null)
                    }}
                    className="ios-press min-h-touch px-4"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-16 w-16 text-primary" />}
          title="No Goals Yet"
          description="Create your first savings goal to start tracking your progress"
          animationVariant="pulse"
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal, index) => {
            const progress = ((goal.current_amount || 0) / goal.target_amount) * 100
            const remaining = goal.target_amount - (goal.current_amount || 0)
            const isCompleted = progress >= 100
            const daysUntilDeadline = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - getNowInGMT7().getTime()) / (1000 * 60 * 60 * 24))
              : null

            return (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="ios-card p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                      {goal.icon || '🎯'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="ios-headline truncate">{goal.name}</h3>
                      <p className="ios-caption text-muted-foreground">
                        {formatCurrency(goal.current_amount || 0, 'VND')} of{' '}
                        {formatCurrency(goal.target_amount, 'VND')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        hapticFeedback('light')
                        handleEdit(goal)
                      }}
                      className="h-9 w-9 ios-touch"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        hapticFeedback('medium')
                        handleDelete(goal.id)
                      }}
                      className="h-9 w-9 text-destructive ios-touch"
                      disabled={deleteGoalMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mb-4">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      className={`h-full rounded-full ${
                        isCompleted ? 'bg-green-500' : 'bg-primary'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="ios-caption text-muted-foreground">
                      {progress.toFixed(0)}% complete
                    </span>
                    <span className={`ios-caption font-medium ${isCompleted ? 'text-green-500' : ''}`}>
                      {isCompleted ? 'Goal reached! 🎉' : `${formatCurrency(remaining, 'VND')} to go`}
                    </span>
                  </div>
                </div>

                {/* Deadline Info */}
                {daysUntilDeadline !== null && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-secondary/50 rounded-lg">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="ios-caption text-muted-foreground">
                      {daysUntilDeadline > 0
                        ? `${daysUntilDeadline} days until deadline`
                        : daysUntilDeadline === 0
                        ? 'Deadline is today!'
                        : `${Math.abs(daysUntilDeadline)} days overdue`}
                    </p>
                  </div>
                )}

                {/* Quick Add Progress */}
                {!isCompleted && (
                  <div className="flex gap-2">
                    {[100000, 500000, 1000000].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          hapticFeedback('medium')
                          handleAddProgress(goal, amount)
                        }}
                        className="flex-1 ios-press min-h-touch text-primary"
                        disabled={updateGoalMutation.isPending}
                      >
                        +{(amount / 1000000).toFixed(1)}M
                      </Button>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
