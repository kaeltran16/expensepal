/**
 * Theme System - Main Exports
 *
 * Centralized theme system for consistent styling across the app.
 *
 * Usage Guidelines:
 * - Gradients: Reserved for FAB button and achievement badges (1st/2nd/3rd place) only
 * - Solid colors: Use for everything else (progress bars, icons, backgrounds)
 * - Semantic colors: For success, warning, danger, info states
 * - Category colors: For expense/health categories
 */

// Types
export type {
  ColorToken,
  SemanticColor,
  CategoryColor,
  GradientConfig,
  CategoryType,
  SemanticType,
  HealthTrackerType,
  RankType,
} from './types';

// Core colors
export { coreColors, progressColors, iconBgColors } from './colors';

// Semantic colors
export {
  semanticColors,
  getSemanticColor,
  celebrationColors,
  trendColors,
  destructiveColors,
} from './semantic';

// Category colors
export {
  expenseCategoryColors,
  getCategoryColor,
  getCategoryEmoji,
  categoryIconBg,
  categoryRingColors,
  getCategoryRingColor,
} from './categories';

// Gradients (highlight-only usage)
export {
  fabGradient,
  fabActionGradients,
  rankGradients,
  getRankGradient,
  streakGradient,
  brandGradient,
  installCtaGradient,
} from './gradients';
