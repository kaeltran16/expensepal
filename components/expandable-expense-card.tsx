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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Expense } from '@/lib/supabase';
import {
  formatCurrency,
  formatDate,
  getCategoryColor,
  hapticFeedback,
} from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Edit,
  FileText,
  Mail,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { SwipeableCard } from '@/components/ui/swipeable-card';

interface ExpandableExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  onUpdate?: (expense: Expense) => void;
}

const CATEGORY_CONFIG: Record<string, { emoji: string; gradient: string; color: string }> = {
  Food: {
    emoji: '🍔',
    gradient: 'from-orange-500/20 to-red-500/20',
    color: 'text-orange-600 dark:text-orange-400'
  },
  Transport: {
    emoji: '🚗',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    color: 'text-blue-600 dark:text-blue-400'
  },
  Shopping: {
    emoji: '🛍️',
    gradient: 'from-pink-500/20 to-purple-500/20',
    color: 'text-pink-600 dark:text-pink-400'
  },
  Entertainment: {
    emoji: '🎬',
    gradient: 'from-purple-500/20 to-indigo-500/20',
    color: 'text-purple-600 dark:text-purple-400'
  },
  Bills: {
    emoji: '💡',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  Health: {
    emoji: '🏥',
    gradient: 'from-green-500/20 to-emerald-500/20',
    color: 'text-green-600 dark:text-green-400'
  },
  Other: {
    emoji: '📦',
    gradient: 'from-gray-500/20 to-slate-500/20',
    color: 'text-gray-600 dark:text-gray-400'
  },
};

export const ExpandableExpenseCard = forwardRef<HTMLDivElement, ExpandableExpenseCardProps>(
  function ExpandableExpenseCard({
    expense,
    onDelete,
    onEdit,
    onUpdate,
  }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(expense.notes || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const categoryConfig = CATEGORY_CONFIG[expense.category || 'Other'] || CATEGORY_CONFIG.Other;

  // Memoize formatted date strings
  const formattedDate = useMemo(() => {
    return new Date(expense.transaction_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [expense.transaction_date]);

  const formattedTime = useMemo(() => {
    return new Date(expense.transaction_date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [expense.transaction_date]);

  // Check if expense is recent (within 24 hours)
  const isRecent = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    return new Date(expense.transaction_date) > oneDayAgo;
  }, [expense.transaction_date]);

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
    hapticFeedback('light');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      hapticFeedback('heavy');
      onDelete(expense.id);
    }
    setShowDeleteDialog(false);
  };

  const handleEdit = () => {
    if (onEdit) {
      hapticFeedback('light');
      onEdit(expense);
    }
  };

  const handleCardClick = () => {
    hapticFeedback('light');
    setIsExpanded(!isExpanded);
  };

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

        {/* New badge for recent expenses */}
        {isRecent && !isExpanded && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: -12 }}
            className="absolute top-2 right-2 z-10"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
              <Sparkles className="h-2.5 w-2.5" />
              NEW
            </div>
          </motion.div>
        )}

      {/* Main content */}
      <button
        type="button"
        className="w-full text-left px-4 py-4 ios-touch relative z-10"
        onClick={handleCardClick}
      >
        <div className="flex items-start gap-3">
          {/* Icon with gradient border */}
          <motion.div
            className="flex-shrink-0 relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${categoryConfig.gradient} border border-border/50 flex items-center justify-center text-2xl shadow-sm relative overflow-hidden`}>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">{categoryConfig.emoji}</span>
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate text-foreground">
                  {expense.merchant}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${categoryConfig.color} flex items-center gap-1`}>
                    <Tag className="h-3 w-3" />
                    {expense.category}
                  </span>
                  {expense.source === 'email' && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      >
                        <Mail className="w-2.5 h-2.5 mr-1" />
                        Auto
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Amount with visual emphasis */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-lg font-bold text-destructive">
                  -{formatCurrency(expense.amount, expense.currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
              <span className="text-muted-foreground/50">•</span>
              <Clock className="h-3 w-3" />
              <span>{formattedTime}</span>
            </div>

            {!isExpanded && expense.notes && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground mt-2 line-clamp-1 bg-muted/30 px-2 py-1 rounded-lg italic"
              >
                💭 {expense.notes}
              </motion.p>
            )}
          </div>

          {/* Chevron indicator */}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 self-center"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </motion.div>
        </div>
      </button>

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
              {/* Details grid with cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Transaction info card */}
                <div className="col-span-2 bg-muted/30 dark:bg-muted/10 rounded-xl p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Transaction Details</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{formattedTime}</span>
                    </div>
                    {expense.card_number && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Card</span>
                        <span className="font-mono text-xs">{expense.card_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes section with enhanced UI */}
              {onUpdate && (
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
              )}

              {/* Action buttons with modern design */}
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
                {onDelete && (
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          onClick={(e) => e.stopPropagation()}
          className="ios-card"
        >
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/30 border-4 border-destructive/10">
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
              onClick={handleConfirmDelete}
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
    </motion.div>
    </SwipeableCard>
  );
});

ExpandableExpenseCard.displayName = 'ExpandableExpenseCard';
