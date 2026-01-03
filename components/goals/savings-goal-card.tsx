'use client'

import type { Tables } from '@/lib/supabase/database.types';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon } from 'lucide-react';
import { calculateDaysUntilDeadline, calculateGoalProgress } from '@/lib/hooks/use-goal-operations';
import { SavingsGoalProgress } from './savings-goal-progress';
import { SavingsGoalActions, QuickAddProgress } from './savings-goal-actions';

type SavingsGoal = Tables<'savings_goals'>;

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  index: number;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  onAddProgress: (goal: SavingsGoal, amount: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function SavingsGoalCard({
  goal,
  index,
  onEdit,
  onDelete,
  onAddProgress,
  isUpdating,
  isDeleting,
}: SavingsGoalCardProps) {
  const { progress, remaining, isCompleted } = calculateGoalProgress(goal);
  const daysUntilDeadline = calculateDaysUntilDeadline(goal.deadline);

  return (
    <motion.div
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

        {/* Edit/Delete Buttons */}
        <SavingsGoalActions
          goal={goal}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <SavingsGoalProgress
          progress={progress}
          remaining={remaining}
          isCompleted={isCompleted}
        />
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
        <QuickAddProgress
          goal={goal}
          onAddProgress={onAddProgress}
          isUpdating={isUpdating}
        />
      )}
    </motion.div>
  );
}
