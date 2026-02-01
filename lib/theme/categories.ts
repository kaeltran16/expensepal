/**
 * Category Colors
 *
 * Expense and health category color definitions.
 * Uses solid colors instead of gradients for better visual consistency.
 */

import type { CategoryType, CategoryColor } from './types';

// Expense category colors with solid backgrounds
export const expenseCategoryColors: Record<CategoryType, CategoryColor> = {
  Food: {
    bg: 'bg-orange-100 dark:bg-orange-950',
    border: 'border-l-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    emoji: '🍔',
  },
  Transport: {
    bg: 'bg-blue-100 dark:bg-blue-950',
    border: 'border-l-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    emoji: '🚗',
  },
  Shopping: {
    bg: 'bg-pink-100 dark:bg-pink-950',
    border: 'border-l-pink-500',
    text: 'text-pink-700 dark:text-pink-400',
    emoji: '🛍️',
  },
  Entertainment: {
    bg: 'bg-purple-100 dark:bg-purple-950',
    border: 'border-l-purple-500',
    text: 'text-purple-700 dark:text-purple-400',
    emoji: '🎬',
  },
  Bills: {
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    border: 'border-l-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-400',
    emoji: '💡',
  },
  Health: {
    bg: 'bg-red-100 dark:bg-red-950',
    border: 'border-l-red-500',
    text: 'text-red-700 dark:text-red-400',
    emoji: '🏥',
  },
  Other: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-l-gray-500',
    text: 'text-gray-700 dark:text-gray-400',
    emoji: '📦',
  },
} as const;

/**
 * Get category color configuration
 * Falls back to 'Other' category if not found
 */
export function getCategoryColor(category: string): CategoryColor {
  return expenseCategoryColors[category as CategoryType] || expenseCategoryColors.Other;
}

/**
 * Get category emoji
 */
export function getCategoryEmoji(category: string): string {
  return getCategoryColor(category).emoji;
}

// Category icon background - solid version (replacing gradients)
export const categoryIconBg: Record<CategoryType, string> = {
  Food: 'bg-orange-500/20',
  Transport: 'bg-blue-500/20',
  Shopping: 'bg-pink-500/20',
  Entertainment: 'bg-purple-500/20',
  Bills: 'bg-yellow-500/20',
  Health: 'bg-green-500/20',
  Other: 'bg-gray-500/20',
} as const;

// Category ring colors for charts
export const categoryRingColors: Record<CategoryType, string> = {
  Food: 'stroke-orange-500',
  Transport: 'stroke-blue-500',
  Shopping: 'stroke-pink-500',
  Entertainment: 'stroke-purple-500',
  Bills: 'stroke-yellow-500',
  Health: 'stroke-green-500',
  Other: 'stroke-gray-500',
} as const;

/**
 * Get ring color for category charts
 */
export function getCategoryRingColor(category: string): string {
  return categoryRingColors[category as CategoryType] || categoryRingColors.Other;
}
