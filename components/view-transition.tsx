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
// DIRECTION CONTEXT
// =============================================================================

const DirectionContext = createContext<Direction>('forward')
export const useNavigationDirection = () => useContext(DirectionContext)

// =============================================================================
// ORCHESTRATED VARIANTS
// =============================================================================

function getOrchestratedVariants(direction: Direction) {
  const slideOffset = direction === 'forward' ? 60 : -60
  const exitOffset = direction === 'forward' ? -30 : 30

  return {
    container: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          duration: 0.15,
          when: 'beforeChildren',
          staggerChildren: 0.08,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          duration: 0.1,
          when: 'afterChildren',
          staggerChildren: 0.03,
          staggerDirection: -1,
        },
      },
    },
    content: {
      initial: { opacity: 0, x: slideOffset, filter: 'blur(4px)' },
      animate: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: springs.cinematic,
      },
      exit: {
        opacity: 0,
        x: exitOffset,
        filter: 'blur(2px)',
        transition: { duration: 0.15 },
      },
    },
  }
}

const reducedVariants = {
  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  content: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
}

// =============================================================================
// VIEW TRANSITION COMPONENT
// =============================================================================

interface ViewTransitionProps {
  activeView: string
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

  const v = reducedMotion ? reducedVariants : getOrchestratedVariants(direction)
  const containerTransition = reducedMotion ? { duration: durations.micro } : undefined

  return (
    <DirectionContext.Provider value={direction}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeView}
          variants={v.container}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={containerTransition}
          data-view={activeView}
        >
          <motion.div
            variants={v.content}
            style={{ willChange: 'transform, opacity, filter' }}
          >
            {children}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </DirectionContext.Provider>
  )
}
