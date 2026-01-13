'use client'

import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { springs, variants } from '@/lib/animation-config';
import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, useState } from 'react';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { CATEGORY_CONFIG, ExpenseCardHeader } from '@/components/expense-card/expense-card-header';
import { ExpenseCardDetails } from '@/components/expense-card/expense-card-details';
import { ExpenseNotesEditor } from '@/components/expense-card/expense-notes-editor';
import { ExpenseCardActions } from '@/components/expense-card/expense-card-actions';
import { DeleteExpenseDialog } from '@/components/expense-card/delete-expense-dialog';

interface ExpandableExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  onUpdate?: (expense: Expense) => void;
}

export const ExpandableExpenseCard = forwardRef<HTMLDivElement, ExpandableExpenseCardProps>(
  function ExpandableExpenseCard({
    expense,
    onDelete,
    onEdit,
    onUpdate,
  }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const categoryConfig = (CATEGORY_CONFIG[expense.category || 'Other'] || CATEGORY_CONFIG.Other)!;

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      hapticFeedback('heavy');
      onDelete(expense.id);
    }
    setShowDeleteDialog(false);
  };

  const handleCardClick = () => {
    hapticFeedback('light');
    setIsExpanded(!isExpanded);
  };

  return (
    <SwipeableCard
      onDelete={() => {
        hapticFeedback('heavy')
        if (onDelete) onDelete(expense.id)
      }}
      disabled={isExpanded}
    >
      <div
        ref={ref}
        className="ios-card overflow-hidden relative group will-animate-all"
        data-testid="expense-card"
      >
        {/* Gradient background overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${categoryConfig.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

        {/* Header */}
        <ExpenseCardHeader
          expense={expense}
          isExpanded={isExpanded}
          onClick={handleCardClick}
        />

        {/* Expanded content - uses CSS grid for smooth height animation */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
          }}
        >
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                {...variants.cardExpandContent}
                transition={springs.default}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">
                {/* Details */}
                <ExpenseCardDetails expense={expense} />

                {/* Notes editor */}
                <ExpenseNotesEditor expense={expense} onUpdate={onUpdate} />

                {/* Action buttons */}
                <ExpenseCardActions
                  expense={expense}
                  onEdit={onEdit}
                  onDeleteClick={handleDeleteClick}
                />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteExpenseDialog
          expense={expense}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirmDelete={handleConfirmDelete}
        />
      </div>
    </SwipeableCard>
  );
});

ExpandableExpenseCard.displayName = 'ExpandableExpenseCard';
