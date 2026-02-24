'use client'

import { motion } from 'motion/react'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs } from '@/lib/motion-system'

// =============================================================================
// CONTEXT
// =============================================================================

interface SheetBackdropContextValue {
  onSheetOpen: () => void
  onSheetClose: () => void
  isOpen: boolean
}

const SheetBackdropContext = createContext<SheetBackdropContextValue>({
  onSheetOpen: () => {},
  onSheetClose: () => {},
  isOpen: false,
})

export const useSheetBackdrop = () => useContext(SheetBackdropContext)

// =============================================================================
// PROVIDER (context only -- no DOM wrapper)
// =============================================================================

interface SheetBackdropProviderProps {
  children: ReactNode
}

/**
 * Provides sheet open/close context. Does NOT apply any CSS transforms so
 * children with position:fixed (sheets, bottom nav) are not affected.
 *
 * Pair with <SheetBackdropContent> around the scrollable area that should
 * scale when a sheet is open.
 */
export function SheetBackdropProvider({ children }: SheetBackdropProviderProps) {
  const [openCount, setOpenCount] = useState(0)

  const onSheetOpen = useCallback(() => setOpenCount((c) => c + 1), [])
  const onSheetClose = useCallback(() => setOpenCount((c) => Math.max(0, c - 1)), [])

  const isOpen = openCount > 0

  const contextValue = useMemo(
    () => ({ onSheetOpen, onSheetClose, isOpen }),
    [onSheetOpen, onSheetClose, isOpen]
  )

  return (
    <SheetBackdropContext.Provider value={contextValue}>
      {children}
    </SheetBackdropContext.Provider>
  )
}

// =============================================================================
// CONTENT WRAPPER (applies scale/filter transform)
// =============================================================================

/**
 * Wraps the scrollable page content and scales it down when a sheet is open.
 * Must be rendered inside <SheetBackdropProvider>.
 *
 * Do NOT place position:fixed elements inside this -- the CSS transforms
 * create a containing block that breaks fixed positioning.
 */
export function SheetBackdropContent({ children }: { children: ReactNode }) {
  const { isOpen } = useSheetBackdrop()
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      animate={
        isOpen && !reducedMotion
          ? { scale: 0.96, borderRadius: '16px', filter: 'brightness(0.88) saturate(0.9)' }
          : { scale: 1, borderRadius: '0px', filter: 'brightness(1) saturate(1)' }
      }
      transition={springs.sheet}
      style={{
        transformOrigin: 'top center',
        willChange: isOpen ? 'transform, filter' : 'auto',
      }}
    >
      {children}
    </motion.div>
  )
}
