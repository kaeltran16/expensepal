/**
 * Routine Achievements System
 *
 * Defines and tracks achievement unlocks.
 */

import type { Achievement, UserRoutineStats, UserRoutineStreak } from '@/lib/types/routines'

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Completion milestones
  {
    id: 'fresh_start',
    name: 'Fresh Start',
    description: 'Complete your first routine',
    icon: '🌱',
    requirement: { type: 'completions', value: 1 },
    xpReward: 25,
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 5 routines',
    icon: '👋',
    requirement: { type: 'completions', value: 5 },
    xpReward: 50,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete 7 routines',
    icon: '⚔️',
    requirement: { type: 'completions', value: 7 },
    xpReward: 100,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 15 routines',
    icon: '💪',
    requirement: { type: 'completions', value: 15 },
    xpReward: 150,
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Complete 30 routines',
    icon: '🏆',
    requirement: { type: 'completions', value: 30 },
    xpReward: 250,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 routines',
    icon: '💯',
    requirement: { type: 'completions', value: 100 },
    xpReward: 500,
  },

  // Streak milestones
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Achieve a 3-day streak',
    icon: '🔗',
    requirement: { type: 'streak', value: 3 },
    xpReward: 50,
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    description: 'Achieve a 7-day streak',
    icon: '🔥',
    requirement: { type: 'streak', value: 7 },
    xpReward: 150,
  },
  {
    id: 'two_weeks',
    name: 'Fortnight Force',
    description: 'Achieve a 14-day streak',
    icon: '⚡',
    requirement: { type: 'streak', value: 14 },
    xpReward: 300,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Achieve a 30-day streak',
    icon: '🚀',
    requirement: { type: 'streak', value: 30 },
    xpReward: 500,
  },
  {
    id: 'legendary',
    name: 'Legendary',
    description: 'Achieve a 60-day streak',
    icon: '👑',
    requirement: { type: 'streak', value: 60 },
    xpReward: 1000,
  },

  // Level milestones
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    requirement: { type: 'level', value: 5 },
    xpReward: 100,
  },
  {
    id: 'level_10',
    name: 'Expert',
    description: 'Reach level 10',
    icon: '🌟',
    requirement: { type: 'level', value: 10 },
    xpReward: 250,
  },
  {
    id: 'level_15',
    name: 'Routine Deity',
    description: 'Reach max level',
    icon: '✨',
    requirement: { type: 'level', value: 15 },
    xpReward: 500,
  },
]

/**
 * Helper to check if achievement is unlocked based on user data
 */
function isAchievementUnlocked(
  achievement: Achievement,
  stats: UserRoutineStats | null,
  streak: UserRoutineStreak | null
): boolean {
  switch (achievement.requirement.type) {
    case 'completions':
      return (stats?.lifetime_routines ?? 0) >= achievement.requirement.value
    case 'streak':
      return (streak?.longest_streak ?? 0) >= achievement.requirement.value
    case 'level':
      return (stats?.current_level ?? 1) >= achievement.requirement.value
    default:
      return false
  }
}

/**
 * Helper to calculate achievement progress
 */
function getAchievementProgress(
  achievement: Achievement,
  stats: UserRoutineStats | null,
  streak: UserRoutineStreak | null
): number {
  switch (achievement.requirement.type) {
    case 'completions':
      return ((stats?.lifetime_routines ?? 0) / achievement.requirement.value) * 100
    case 'streak':
      return ((streak?.longest_streak ?? 0) / achievement.requirement.value) * 100
    case 'level':
      return ((stats?.current_level ?? 1) / achievement.requirement.value) * 100
    default:
      return 0
  }
}

/**
 * Check which achievements are unlocked based on user data
 */
export function getUnlockedAchievements(
  stats: UserRoutineStats | null,
  streak: UserRoutineStreak | null
): Achievement[] {
  if (!stats && !streak) return []

  return ACHIEVEMENTS.filter((achievement) => isAchievementUnlocked(achievement, stats, streak))
    .map((a) => ({ ...a, isUnlocked: true }))
}

/**
 * Get both unlocked achievements and their IDs in a single pass
 * More efficient than calling getUnlockedAchievements + creating a Set
 */
export function getUnlockedAchievementsWithIds(
  stats: UserRoutineStats | null,
  streak: UserRoutineStreak | null
): { achievements: Achievement[]; ids: Set<string> } {
  if (!stats && !streak) return { achievements: [], ids: new Set() }

  const achievements: Achievement[] = []
  const ids = new Set<string>()

  for (const achievement of ACHIEVEMENTS) {
    if (isAchievementUnlocked(achievement, stats, streak)) {
      achievements.push({ ...achievement, isUnlocked: true })
      ids.add(achievement.id)
    }
  }

  return { achievements, ids }
}

/**
 * Check which achievements are locked but close to unlocking
 */
export function getNextAchievements(
  stats: UserRoutineStats | null,
  streak: UserRoutineStreak | null
): Array<Achievement & { progress: number }> {
  if (!stats && !streak) {
    return ACHIEVEMENTS.slice(0, 3).map((a) => ({ ...a, progress: 0, isUnlocked: false }))
  }

  // Get unlocked IDs in single pass instead of creating separate Set
  const { ids: unlockedIds } = getUnlockedAchievementsWithIds(stats, streak)

  return ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id))
    .map((achievement) => ({
      ...achievement,
      progress: Math.min(99, Math.round(getAchievementProgress(achievement, stats, streak))),
      isUnlocked: false,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)
}

/**
 * Check for newly unlocked achievements after an action
 */
export function checkNewAchievements(
  previousStats: UserRoutineStats | null,
  previousStreak: UserRoutineStreak | null,
  newStats: UserRoutineStats | null,
  newStreak: UserRoutineStreak | null
): Achievement[] {
  const previousUnlocked = new Set(getUnlockedAchievements(previousStats, previousStreak).map((a) => a.id))
  const newUnlocked = getUnlockedAchievements(newStats, newStreak)

  return newUnlocked.filter((a) => !previousUnlocked.has(a.id))
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/**
 * Group achievements by type
 */
export function groupAchievementsByType(): Record<string, Achievement[]> {
  const groups: Record<string, Achievement[]> = {
    completions: [],
    streak: [],
    level: [],
  }

  for (const achievement of ACHIEVEMENTS) {
    groups[achievement.requirement.type]?.push(achievement)
  }

  return groups
}

/**
 * Calculate total potential XP from all achievements
 */
export function getTotalAchievementXP(): number {
  return ACHIEVEMENTS.reduce((total, a) => total + a.xpReward, 0)
}

/**
 * Get completion stats for achievements
 */
export function getAchievementStats(
  stats: UserRoutineStats | null,
  streak: UserRoutineStreak | null
): {
  unlocked: number
  total: number
  xpEarned: number
  xpPotential: number
} {
  const unlocked = getUnlockedAchievements(stats, streak)
  const xpEarned = unlocked.reduce((total, a) => total + a.xpReward, 0)

  return {
    unlocked: unlocked.length,
    total: ACHIEVEMENTS.length,
    xpEarned,
    xpPotential: getTotalAchievementXP(),
  }
}
