/**
 * Gradient Configurations
 *
 * IMPORTANT: Gradients are reserved for HIGHLIGHTS ONLY:
 * - Primary CTA (FAB - Floating Action Button)
 * - Achievement badges (1st, 2nd, 3rd place)
 *
 * All other UI elements should use solid colors from colors.ts or semantic.ts
 */

import type { RankType } from './types';

/**
 * FAB (Floating Action Button) Gradient
 * The main call-to-action button in the app
 */
export const fabGradient = {
  main: 'bg-gradient-to-br from-primary via-primary to-purple-600',
  shimmer: 'bg-gradient-to-tr from-purple-600 via-primary to-blue-500',
  glossy: 'bg-gradient-to-b from-white/30 via-white/10 to-transparent',
} as const;

/**
 * FAB action button gradients
 */
export const fabActionGradients = {
  addExpense: 'bg-gradient-to-br from-blue-500 to-blue-600',
  syncEmails: 'bg-gradient-to-br from-green-500 to-green-600',
} as const;

/**
 * Achievement/Rank Badge Gradients
 * Used for gamification elements like top merchants, workout streaks
 */
export const rankGradients: Record<RankType, {
  bg: string;
  shadow: string;
}> = {
  1: {
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    shadow: 'shadow-lg shadow-yellow-500/30',
  },
  2: {
    bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
    shadow: 'shadow-lg shadow-gray-400/30',
  },
  3: {
    bg: 'bg-gradient-to-br from-amber-500 to-amber-700',
    shadow: 'shadow-lg shadow-amber-500/30',
  },
} as const;

/**
 * Get rank gradient configuration
 * Returns solid fallback for ranks beyond 3
 */
export function getRankGradient(rank: number): { bg: string; shadow: string } {
  if (rank === 1 || rank === 2 || rank === 3) {
    return rankGradients[rank as RankType];
  }
  // Fallback for ranks 4+
  return {
    bg: 'bg-muted',
    shadow: '',
  };
}

/**
 * Workout streak badge gradient
 * Used for gamification achievements
 */
export const streakGradient = {
  bg: 'bg-gradient-to-br from-orange-400 to-red-500',
  shadow: 'shadow-lg shadow-orange-500/30',
} as const;

/**
 * Brand gradient - used sparingly for branding elements only
 */
export const brandGradient = {
  text: 'bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent',
} as const;

/**
 * PWA install CTA gradient
 */
export const installCtaGradient = {
  bg: 'bg-gradient-to-r from-primary to-purple-600',
} as const;
