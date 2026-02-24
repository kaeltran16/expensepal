'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, durations } from '@/lib/motion-system'

// =============================================================================
// NAVIGATION DIRECTION
// =============================================================================

type Direction = 'forward' | 'back'

/**
 * Ordered view indices for determining push/pop direction.
 * Lower index = further left in the navigation hierarchy.
 */
const VIEW_ORDER: Record<string, number> = {
  feed: 0,
  expenses: 1,
  budget: 2,
  goals: 3,
  recurring: 4,
  insights: 5,
  summary: 6,
  calories: 7,
  workouts: 8,
  routines: 9,
  profile: 10,
}

function getDirection(prev: string, next: string): Direction {
  const prevIndex = VIEW_ORDER[prev] ?? 0
  const nextIndex = VIEW_ORDER[next] ?? 0
  return nextIndex >= prevIndex ? 'forward' : 'back'
}

// =============================================================================
// DIRECTION CONTEXT (for child components that need to know)
// =============================================================================

const DirectionContext = createContext<Direction>('forward')
export const useNavigationDirection = () => useContext(DirectionContext)

// =============================================================================
// SLIDE OFFSET
// =============================================================================

const SLIDE_OFFSET = '25%'

function getSlideVariants(direction: Direction) {
  const enter = direction === 'forward' ? SLIDE_OFFSET : `-${SLIDE_OFFSET}`
  const exit = direction === 'forward' ? `-${SLIDE_OFFSET}` : SLIDE_OFFSET

  return {
    initial: { x: enter, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: exit, opacity: 0 },
  }
}

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// =============================================================================
// VIEW TRANSITION COMPONENT
// =============================================================================

interface ViewTransitionProps {
  /** Current active view key */
  activeView: string
  /** The view content to render (already wrapped in Suspense by caller) */
  children: ReactNode
}

export function ViewTransition({ activeView, children }: ViewTransitionProps) {
  const reducedMotion = useReducedMotion()
  const prevView = useRef(activeView)
  const [direction, setDirection] = useState<Direction>('forward')

  useEffect(() => {
    if (prevView.current !== activeView) {
      setDirection(getDirection(prevView.current, activeView))
      prevView.current = activeView
    }
  }, [activeView])

  const variants = reducedMotion ? reducedVariants : getSlideVariants(direction)
  const transition = reducedMotion
    ? { duration: durations.micro }
    : springs.ios

  return (
    <DirectionContext.Provider value={direction}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeView}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={transition}
          style={{ willChange: 'transform, opacity' }}
          onAnimationComplete={() => {
            // clean up will-change after animation settles
            const el = document.querySelector(`[data-view="${activeView}"]`)
            if (el instanceof HTMLElement) {
              el.style.willChange = 'auto'
            }
          }}
          data-view={activeView}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </DirectionContext.Provider>
  )
}
