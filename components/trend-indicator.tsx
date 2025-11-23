'use client'

import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  previousValue: number;
  format?: 'currency' | 'percentage' | 'number';
  currency?: string;
  showIcon?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  previousValue,
  format = 'number',
  currency = 'VND',
  showIcon = true,
  showPercentage = true,
  className,
}: TrendIndicatorProps) {
  const diff = value - previousValue;
  const percentageChange =
    previousValue === 0 ? 0 : ((diff / previousValue) * 100);

  const isIncrease = diff > 0;
  const isDecrease = diff < 0;
  const isNeutral = diff === 0;

  const formatValue = (val: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(Math.abs(val));
    }
    if (format === 'percentage') {
      return `${Math.abs(val).toFixed(1)}%`;
    }
    return Math.abs(val).toLocaleString();
  };

  const colorClass = isIncrease
    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
    : isDecrease
    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20'
    : 'text-muted-foreground bg-muted/50';

  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {showIcon && (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span>
        {!isNeutral && (isIncrease ? '+' : '-')}
        {formatValue(diff)}
      </span>
      {showPercentage && !isNeutral && (
        <span className="opacity-70">
          ({percentageChange > 0 ? '+' : '-'}
          {Math.abs(percentageChange).toFixed(1)}%)
        </span>
      )}
    </motion.div>
  );
}

// Compact version for inline use
export function TrendBadge({
  value,
  previousValue,
  className,
}: {
  value: number;
  previousValue: number;
  className?: string;
}) {
  const diff = value - previousValue;
  const percentageChange =
    previousValue === 0 ? 0 : ((diff / previousValue) * 100);

  const isIncrease = diff > 0;
  const isNeutral = diff === 0;

  if (isNeutral) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isIncrease
          ? 'text-red-600 dark:text-red-400'
          : 'text-green-600 dark:text-green-400',
        className
      )}
    >
      {isIncrease ? '↑' : '↓'}
      {Math.abs(percentageChange).toFixed(0)}%
    </span>
  );
}
