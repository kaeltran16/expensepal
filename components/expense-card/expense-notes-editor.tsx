'use client'

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { Check, Edit, FileText, X } from 'lucide-react';
import { useState } from 'react';

interface ExpenseNotesEditorProps {
  expense: Expense;
  onUpdate?: (expense: Expense) => void;
}

export function ExpenseNotesEditor({ expense, onUpdate }: ExpenseNotesEditorProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(expense.notes || '');

  const handleSaveNotes = async () => {
    if (onUpdate && editedNotes !== expense.notes) {
      await onUpdate({ ...expense, notes: editedNotes });
      hapticFeedback('medium');
    }
    setIsEditingNotes(false);
  };

  const handleCancelEditNotes = () => {
    setEditedNotes(expense.notes || '');
    setIsEditingNotes(false);
    hapticFeedback('light');
  };

  if (!onUpdate) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">Notes</span>
        </div>
        {!isEditingNotes && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingNotes(true);
              hapticFeedback('light');
            }}
            className="h-8 text-xs px-3 hover:bg-primary/20"
          >
            <Edit className="w-3 h-3 mr-1.5" />
            {expense.notes ? 'Edit' : 'Add'}
          </Button>
        )}
      </div>

      {isEditingNotes ? (
        <div className="space-y-3">
          <Textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Add notes about this expense..."
            className="ios-input min-h-[100px] text-sm bg-background/50 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveNotes();
              }}
              className="flex-1 h-10 gap-2 bg-primary hover:bg-primary/90"
            >
              <Check className="w-4 h-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEditNotes();
              }}
              className="flex-1 h-10 gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {expense.notes ? (
            <span className="italic">"{expense.notes}"</span>
          ) : (
            <span className="text-muted-foreground/60">No notes added yet</span>
          )}
        </p>
      )}
    </div>
  );
}
