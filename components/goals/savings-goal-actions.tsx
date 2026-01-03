'use client'

import { Button } from '@/components/ui/button';
import type { Tables } from '@/lib/supabase/database.types';
import { hapticFeedback } from '@/lib/utils';
import { Edit2, Trash2 } from 'lucide-react';

type SavingsGoal = Tables<'savings_goals'>;

interface SavingsGoalActionsProps {
  goal: SavingsGoal;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  isDeleting: boolean;
}

export function SavingsGoalActions({
  goal,
  onEdit,
  onDelete,
  isDeleting,
}: SavingsGoalActionsProps) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          hapticFeedback('light');
          onEdit(goal);
        }}
        className="h-9 w-9 ios-touch"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(goal)}
        className="h-9 w-9 text-destructive ios-touch"
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Quick add progress buttons component
interface QuickAddProgressProps {
  goal: SavingsGoal;
  onAddProgress: (goal: SavingsGoal, amount: number) => void;
  isUpdating: boolean;
}

export function QuickAddProgress({
  goal,
  onAddProgress,
  isUpdating,
}: QuickAddProgressProps) {
  return (
    <div className="flex gap-2">
      {[100000, 500000, 1000000].map((amount) => (
        <Button
          key={amount}
          variant="outline"
          size="sm"
          onClick={() => {
            hapticFeedback('medium');
            onAddProgress(goal, amount);
          }}
          className="flex-1 ios-press min-h-touch text-primary"
          disabled={isUpdating}
        >
          +{(amount / 1000000).toFixed(1)}M
        </Button>
      ))}
    </div>
  );
}
