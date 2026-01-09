/**
 * Workout Achievements System
 * Defines all achievements and logic for unlocking them
 */

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'workout' | 'streak' | 'strength' | 'milestone'
  requirement: {
    type: 'workout_count' | 'streak_days' | 'pr_count' | 'total_volume' | 'single_workout_volume' | 'exercise_weight'
    value: number
    exerciseId?: string
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  // Workout Count Achievements
  {
    id: 'first_workout',
    name: 'First Steps',
    description: 'Complete your first workout',
    icon: '🎯',
    category: 'workout',
    requirement: { type: 'workout_count', value: 1 }
  },
  {
    id: 'workout_10',
    name: 'Getting Serious',
    description: 'Complete 10 workouts',
    icon: '💪',
    category: 'workout',
    requirement: { type: 'workout_count', value: 10 }
  },
  {
    id: 'workout_25',
    name: 'Dedicated',
    description: 'Complete 25 workouts',
    icon: '🔥',
    category: 'workout',
    requirement: { type: 'workout_count', value: 25 }
  },
  {
    id: 'workout_50',
    name: 'Half Century',
    description: 'Complete 50 workouts',
    icon: '⭐',
    category: 'workout',
    requirement: { type: 'workout_count', value: 50 }
  },
  {
    id: 'workout_100',
    name: 'Century Club',
    description: 'Complete 100 workouts',
    icon: '🏆',
    category: 'workout',
    requirement: { type: 'workout_count', value: 100 }
  },

  // Streak Achievements
  {
    id: 'streak_3',
    name: 'Consistency',
    description: 'Maintain a 3-day workout streak',
    icon: '📅',
    category: 'streak',
    requirement: { type: 'streak_days', value: 3 }
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    icon: '🗓️',
    category: 'streak',
    requirement: { type: 'streak_days', value: 7 }
  },
  {
    id: 'streak_14',
    name: 'Two Week Titan',
    description: 'Maintain a 14-day workout streak',
    icon: '💎',
    category: 'streak',
    requirement: { type: 'streak_days', value: 14 }
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day workout streak',
    icon: '👑',
    category: 'streak',
    requirement: { type: 'streak_days', value: 30 }
  },

  // Strength Achievements
  {
    id: 'first_pr',
    name: 'Personal Best',
    description: 'Set your first personal record',
    icon: '🥇',
    category: 'strength',
    requirement: { type: 'pr_count', value: 1 }
  },
  {
    id: 'pr_10',
    name: 'Record Breaker',
    description: 'Set 10 personal records',
    icon: '🏅',
    category: 'strength',
    requirement: { type: 'pr_count', value: 10 }
  },

  // Volume Achievements
  {
    id: 'volume_10k',
    name: 'Heavy Lifter',
    description: 'Lift 10,000 kg total volume',
    icon: '🏋️',
    category: 'milestone',
    requirement: { type: 'total_volume', value: 10000 }
  },
  {
    id: 'volume_50k',
    name: 'Iron Will',
    description: 'Lift 50,000 kg total volume',
    icon: '⚡',
    category: 'milestone',
    requirement: { type: 'total_volume', value: 50000 }
  },
  {
    id: 'volume_100k',
    name: 'Centurion',
    description: 'Lift 100,000 kg total volume',
    icon: '🦁',
    category: 'milestone',
    requirement: { type: 'total_volume', value: 100000 }
  },

  // Single Workout Volume
  {
    id: 'single_workout_5k',
    name: 'Big Session',
    description: 'Lift 5,000 kg in a single workout',
    icon: '💥',
    category: 'milestone',
    requirement: { type: 'single_workout_volume', value: 5000 }
  },
  {
    id: 'single_workout_10k',
    name: 'Monster Workout',
    description: 'Lift 10,000 kg in a single workout',
    icon: '🦍',
    category: 'milestone',
    requirement: { type: 'single_workout_volume', value: 10000 }
  }
]

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}

export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}

/**
 * Check which achievements should be unlocked based on user stats
 */
export function checkAchievements(
  stats: {
    totalWorkouts: number
    currentStreak: number
    longestStreak: number
    totalPRs: number
    totalVolume: number
    latestWorkoutVolume?: number
  },
  existingAchievements: string[]
): Achievement[] {
  const newAchievements: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (existingAchievements.includes(achievement.id)) continue

    let shouldUnlock = false

    switch (achievement.requirement.type) {
      case 'workout_count':
        shouldUnlock = stats.totalWorkouts >= achievement.requirement.value
        break
      case 'streak_days':
        shouldUnlock = stats.currentStreak >= achievement.requirement.value ||
                       stats.longestStreak >= achievement.requirement.value
        break
      case 'pr_count':
        shouldUnlock = stats.totalPRs >= achievement.requirement.value
        break
      case 'total_volume':
        shouldUnlock = stats.totalVolume >= achievement.requirement.value
        break
      case 'single_workout_volume':
        shouldUnlock = (stats.latestWorkoutVolume || 0) >= achievement.requirement.value
        break
    }

    if (shouldUnlock) {
      newAchievements.push(achievement)
    }
  }

  return newAchievements
}

/**
 * Calculate streak based on workout dates
 * A streak continues if workouts are on consecutive days or within 1 rest day
 */
export function calculateStreak(
  workoutDates: Date[],
  allowRestDays: number = 1
): { currentStreak: number; longestStreak: number; streakStartDate: Date | null } {
  if (workoutDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, streakStartDate: null }
  }

  // Sort dates in descending order (most recent first)
  const sortedDates = [...workoutDates]
    .sort((a, b) => b.getTime() - a.getTime())
    .map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate())) // Normalize to midnight

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let streakStartDate: Date | null = null
  let currentStreakStart: Date | null = null

  // Check if the most recent workout was today or yesterday
  const lastWorkout = sortedDates[0]!
  const daysSinceLastWorkout = Math.floor((today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceLastWorkout > allowRestDays + 1) {
    // Streak is broken
    currentStreak = 0
  } else {
    // Count current streak
    let expectedDate = lastWorkout
    currentStreakStart = lastWorkout

    for (let i = 0; i < sortedDates.length; i++) {
      const workoutDate = sortedDates[i]!
      const daysDiff = Math.floor((expectedDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff <= allowRestDays + 1) {
        currentStreak++
        expectedDate = new Date(workoutDate.getTime() - (24 * 60 * 60 * 1000))
        currentStreakStart = workoutDate
      } else {
        break
      }
    }
    streakStartDate = currentStreakStart
  }

  // Calculate longest streak
  tempStreak = 1
  let tempStreakStart = sortedDates[sortedDates.length - 1]!

  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const prevDate = sortedDates[i + 1]!
    const currDate = sortedDates[i]!
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= allowRestDays + 1) {
      tempStreak++
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak
      }
      tempStreak = 1
      tempStreakStart = currDate
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak)

  return { currentStreak, longestStreak, streakStartDate }
}
