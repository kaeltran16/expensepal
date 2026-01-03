'use client'

import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SavingsGoalProgressProps {
  progress: number;
  remaining: number;
  isCompleted: boolean;
}

export function SavingsGoalProgress({
  progress,
  remaining,
  isCompleted,
}: SavingsGoalProgressProps) {
  return (
    <div className="space-y-2">
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
  );
}
