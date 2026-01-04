/**
 * iOS-Native Animation Configuration
 *
 * Based on Apple's Human Interface Guidelines for motion:
 * - Natural, fluid spring physics
 * - GPU-accelerated properties only (transform, opacity)
 * - Consistent timing for predictable UX
 *
 * @see https://developer.apple.com/design/human-interface-guidelines/motion
 */

// =============================================================================
// SPRING CONFIGURATIONS
// =============================================================================

/**
 * iOS uses specific spring physics for different interaction types.
 * These values are calibrated to feel native on iOS devices.
 */
export const springs = {
  /**
   * Default spring - used for most UI transitions
   * Feels responsive but not jarring
   */
  default: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 300,
    mass: 1,
  },

  /**
   * Snappy spring - for quick, responsive interactions
   * Used for: button presses, toggles, small elements
   */
  snappy: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 400,
    mass: 0.8,
  },

  /**
   * Gentle spring - for larger elements and sheets
   * Used for: modals, sheets, large cards
   */
  gentle: {
    type: 'spring' as const,
    damping: 30,
    stiffness: 250,
    mass: 1,
  },

  /**
   * Bouncy spring - for playful, attention-grabbing animations
   * Used for: empty states, success feedback, icons
   */
  bouncy: {
    type: 'spring' as const,
    damping: 15,
    stiffness: 300,
    mass: 0.8,
  },

  /**
   * Stiff spring - for precise, controlled movements
   * Used for: drag interactions, swipe gestures
   */
  stiff: {
    type: 'spring' as const,
    damping: 35,
    stiffness: 500,
    mass: 1,
  },
} as const

// =============================================================================
// EASING CURVES
// =============================================================================

/**
 * iOS standard easing curves
 * These match UIKit's CAMediaTimingFunction presets
 */
export const easings = {
  /**
   * iOS default ease - matches system animations
   * Equivalent to UIKit's .easeInOut
   */
  ios: [0.4, 0, 0.2, 1] as const,

  /**
   * iOS ease out - for elements entering the screen
   * Equivalent to UIKit's .easeOut
   */
  iosOut: [0, 0, 0.2, 1] as const,

  /**
   * iOS ease in - for elements exiting the screen
   * Equivalent to UIKit's .easeIn
   */
  iosIn: [0.4, 0, 1, 1] as const,

  /**
   * Overshoot ease - for playful, bouncy effects
   * Use sparingly for emphasis
   */
  overshoot: [0.175, 0.885, 0.32, 1.275] as const,
} as const

// =============================================================================
// DURATION PRESETS
// =============================================================================

/**
 * Standard durations matching iOS system animations
 */
export const durations = {
  /** Ultra fast - for micro-interactions (50ms) */
  instant: 0.05,

  /** Fast - for quick feedback (150ms) */
  fast: 0.15,

  /** Normal - for most transitions (250ms) */
  normal: 0.25,

  /** Medium - for larger elements (350ms) */
  medium: 0.35,

  /** Slow - for dramatic entrances (500ms) */
  slow: 0.5,

  /** Progress bars, loaders (600ms) */
  progress: 0.6,
} as const

// =============================================================================
// STAGGER TIMING
// =============================================================================

/**
 * Stagger delay values for list animations
 * Consistent timing creates rhythmic, predictable motion
 */
export const stagger = {
  /** Fast stagger - for quick lists (30ms between items) */
  fast: 0.03,

  /** Normal stagger - for most lists (50ms between items) */
  normal: 0.05,

  /** Slow stagger - for dramatic reveals (80ms between items) */
  slow: 0.08,

  /** Maximum items to stagger (prevents long delays) */
  maxItems: 10,
} as const

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

/**
 * Pre-configured animation variants for common patterns
 * Use GPU-accelerated properties only (transform, opacity)
 */
export const variants = {
  /**
   * Fade in/out - simple opacity transition
   */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  /**
   * Scale fade - for modals, dialogs
   */
  scaleFade: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  /**
   * Slide up - for bottom sheets, cards entering from below
   */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  /**
   * Slide down - for top notifications, dropdowns
   */
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  /**
   * Slide from right - for side panels
   */
  slideRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },

  /**
   * Bottom sheet - full screen sheets (transform only, no opacity)
   */
  bottomSheet: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },

  /**
   * List item - for staggered list animations
   * No blur filter (GPU expensive)
   */
  listItem: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 },
  },

  /**
   * Card expansion content - opacity only (no height animation)
   */
  cardExpand: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  /**
   * Card expansion inner content - subtle slide
   */
  cardExpandContent: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
} as const

// =============================================================================
// TRANSITION PRESETS
// =============================================================================

/**
 * Complete transition objects ready to spread into motion components
 */
export const transitions = {
  /** Default spring transition */
  spring: springs.default,

  /** Fast tween for simple fades */
  fade: {
    duration: durations.fast,
    ease: easings.ios,
  },

  /** Modal/dialog entrance */
  modal: springs.gentle,

  /** Bottom sheet entrance */
  sheet: springs.gentle,

  /** Progress bar animation */
  progress: {
    duration: durations.progress,
    ease: easings.ios,
  },

  /** Icon/button press feedback */
  press: springs.snappy,

  /** Playful bounce for empty states */
  bounce: springs.bouncy,
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a staggered delay for list animations
 * Caps the delay to prevent excessively long animations
 */
export function getStaggerDelay(
  index: number,
  timing: keyof typeof stagger = 'normal'
): number {
  if (timing === 'maxItems') return 0
  const maxIndex = stagger.maxItems
  const delay = stagger[timing]
  return Math.min(index, maxIndex) * delay
}

/**
 * Creates a complete transition for list items with stagger
 */
export function getListItemTransition(index: number, timing: keyof typeof stagger = 'normal') {
  return {
    ...springs.default,
    delay: getStaggerDelay(index, timing),
  }
}

/**
 * Creates a complete transition for FAB menu items
 */
export function getFabItemTransition(index: number) {
  return {
    ...springs.snappy,
    delay: getStaggerDelay(index, 'fast'),
  }
}

/**
 * Type-safe spring getter
 */
export function getSpring(name: keyof typeof springs) {
  return springs[name]
}

/**
 * Type-safe easing getter
 */
export function getEasing(name: keyof typeof easings) {
  return easings[name]
}

/**
 * Type-safe duration getter
 */
export function getDuration(name: keyof typeof durations) {
  return durations[name]
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SpringName = keyof typeof springs
export type EasingName = keyof typeof easings
export type DurationName = keyof typeof durations
export type StaggerTiming = Exclude<keyof typeof stagger, 'maxItems'>
export type VariantName = keyof typeof variants
