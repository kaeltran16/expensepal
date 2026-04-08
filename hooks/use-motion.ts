import { useSyncExternalStore } from 'react'
import {
  type MotionOptions,
  type MotionProps,
  type VariantName,
  durations,
  getMotionProps,
  springs,
} from '@/lib/motion-system'

// =============================================================================
// REDUCED MOTION SUBSCRIPTION
// =============================================================================

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getReducedMotionServerSnapshot(): boolean {
  return false
}

// =============================================================================
// HOOK: useReducedMotion
// =============================================================================

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
}

// =============================================================================
// PRESS PROPS (Tier 1 - CSS)
// =============================================================================

const PRESS_STYLE = {
  transition: `transform ${durations.micro * 1000}ms ease`,
  WebkitTapHighlightColor: 'transparent',
} as const

export interface PressProps {
  style: React.CSSProperties
  onTouchStart: () => void
  onTouchEnd: () => void
  onTouchCancel: () => void
}

// =============================================================================
// HOOK: useMotion
// =============================================================================

type UseMotionResult<V extends VariantName | 'press'> = V extends 'press'
  ? PressProps
  : MotionProps

export function useMotion<V extends VariantName | 'press'>(
  variant: V,
  options?: MotionOptions
): UseMotionResult<V> {
  const reducedMotion = useReducedMotion()

  // tier 1: press feedback via CSS
  if (variant === 'press') {
    if (reducedMotion) {
      return {
        style: { WebkitTapHighlightColor: 'transparent' },
        onTouchStart: () => {},
        onTouchEnd: () => {},
        onTouchCancel: () => {},
      } as UseMotionResult<V>
    }

    // press uses touch events for immediate iOS feedback
    const pressProps: PressProps = {
      style: PRESS_STYLE,
      onTouchStart: () => {},
      onTouchEnd: () => {},
      onTouchCancel: () => {},
    }
    return pressProps as UseMotionResult<V>
  }

  // tier 2: macro animations via motion props
  return getMotionProps(variant as VariantName, options) as UseMotionResult<V>
}

// re-export for convenience
export { springs, durations, type VariantName } from '@/lib/motion-system'
