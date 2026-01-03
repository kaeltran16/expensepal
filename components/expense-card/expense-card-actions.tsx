'use client'

import { Button } from '@/components/ui/button';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { Edit, Trash2 } from 'lucide-react';

interface ExpenseCardActionsProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDeleteClick?: () => void;
}

export function ExpenseCardActions({ expense, onEdit, onDeleteClick }: ExpenseCardActionsProps) {
  const handleEdit = () => {
    if (onEdit) {
      hapticFeedback('light');
      onEdit(expense);
    }
  };

  const handleDeleteClick = () => {
    if (onDeleteClick) {
      hapticFeedback('light');
      onDeleteClick();
    }
  };

  return (
    <div className="flex gap-2 pt-2">
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
          className="flex-1 h-11 gap-2 border-2 hover:border-primary hover:bg-primary/5"
        >
          <Edit className="w-4 h-4" />
          Edit Expense
        </Button>
      )}
      {onDeleteClick && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }}
          className="flex-1 h-11 gap-2 border-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      )}
    </div>
  );
}
