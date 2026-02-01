/**
 * Theme System Type Definitions
 *
 * This file contains TypeScript interfaces for the centralized theme system.
 */

export interface ColorToken {
  light: string;
  dark: string;
}

export interface SemanticColor {
  bg: string;
  text: string;
  border?: string;
  ring?: string;
}

export interface CategoryColor {
  bg: string;
  border: string;
  text: string;
  emoji: string;
}

export interface GradientConfig {
  className: string;
  description: string;
}

export type CategoryType =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills'
  | 'Health'
  | 'Other';

export type SemanticType =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type HealthTrackerType =
  | 'water'
  | 'calories'
  | 'weight'
  | 'protein'
  | 'carbs'
  | 'fat';

export type RankType = 1 | 2 | 3;
