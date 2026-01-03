'use client'

import type { Expense } from '@/lib/supabase';
import { hapticFeedback } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, useEffect, useRef, useState } from 'react';
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
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const categoryConfig = (CATEGORY_CONFIG[expense.category || 'Other'] || CATEGORY_CONFIG.Other)!;

  // Use ResizeObserver for automatic height measurement
  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height + 20);
      }
    });

    if (isExpanded) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isExpanded]);

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
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: 0.3,
          ease: [0.175, 0.885, 0.32, 1.275],
        }}
        className="ios-card overflow-hidden relative group"
      >
        {/* Gradient background overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${categoryConfig.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

        {/* Header */}
        <ExpenseCardHeader
          expense={expense}
          isExpanded={isExpanded}
          onClick={handleCardClick}
        />

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: contentHeight > 0 ? contentHeight : 'auto',
                opacity: 1,
              }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{ overflow: 'hidden' }}
            >
              <div ref={contentRef} className="px-4 pb-4 space-y-4">
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

        {/* Delete Confirmation Dialog */}
        <DeleteExpenseDialog
          expense={expense}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirmDelete={handleConfirmDelete}
        />
      </motion.div>
    </SwipeableCard>
  );
});

ExpandableExpenseCard.displayName = 'ExpandableExpenseCard';
