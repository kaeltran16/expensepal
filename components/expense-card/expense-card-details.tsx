'use client'

import type { Expense } from '@/lib/supabase';
import { CreditCard } from 'lucide-react';
import { useMemo } from 'react';

interface ExpenseCardDetailsProps {
  expense: Expense;
}

export function ExpenseCardDetails({ expense }: ExpenseCardDetailsProps) {
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

  return (
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
        </div>
      </div>
    </div>
  );
}
