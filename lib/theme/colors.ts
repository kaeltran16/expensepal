/**
 * Core Color Tokens
 *
 * Base color definitions used throughout the theme system.
 * These are the building blocks for semantic and category colors.
 */

// iOS-style solid colors for consistent theming
export const coreColors = {
  // Primary brand color (iOS Blue)
  primary: {
    solid: 'bg-primary',
    text: 'text-primary',
    light: 'bg-primary/10',
    ring: 'ring-primary/20',
  },

  // Water/hydration (Blue tones)
  water: {
    solid: 'bg-blue-500',
    light: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500/20',
  },

  // Calories/energy (Orange-red tones)
  calories: {
    solid: 'bg-orange-500',
    light: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-500/20',
  },

  // Weight/body (Purple tones)
  weight: {
    solid: 'bg-purple-500',
    light: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-500/20',
  },

  // Protein (Blue tones)
  protein: {
    solid: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
  },

  // Carbs (Amber tones)
  carbs: {
    solid: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
  },

  // Fat (Green tones)
  fat: {
    solid: 'bg-green-500',
    light: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
  },

  // Routines (Teal tones)
  routines: {
    solid: 'bg-teal-500',
    light: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-600 dark:text-teal-400',
    ring: 'ring-teal-500/20',
  },

  // Streak (Orange tones for fire/streak theme)
  streak: {
    solid: 'bg-orange-500',
    light: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-500/20',
  },

  // XP/Level (Emerald/green for growth)
  xp: {
    solid: 'bg-emerald-500',
    light: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/20',
  },
} as const;

// Progress bar solid colors (replacing gradients)
export const progressColors = {
  default: 'bg-primary',
  water: 'bg-blue-500',
  waterComplete: 'bg-emerald-500',
  calories: 'bg-orange-500',
  caloriesOver: 'bg-red-500',
  caloriesComplete: 'bg-emerald-500',
} as const;

// Icon container solid backgrounds (replacing gradient backgrounds)
export const iconBgColors = {
  water: 'bg-blue-500',
  calories: 'bg-orange-500',
  weight: 'bg-purple-500',
  workout: 'bg-primary',
  success: 'bg-emerald-500',
  target: 'bg-orange-500',
  routine: 'bg-teal-500',
  streak: 'bg-orange-500',
  xp: 'bg-emerald-500',
  challenge: 'bg-purple-500',
} as const;
