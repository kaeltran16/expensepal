/**
 * Framer Motion Mock
 *
 * Mocks Framer Motion components to avoid animation-related issues in tests.
 */

import { vi } from 'vitest'
import React from 'react'

// Create mock motion components that render their children directly
const createMockMotionComponent = (element: keyof JSX.IntrinsicElements) => {
  return React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
    (props, ref) => {
      // Filter out framer-motion specific props
      const {
        initial,
        animate,
        exit,
        transition,
        variants,
        whileHover,
        whileTap,
        whileFocus,
        whileInView,
        layout,
        layoutId,
        drag,
        dragConstraints,
        onAnimationStart,
        onAnimationComplete,
        ...rest
      } = props as Record<string, unknown>

      return React.createElement(element, { ...rest, ref })
    }
  )
}

// Mock AnimatePresence to just render children
const MockAnimatePresence = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children)
}

// Export mocked motion object
export const motion = {
  div: createMockMotionComponent('div'),
  span: createMockMotionComponent('span'),
  button: createMockMotionComponent('button'),
  p: createMockMotionComponent('p'),
  h1: createMockMotionComponent('h1'),
  h2: createMockMotionComponent('h2'),
  h3: createMockMotionComponent('h3'),
  section: createMockMotionComponent('section'),
  article: createMockMotionComponent('article'),
  nav: createMockMotionComponent('nav'),
  ul: createMockMotionComponent('ul'),
  li: createMockMotionComponent('li'),
  a: createMockMotionComponent('a'),
  img: createMockMotionComponent('img'),
}

export const AnimatePresence = MockAnimatePresence

// Mock the framer-motion module
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    motion,
    AnimatePresence: MockAnimatePresence,
    // Mock useAnimation hook
    useAnimation: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    })),
    // Mock useInView hook
    useInView: vi.fn(() => true),
    // Mock useScroll hook
    useScroll: vi.fn(() => ({
      scrollX: { get: () => 0 },
      scrollY: { get: () => 0 },
      scrollXProgress: { get: () => 0 },
      scrollYProgress: { get: () => 0 },
    })),
    // Mock useTransform hook
    useTransform: vi.fn((value) => value),
  }
})
