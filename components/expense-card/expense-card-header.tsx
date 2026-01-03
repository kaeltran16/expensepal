'use client'

import { Badge } from '@/components/ui/badge';
import type { Expense } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronRight,
  Clock,
  Mail,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useMemo } from 'react';

export const CATEGORY_CONFIG: Record<string, { emoji: string; gradient: string; color: string }> = {
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

interface ExpenseCardHeaderProps {
  expense: Expense;
  isExpanded: boolean;
  onClick: () => void;
}

export function ExpenseCardHeader({ expense, isExpanded, onClick }: ExpenseCardHeaderProps) {
  const categoryConfig = (CATEGORY_CONFIG[expense.category || 'Other'] || CATEGORY_CONFIG.Other)!;

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

  return (
    <>
      {/* New badge for recent expenses */}
      {isRecent && !isExpanded && (
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: -12 }}
          className="absolute top-2 right-2 z-10"
        >
          <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
            <Sparkles className="h-2.5 w-2.5" />
            NEW
          </div>
        </motion.div>
      )}

      <button
        type="button"
        className="w-full text-left px-4 py-4 ios-touch relative z-10"
        onClick={onClick}
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
    </>
  );
}
