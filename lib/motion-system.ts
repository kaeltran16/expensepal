/**
 * iOS-native motion system
 *
 * Replaces animation-config.ts with a simplified, tier-based system
 * matching Apple's 6 core motion patterns.
 *
 * Tier 1: Micro (< 150ms) - CSS transitions, immediate feedback
 * Tier 2: Macro (150-400ms) - spring physics, spatial orientation
 * Tier 3: Celebratory - handled by existing micro-rewards system
 */

// =============================================================================
// SPRINGS (4 iOS-tuned presets)
// =============================================================================

export const springs = {
  /** UISpringTimingParameters default - most transitions */
  ios: {
    type: 'spring' as const,
    damping: 26,
    stiffness: 300,
    mass: 1.0,
  },
  /** Sheet presentation spring */
  sheet: {
    type: 'spring' as const,
    damping: 30,
    stiffness: 250,
    mass: 1.2,
  },
  /** Touch feedback - quick settle */
  touch: {
    type: 'spring' as const,
    damping: 22,
    stiffness: 400,
    mass: 0.8,
  },
  /** Gesture release - snap to position */
  drag: {
    type: 'spring' as const,
    damping: 35,
    stiffness: 500,
    mass: 1.0,
  },
  /** Cinematic entrance - softer, more dramatic */
  cinematic: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 200,
    mass: 1.2,
  },
} as const

// =============================================================================
// EASINGS (2 presets)
// =============================================================================

export const easings = {
  /** Default tween */
  ease: [0.25, 0.1, 0.25, 1.0] as const,
  /** Element entrances */
  easeOut: [0, 0, 0.2, 1] as const,
} as const

// =============================================================================
// DURATIONS (3 presets)
// =============================================================================

export const durations = {
  /** Tier 1 only - micro interactions */
  micro: 0.1,
  /** Most tier 2 transitions */
  standard: 0.25,
  /** Large surfaces, dramatic reveals */
  slow: 0.4,
} as const

// =============================================================================
// VARIANTS (5 presets, asymmetric exits)
// =============================================================================

export const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  },
  slideDown: {
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  sheet: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
} as const

// =============================================================================
// CHOREOGRAPHY (scroll-reveal & stagger orchestration)
// =============================================================================

export const choreography = {
  /** Viewport reveal - larger travel for dramatic entrance */
  reveal: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  /** Subtle reveal for list items */
  revealSubtle: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  },
  /** Orchestrated container - drives staggerChildren */
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.03,
        staggerDirection: -1,
      },
    },
  },
  /** Child item for stagger container */
  staggerItem: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
} as const

export const reducedChoreography: Record<keyof typeof choreography, typeof variants.fade> = {
  reveal: variants.fade,
  revealSubtle: variants.fade,
  staggerContainer: { initial: {}, animate: {}, exit: {} } as any,
  staggerItem: variants.fade,
}

export type ChoreographyName = keyof typeof choreography

// =============================================================================
// REDUCED MOTION VARIANTS
// =============================================================================

const reducedVariants: Record<VariantName, typeof variants.fade> = {
  fade: variants.fade,
  slideUp: variants.fade,
  slideDown: variants.fade,
  scale: variants.fade,
  sheet: variants.fade,
}

// =============================================================================
// STAGGER
// =============================================================================

/** Max 10ms between items per iOS "content as unit" pattern */
const STAGGER_DELAY = 0.01
const STAGGER_MAX_ITEMS = 10

export function getStaggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ITEMS) * STAGGER_DELAY
}

// =============================================================================
// RUBBER-BAND PHYSICS
// =============================================================================

/** iOS overscroll formula: resistance increases non-linearly past constraints */
export function rubberBand(distance: number, dimension: number = 1): number {
  return distance * dimension * 0.55
}

// =============================================================================
// PREFERS REDUCED MOTION
// =============================================================================

export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// =============================================================================
// MOTION PROPS BUILDER
// =============================================================================

export type VariantName = keyof typeof variants
export type SpringName = keyof typeof springs

export interface MotionOptions {
  stagger?: number
}

export interface MotionProps {
  initial: Record<string, unknown>
  animate: Record<string, unknown>
  exit: Record<string, unknown>
  transition: Record<string, unknown>
}

/**
 * Build motion props for a given variant.
 * Respects prefers-reduced-motion automatically.
 */
export function getMotionProps(
  variant: VariantName,
  options?: MotionOptions
): MotionProps {
  const reduced = getPrefersReducedMotion()
  const v = reduced ? reducedVariants[variant] : variants[variant]

  const spring = variant === 'sheet' ? springs.sheet : springs.ios
  const transition: Record<string, unknown> = reduced
    ? { duration: durations.micro }
    : { ...spring }

  if (options?.stagger !== undefined && !reduced) {
    transition.delay = getStaggerDelay(options.stagger)
  }

  return {
    initial: { ...v.initial },
    animate: { ...v.animate },
    exit: { ...v.exit },
    transition,
  }
}

/**
 * CSS transition string for tier 1 micro animations.
 * Returns empty string when reduced motion is preferred.
 */
export function getMicroTransition(
  properties: string[] = ['transform', 'opacity']
): string {
  if (getPrefersReducedMotion()) return 'none'
  return properties
    .map((p) => `${p} ${durations.micro * 1000}ms ease`)
    .join(', ')
}
