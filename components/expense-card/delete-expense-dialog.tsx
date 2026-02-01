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
import type { Expense } from '@/lib/supabase';
import { formatCurrency, hapticFeedback } from '@/lib/utils';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteExpenseDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}

export function DeleteExpenseDialog({
  expense,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteExpenseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onClick={(e) => e.stopPropagation()}
        className="ios-card"
      >
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border-4 border-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center ios-title text-xl">
            Delete Expense?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center ios-body text-muted-foreground">
            Are you sure you want to delete this{' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(expense.amount, expense.currency)}
            </span>{' '}
            expense from{' '}
            <span className="font-semibold text-foreground">
              {expense.merchant}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="w-full touch-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 ios-press order-1 h-12 font-semibold"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Expense
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
