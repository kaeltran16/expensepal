/**
 * Motion Mock
 *
 * Mocks motion/react components to avoid animation-related issues in tests.
 */

import { vi } from 'vitest'
import React from 'react'

// Create mock motion components that render their children directly
const createMockMotionComponent = (element: keyof JSX.IntrinsicElements) => {
  return React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
    (props, ref) => {
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
  circle: createMockMotionComponent('circle'),
  path: createMockMotionComponent('path'),
}

export const AnimatePresence = MockAnimatePresence

// Mock the motion/react module
vi.mock('motion/react', async () => {
  const actual = await vi.importActual('motion/react')
  return {
    ...actual,
    motion,
    AnimatePresence: MockAnimatePresence,
    useAnimation: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    })),
    useInView: vi.fn(() => true),
    useScroll: vi.fn(() => ({
      scrollX: { get: () => 0 },
      scrollY: { get: () => 0 },
      scrollXProgress: { get: () => 0 },
      scrollYProgress: { get: () => 0 },
    })),
    useTransform: vi.fn((value) => value),
  }
})
