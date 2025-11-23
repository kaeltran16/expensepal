import { celebrateSuccess } from '@/components/confetti';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateExpenseOptimistic,
  useUpdateExpense,
  useDeleteExpenseOptimistic,
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

    // Store for undo
    setDeletedExpense({ expense: expenseToDelete, index });

    hapticFeedback('medium');

    // Show undo toast
    toast.success('Expense deleted', {
      action: {
        label: 'Undo',
        onClick: () => handleUndoDelete(),
      },
      duration: 5000,
    });

    try {
      // Use optimistic delete mutation (UI updates immediately)
      await deleteExpenseMutation.mutateAsync(id);

      // Clear undo after successful delete
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
      // Re-create the expense using optimistic mutation
      await createExpenseMutation.mutateAsync({
        amount: deletedExpense.expense.amount,
        merchant: deletedExpense.expense.merchant,
        category: deletedExpense.expense.category,
        notes: deletedExpense.expense.notes,
        transaction_date: deletedExpense.expense.transaction_date,
        card_number: deletedExpense.expense.card_number,
        cardholder: deletedExpense.expense.cardholder,
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
            card_number: expense.card_number,
            cardholder: expense.cardholder,
            transaction_type: expense.transaction_type,
            currency: expense.currency,
          },
        },
        {
          onSuccess: () => {
            toast.success('Notes updated');
          },
          onError: () => {
            // Error already handled by mutation
          },
        }
      );
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleSubmit = async (
    data: any,
    editingExpense: Expense | undefined,
    callbacks: {
      onBeforeSubmit: () => void;
      onError: () => void;
    }
  ) => {
    hapticFeedback('medium');

    // Close form immediately for better UX (optimistic)
    callbacks.onBeforeSubmit();

    try {
      if (editingExpense) {
        // Update existing expense
        await updateExpenseMutation.mutateAsync({
          id: editingExpense.id,
          updates: data,
        });
      } else {
        // Create new expense (optimistically shown immediately)
        await createExpenseMutation.mutateAsync({
          ...data,
          source: 'manual',
        });

        // Celebrate only for first expense
        if (expenses.length === 0) {
          celebrateSuccess();
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      // Re-open form on error
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
