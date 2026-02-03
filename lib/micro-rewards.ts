/**
 * Micro-Rewards System
 *
 * Provides satisfying feedback for user actions through haptics, sounds, and animations.
 */

import confetti from 'canvas-confetti'
import { hapticFeedback } from './utils'

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Sound file paths (to be added to public/sounds/)
const SOUNDS = {
  stepComplete: '/sounds/step-complete.mp3',
  routineComplete: '/sounds/routine-complete.mp3',
  levelUp: '/sounds/level-up.mp3',
  achievement: '/sounds/achievement.mp3',
  streakMilestone: '/sounds/streak-milestone.mp3',
} as const

// Cached audio instances
const audioCache: Record<string, HTMLAudioElement> = {}

/**
 * Play a sound effect (with caching)
 */
export function playSound(sound: keyof typeof SOUNDS, volume = 0.5): void {
  if (typeof window === 'undefined') return

  try {
    let audio = audioCache[sound]

    if (!audio) {
      audio = new Audio(SOUNDS[sound])
      audioCache[sound] = audio
    }

    audio.volume = volume
    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore autoplay errors - user hasn't interacted yet
    })
  } catch {
    // Audio not available
  }
}

/**
 * Preload sounds for instant playback
 */
export function preloadSounds(): void {
  if (typeof window === 'undefined') return

  Object.entries(SOUNDS).forEach(([key, path]) => {
    const audio = new Audio(path)
    audio.preload = 'auto'
    audioCache[key as keyof typeof SOUNDS] = audio
  })
}

// ============================================
// Reward Functions
// ============================================

/**
 * Reward for completing a single step
 * Light feedback - quick and subtle
 */
export function rewardStepComplete(): void {
  hapticFeedback('light')
  // No sound for individual steps to avoid noise
}

/**
 * Reward for completing a routine
 * Heavy celebration with confetti
 */
export function rewardRoutineComplete(): void {
  hapticFeedback('heavy')
  playSound('routineComplete', 0.6)

  // Skip confetti if user prefers reduced motion
  if (prefersReducedMotion()) return

  // Confetti burst from bottom (reduced particle count)
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#14b8a6', '#0d9488', '#10b981', '#22c55e', '#06b6d4'],
  })
}

/**
 * Reward for a perfect routine (no skips)
 * Extra celebration
 */
export function rewardPerfectRoutine(): void {
  hapticFeedback('heavy')
  playSound('routineComplete', 0.7)

  // Skip confetti if user prefers reduced motion
  if (prefersReducedMotion()) return

  // Double burst (reduced particle count)
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  confetti({
    ...defaults,
    particleCount: 25,
    origin: { x: 0.3, y: 0.5 },
    colors: ['#14b8a6', '#fbbf24', '#f97316'],
  })

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 25,
      origin: { x: 0.7, y: 0.5 },
      colors: ['#14b8a6', '#fbbf24', '#f97316'],
    })
  }, 100)
}

/**
 * Reward for streak milestone (7, 14, 30 days)
 * Fire-themed celebration
 */
export function rewardStreakMilestone(streakDays: number): void {
  hapticFeedback('heavy')
  playSound('streakMilestone', 0.7)

  // Skip confetti if user prefers reduced motion
  if (prefersReducedMotion()) return

  // Fire colors: orange, red, yellow
  const fireColors = ['#f97316', '#ef4444', '#eab308', '#fb923c', '#fcd34d']

  // Intensity scales with streak (reduced max particle count)
  const particleCount = Math.min(75, 30 + streakDays)

  confetti({
    particleCount,
    spread: 90,
    origin: { y: 0.6 },
    colors: fireColors,
    scalar: 1.2,
    gravity: 0.8,
  })
}

/**
 * Reward for level up
 * The most celebratory - full screen effect
 */
export function rewardLevelUp(newLevel: number): void {
  hapticFeedback('heavy')
  playSound('levelUp', 0.8)

  // Skip confetti if user prefers reduced motion
  if (prefersReducedMotion()) return

  const duration = 1500 // Reduced from 2500
  const animationEnd = Date.now() + duration
  const colors = ['#14b8a6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b']

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  // Continuous confetti for duration (reduced interval from 150 to 250ms)
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    // Reduced particle count
    const particleCount = 15 * (timeLeft / duration)

    // Left side
    confetti({
      particleCount,
      startVelocity: 35,
      spread: 70,
      origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.3, 0.5) },
      colors,
      zIndex: 9999,
    })

    // Right side
    confetti({
      particleCount,
      startVelocity: 35,
      spread: 70,
      origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.3, 0.5) },
      colors,
      zIndex: 9999,
    })
  }, 250) // Increased interval for better performance

  // Extra large burst at start for level milestones (5, 10, 15) - reduced particles
  if (newLevel % 5 === 0) {
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 180,
        origin: { y: 0.5 },
        colors,
        scalar: 1.5,
        zIndex: 9999,
      })
    }, 300)
  }
}

/**
 * Reward for unlocking an achievement
 */
export function rewardAchievementUnlock(): void {
  hapticFeedback('heavy')
  playSound('achievement', 0.7)

  // Skip confetti if user prefers reduced motion
  if (prefersReducedMotion()) return

  // Star burst effect (reduced particles)
  confetti({
    particleCount: 35,
    spread: 50,
    origin: { y: 0.4 },
    colors: ['#fbbf24', '#f59e0b', '#d97706'],
    shapes: ['star', 'circle'],
    scalar: 1.3,
  })
}

/**
 * Reward for completing a challenge
 */
export function rewardChallengeComplete(): void {
  hapticFeedback('heavy')
  playSound('achievement', 0.7)

  // Skip confetti if user prefers reduced motion
  if (prefersReducedMotion()) return

  // Trophy effect: gold burst (reduced particles)
  const goldColors = ['#fbbf24', '#f59e0b', '#d97706', '#b45309']

  confetti({
    particleCount: 50,
    spread: 80,
    origin: { y: 0.5 },
    colors: goldColors,
    scalar: 1.2,
  })
}

/**
 * Simple success feedback (for minor actions)
 */
export function rewardSuccess(): void {
  hapticFeedback('light')
}

/**
 * Warning feedback (for skipping a step, etc.)
 */
export function feedbackWarning(): void {
  hapticFeedback('light')
}

// ============================================
// XP Animation Helpers
// ============================================

/**
 * Generate floating +XP text positions
 */
export function getXPFloatPosition(): { x: number; y: number } {
  return {
    x: 50 + (Math.random() - 0.5) * 20, // 40-60% from left
    y: 30 + (Math.random() - 0.5) * 10, // 25-35% from top
  }
}
