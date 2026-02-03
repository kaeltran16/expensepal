/**
 * Routine Gamification System
 *
 * Handles XP calculations, levels, and progression rewards.
 */

import type { LevelInfo, XPBreakdown } from '@/lib/types/routines'

// XP Constants
export const XP_VALUES = {
  BASE_ROUTINE_COMPLETION: 50,
  PERFECT_ROUTINE_BONUS: 50, // No skips
  MAX_STREAK_MULTIPLIER: 2.0, // 100% bonus at max
  STREAK_BONUS_PER_DAY: 0.1, // 10% per day
  MAX_STREAK_DAYS_FOR_BONUS: 10, // Cap at 10 days (100%)
} as const

// Level thresholds - exponential curve
export const LEVEL_THRESHOLDS: LevelInfo[] = [
  { level: 1, minXp: 0, maxXp: 499, title: 'Beginner' },
  { level: 2, minXp: 500, maxXp: 1199, title: 'Novice' },
  { level: 3, minXp: 1200, maxXp: 2099, title: 'Apprentice' },
  { level: 4, minXp: 2100, maxXp: 3199, title: 'Practitioner' },
  { level: 5, minXp: 3200, maxXp: 4499, title: 'Dedicated' },
  { level: 6, minXp: 4500, maxXp: 6099, title: 'Committed' },
  { level: 7, minXp: 6100, maxXp: 7999, title: 'Consistent' },
  { level: 8, minXp: 8000, maxXp: 10199, title: 'Expert' },
  { level: 9, minXp: 10200, maxXp: 12699, title: 'Master' },
  { level: 10, minXp: 12700, maxXp: 15499, title: 'Grandmaster' },
  { level: 11, minXp: 15500, maxXp: 18599, title: 'Legend' },
  { level: 12, minXp: 18600, maxXp: 21999, title: 'Champion' },
  { level: 13, minXp: 22000, maxXp: 25699, title: 'Mythic' },
  { level: 14, minXp: 25700, maxXp: 29699, title: 'Transcendent' },
  { level: 15, minXp: 29700, maxXp: Infinity, title: 'Routine Deity' },
]

/**
 * Get level info for a given XP amount
 */
export function getLevelForXP(totalXp: number): LevelInfo {
  for (const levelInfo of LEVEL_THRESHOLDS) {
    if (totalXp >= levelInfo.minXp && totalXp <= levelInfo.maxXp) {
      return levelInfo
    }
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
}

/**
 * Calculate progress within current level (0-100%)
 */
export function getLevelProgress(totalXp: number): number {
  const levelInfo = getLevelForXP(totalXp)

  if (levelInfo.maxXp === Infinity) {
    return 100 // Max level
  }

  const xpInLevel = totalXp - levelInfo.minXp
  const levelRange = levelInfo.maxXp - levelInfo.minXp + 1

  return Math.min(100, Math.round((xpInLevel / levelRange) * 100))
}

/**
 * Get XP needed for next level
 */
export function getXPToNextLevel(totalXp: number): number {
  const levelInfo = getLevelForXP(totalXp)

  if (levelInfo.maxXp === Infinity) {
    return 0 // Already max level
  }

  return levelInfo.maxXp - totalXp + 1
}

/**
 * Calculate streak bonus multiplier
 */
export function getStreakMultiplier(currentStreak: number): number {
  const cappedStreak = Math.min(currentStreak, XP_VALUES.MAX_STREAK_DAYS_FOR_BONUS)
  const bonus = cappedStreak * XP_VALUES.STREAK_BONUS_PER_DAY
  return 1 + Math.min(bonus, XP_VALUES.MAX_STREAK_MULTIPLIER - 1)
}

/**
 * Calculate streak bonus XP
 */
export function getStreakBonusXP(baseXp: number, currentStreak: number): number {
  const multiplier = getStreakMultiplier(currentStreak)
  return Math.round(baseXp * (multiplier - 1))
}

/**
 * Calculate XP for completing a routine
 */
export function calculateRoutineXP(options: {
  completedSteps: number
  totalSteps: number
  currentStreak: number
  challengeBonus?: number
}): XPBreakdown {
  const { completedSteps, totalSteps, currentStreak, challengeBonus = 0 } = options

  // Base XP for completion
  const baseXp = XP_VALUES.BASE_ROUTINE_COMPLETION

  // Perfect routine bonus (no skips)
  const isPerfect = completedSteps === totalSteps
  const perfectBonus = isPerfect ? XP_VALUES.PERFECT_ROUTINE_BONUS : 0

  // Streak bonus
  const streakBonus = getStreakBonusXP(baseXp, currentStreak)

  // Total
  const total = baseXp + perfectBonus + streakBonus + challengeBonus

  return {
    baseXp,
    streakBonus,
    perfectBonus,
    challengeBonus,
    total,
  }
}

/**
 * Check if user leveled up
 */
export function checkLevelUp(previousXp: number, newXp: number): {
  didLevelUp: boolean
  previousLevel: number
  newLevel: number
  levelsGained: number
} {
  const previousLevel = getLevelForXP(previousXp).level
  const newLevel = getLevelForXP(newXp).level
  const didLevelUp = newLevel > previousLevel

  return {
    didLevelUp,
    previousLevel,
    newLevel,
    levelsGained: newLevel - previousLevel,
  }
}

/**
 * Format XP with suffix (e.g., 1.2K)
 */
export function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return xp.toString()
}

/**
 * Get streak emoji based on streak length
 */
export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return '🔥'
  if (streak >= 14) return '🌟'
  if (streak >= 7) return '⭐'
  if (streak >= 3) return '✨'
  return ''
}

/**
 * Get streak color class based on streak length
 */
export function getStreakColorClass(streak: number): string {
  if (streak >= 30) return 'text-orange-500'
  if (streak >= 14) return 'text-yellow-500'
  if (streak >= 7) return 'text-amber-500'
  return 'text-muted-foreground'
}

/**
 * Format streak message
 */
export function getStreakMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today!'
  if (streak === 1) return '1 day streak! Keep going!'
  if (streak < 7) return `${streak} day streak!`
  if (streak < 14) return `${streak} day streak! On fire!`
  if (streak < 30) return `${streak} day streak! Incredible!`
  return `${streak} day streak! You're unstoppable!`
}
