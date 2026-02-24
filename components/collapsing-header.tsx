'use client'

import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { useState } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import type { ViewType } from '@/lib/constants/filters'

interface CollapsingHeaderProps {
  activeView: ViewType
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

const VIEW_TITLES: Record<ViewType, string> = {
  feed: 'Today',
  expenses: 'Expenses',
  budget: 'Budget',
  goals: 'Goals',
  calories: 'Calories',
  recurring: 'Recurring',
  summary: 'Summary',
  insights: 'Insights',
  workouts: 'Workouts',
  profile: 'Profile',
  routines: 'Routines',
}

const SCROLL_RANGE = [0, 120]

export function CollapsingHeader({ activeView, scrollContainerRef }: CollapsingHeaderProps) {
  const reducedMotion = useReducedMotion()
  const title = VIEW_TITLES[activeView]

  const { scrollY } = useScroll({ container: scrollContainerRef })

  // scroll-linked transforms
  const largeTitleOpacity = useTransform(scrollY, SCROLL_RANGE, [1, 0])
  const largeTitleScale = useTransform(scrollY, SCROLL_RANGE, [1, 0.85])
  const largeTitleHeight = useTransform(scrollY, SCROLL_RANGE, [48, 0])
  const backgroundOpacity = useTransform(scrollY, [60, 120], [0, 0.9])
  const blurAmount = useTransform(scrollY, [60, 120], [0, 20])
  const borderOpacity = useTransform(scrollY, [100, 120], [0, 1])

  // derived transforms for backdrop filter strings
  const backdropFilterStr = useTransform(blurAmount, (v) => `blur(${v}px) saturate(180%)`)

  // track scrolled state for conditional classes
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 100)
  })

  if (reducedMotion) {
    return (
      <div
        className="sticky z-40 px-4 pt-4 pb-4"
        style={{
          backgroundColor: scrolled ? 'rgba(var(--background-rgb), 0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '0.5px solid rgba(var(--ios-separator))' : 'none',
        }}
      >
        <h1 className="ios-large-title">{title}</h1>
      </div>
    )
  }

  return (
    <motion.div
      className="sticky z-40 px-4 pt-4 pb-3"
      style={{
        backgroundColor: `rgba(var(--background-rgb), ${backgroundOpacity})` as any,
        willChange: 'backdrop-filter',
      }}
    >
      {/* blur backdrop - using a separate layer for performance */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{
          backdropFilter: backdropFilterStr,
          WebkitBackdropFilter: backdropFilterStr,
        }}
      />

      {/* bottom border */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          backgroundColor: 'rgba(var(--ios-separator))',
          opacity: borderOpacity,
        }}
      />

      {/* large title - collapses on scroll */}
      <motion.div
        className="overflow-hidden"
        style={{
          height: largeTitleHeight,
          opacity: largeTitleOpacity,
          scale: largeTitleScale,
          transformOrigin: 'left center',
        }}
      >
        <h1 className="ios-large-title whitespace-nowrap">{title}</h1>
      </motion.div>
    </motion.div>
  )
}
