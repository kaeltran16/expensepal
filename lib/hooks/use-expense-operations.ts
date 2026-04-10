import { celebrateSuccess } from '@/components/confetti';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateExpenseOptimistic,
  useDeleteExpenseOptimistic,
  useUpdateExpense,
} from './index';

export function useExpenseOperations(expenses: Expense[]) {
  const [deletedExpense, setDeletedExpense] = useState<{
    expense: Expense;
    index: number;
  } | null>(null);

  const createExpenseMutation = useCreateExpenseOptimistic();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpenseOptimistic();

  const handleDelete = async (id: string) => {
    const expenseToDelete = expenses.find((e) => e.id === id);
    if (!expenseToDelete) return;

    const index = expenses.findIndex((e) => e.id === id);

    setDeletedExpense({ expense: expenseToDelete, index });

    hapticFeedback('medium');

    toast.success('Expense deleted', {
      action: {
        label: 'Undo',
        onClick: () => handleUndoDelete(),
      },
      duration: 5000,
    });

    try {
      await deleteExpenseMutation.mutateAsync(id);

      setTimeout(() => setDeletedExpense(null), 5000);
    } catch (error) {
      console.error('Error deleting expense:', error);
      setDeletedExpense(null);
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedExpense) return;

    hapticFeedback('light');

    try {
      await createExpenseMutation.mutateAsync({
        amount: deletedExpense.expense.amount,
        merchant: deletedExpense.expense.merchant,
        category: deletedExpense.expense.category,
        notes: deletedExpense.expense.notes,
        transaction_date: deletedExpense.expense.transaction_date,
        transaction_type: deletedExpense.expense.transaction_type,
        currency: deletedExpense.expense.currency,
        source: deletedExpense.expense.source,
      });

      toast.success('Expense restored');
      setDeletedExpense(null);
    } catch (error) {
      console.error('Error restoring expense:', error);
      setDeletedExpense(null);
    }
  };

  const handleUpdateNotes = async (expense: Expense) => {
    try {
      await updateExpenseMutation.mutateAsync(
        {
          id: expense.id,
          updates: {
            amount: expense.amount,
            merchant: expense.merchant,
            category: expense.category,
            notes: expense.notes,
            transaction_date: expense.transaction_date,
            transaction_type: expense.transaction_type,
            currency: expense.currency,
          },
        },
        {
          onSuccess: () => {
            toast.success('Notes updated');
          },
        }
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleSubmit = async (
    data: {
      amount: number
      merchant: string
      category: string
      transaction_date: string
      transaction_type?: string
      currency?: string
      notes?: string
    },
    editingExpense: Expense | undefined,
    callbacks: {
      onBeforeSubmit: () => void;
      onError: () => void;
    }
  ) => {
    hapticFeedback('medium');

    callbacks.onBeforeSubmit();

    try {
      if (editingExpense) {
        await updateExpenseMutation.mutateAsync({
          id: editingExpense.id,
          updates: data,
        });
        toast.success('Expense updated');
      } else {
        await createExpenseMutation.mutateAsync({
          ...data,
          source: 'manual',
        });

        if (expenses.length === 0) {
          celebrateSuccess();
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      callbacks.onError();
    }
  };

  return {
    handleDelete,
    handleUndoDelete,
    handleUpdateNotes,
    handleSubmit,
    deletedExpense,
  };
}
