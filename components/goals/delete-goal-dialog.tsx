'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tables } from '@/lib/supabase/database.types';
import { formatCurrency, hapticFeedback } from '@/lib/utils';
import { AlertTriangle, Trash2 } from 'lucide-react';

type SavingsGoal = Tables<'savings_goals'>;

interface DeleteGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalToDelete: SavingsGoal | null;
  onConfirmDelete: () => void;
}

export function DeleteGoalDialog({
  open,
  onOpenChange,
  goalToDelete,
  onConfirmDelete,
}: DeleteGoalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="ios-card">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border-4 border-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center ios-title text-xl">
            Delete Savings Goal?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center ios-body text-muted-foreground">
            {goalToDelete && (
              <>
                Are you sure you want to delete the goal{' '}
                <span className="font-semibold text-foreground">"{goalToDelete.name}"</span>?
                <br />
                Current progress:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(goalToDelete.current_amount || 0, 'VND')}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(goalToDelete.target_amount, 'VND')}
                </span>
                .
                <br />
                <span className="text-destructive font-medium">This action cannot be undone.</span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="w-full touch-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 ios-press order-1 h-12 font-semibold"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Goal
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={() => hapticFeedback('light')}
            className="w-full touch-lg ios-press order-2 mt-0 h-12"
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
