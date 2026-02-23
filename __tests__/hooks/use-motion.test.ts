import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMotion, useReducedMotion } from '@/hooks/use-motion'
import {
  getMotionProps,
  getStaggerDelay,
  rubberBand,
  variants,
  springs,
  durations,
} from '@/lib/motion-system'

// =============================================================================
// PURE FUNCTIONS (motion-system.ts)
// =============================================================================

describe('motion-system', () => {
  describe('getStaggerDelay', () => {
    it('should return index * 10ms', () => {
      expect(getStaggerDelay(0)).toBe(0)
      expect(getStaggerDelay(1)).toBe(0.01)
      expect(getStaggerDelay(5)).toBe(0.05)
    })

    it('should cap at max items (10)', () => {
      expect(getStaggerDelay(10)).toBe(0.1)
      expect(getStaggerDelay(20)).toBe(0.1)
    })
  })

  describe('rubberBand', () => {
    it('should apply iOS rubber-band formula', () => {
      expect(rubberBand(100)).toBeCloseTo(55)
      expect(rubberBand(0)).toBe(0)
    })

    it('should accept custom dimension multiplier', () => {
      expect(rubberBand(100, 0.5)).toBeCloseTo(27.5)
    })
  })

  describe('getMotionProps', () => {
    beforeEach(() => {
      // ensure matchMedia returns false (no reduced motion)
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    })

    it('should return correct props for fade variant', () => {
      const props = getMotionProps('fade')
      expect(props.initial).toEqual({ opacity: 0 })
      expect(props.animate).toEqual({ opacity: 1 })
      expect(props.exit).toEqual({ opacity: 0 })
    })

    it('should return correct props for slideUp variant', () => {
      const props = getMotionProps('slideUp')
      expect(props.initial).toEqual({ opacity: 0, y: 16 })
      expect(props.animate).toEqual({ opacity: 1, y: 0 })
      expect(props.exit).toEqual({ opacity: 0, y: 8 })
    })

    it('should return correct props for slideDown variant', () => {
      const props = getMotionProps('slideDown')
      expect(props.initial).toEqual({ opacity: 0, y: -16 })
      expect(props.animate).toEqual({ opacity: 1, y: 0 })
      expect(props.exit).toEqual({ opacity: 0, y: -8 })
    })

    it('should return correct props for scale variant', () => {
      const props = getMotionProps('scale')
      expect(props.initial).toEqual({ opacity: 0, scale: 0.96 })
      expect(props.animate).toEqual({ opacity: 1, scale: 1 })
      expect(props.exit).toEqual({ opacity: 0, scale: 0.96 })
    })

    it('should return correct props for sheet variant', () => {
      const props = getMotionProps('sheet')
      expect(props.initial).toEqual({ y: '100%' })
      expect(props.animate).toEqual({ y: 0 })
      expect(props.exit).toEqual({ y: '100%' })
      // sheet uses sheet spring
      expect(props.transition).toMatchObject({
        type: 'spring',
        damping: springs.sheet.damping,
      })
    })

    it('should use ios spring for non-sheet variants', () => {
      const props = getMotionProps('fade')
      expect(props.transition).toMatchObject({
        type: 'spring',
        damping: springs.ios.damping,
        stiffness: springs.ios.stiffness,
      })
    })

    it('should add stagger delay', () => {
      const props = getMotionProps('slideUp', { stagger: 3 })
      expect(props.transition).toHaveProperty('delay', 0.03)
    })

    it('should return reduced variants when prefers-reduced-motion', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const props = getMotionProps('slideUp')
      // reduced motion maps slideUp to fade
      expect(props.initial).toEqual({ opacity: 0 })
      expect(props.animate).toEqual({ opacity: 1 })
      expect(props.exit).toEqual({ opacity: 0 })
      expect(props.transition).toEqual({ duration: durations.micro })
    })

    it('should skip stagger delay when prefers-reduced-motion', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const props = getMotionProps('slideUp', { stagger: 5 })
      expect(props.transition).not.toHaveProperty('delay')
    })
  })
})

// =============================================================================
// HOOKS
// =============================================================================

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('should return false by default', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})

describe('useMotion', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('should return motion props for tier 2 variants', () => {
    const { result } = renderHook(() => useMotion('slideUp'))
    expect(result.current).toHaveProperty('initial')
    expect(result.current).toHaveProperty('animate')
    expect(result.current).toHaveProperty('exit')
    expect(result.current).toHaveProperty('transition')
  })

  it('should return press props for tier 1 press variant', () => {
    const { result } = renderHook(() => useMotion('press'))
    expect(result.current).toHaveProperty('style')
    expect(result.current).toHaveProperty('onTouchStart')
    expect(result.current).toHaveProperty('onTouchEnd')
    expect(result.current).toHaveProperty('onTouchCancel')
  })

  it('should support stagger option', () => {
    const { result } = renderHook(() => useMotion('slideUp', { stagger: 2 }))
    const props = result.current as { transition: { delay?: number } }
    expect(props.transition.delay).toBe(0.02)
  })

  it('should return minimal press props when reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useMotion('press'))
    const props = result.current as { style: React.CSSProperties }
    expect(props.style).toEqual({ WebkitTapHighlightColor: 'transparent' })
  })
})
