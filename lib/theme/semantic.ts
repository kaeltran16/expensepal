/**
 * Semantic Colors
 *
 * Colors with meaning: success, warning, danger, info.
 * Used for feedback, alerts, and status indicators.
 */

import type { SemanticType } from './types';

export const semanticColors: Record<SemanticType, {
  bg: string;
  bgLight: string;
  text: string;
  border: string;
  solid: string;
}> = {
  success: {
    bg: 'bg-success',
    bgLight: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800/50',
    solid: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-warning',
    bgLight: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50',
    solid: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-destructive',
    bgLight: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800/50',
    solid: 'bg-red-500',
  },
  info: {
    bg: 'bg-primary',
    bgLight: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/50',
    solid: 'bg-blue-500',
  },
} as const;

/**
 * Get semantic color configuration
 */
export function getSemanticColor(type: SemanticType) {
  return semanticColors[type];
}

// Celebration/completion solid backgrounds (replacing gradients)
export const celebrationColors = {
  success: {
    wrapper: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800/50',
    icon: 'bg-emerald-500',
    text: 'text-green-700 dark:text-green-400',
  },
} as const;

// Trend indicator colors
export const trendColors = {
  up: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-500',
  },
  down: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-500',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
} as const;

// Delete/destructive action solid backgrounds
export const destructiveColors = {
  background: 'bg-destructive/20',
  solid: 'bg-destructive',
  text: 'text-destructive',
} as const;
