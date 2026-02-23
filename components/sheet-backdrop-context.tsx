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
  /** Call when a sheet opens */
  onSheetOpen: () => void
  /** Call when a sheet closes */
  onSheetClose: () => void
}

const SheetBackdropContext = createContext<SheetBackdropContextValue>({
  onSheetOpen: () => {},
  onSheetClose: () => {},
})

export const useSheetBackdrop = () => useContext(SheetBackdropContext)

// =============================================================================
// PROVIDER
// =============================================================================

interface SheetBackdropProviderProps {
  children: ReactNode
}

/**
 * Wraps page content and scales it when any sheet is open.
 * Sheets call onSheetOpen/onSheetClose to trigger the transform.
 *
 * Multiple sheets can be open simultaneously (ref-counted).
 */
export function SheetBackdropProvider({ children }: SheetBackdropProviderProps) {
  const [openCount, setOpenCount] = useState(0)
  const reducedMotion = useReducedMotion()

  const onSheetOpen = useCallback(() => setOpenCount((c) => c + 1), [])
  const onSheetClose = useCallback(() => setOpenCount((c) => Math.max(0, c - 1)), [])

  const isOpen = openCount > 0

  const contextValue = useMemo(
    () => ({ onSheetOpen, onSheetClose }),
    [onSheetOpen, onSheetClose]
  )

  return (
    <SheetBackdropContext.Provider value={contextValue}>
      <motion.div
        animate={
          isOpen && !reducedMotion
            ? { scale: 0.94, borderRadius: '10px', filter: 'brightness(0.85)' }
            : { scale: 1, borderRadius: '0px', filter: 'brightness(1)' }
        }
        transition={springs.sheet}
        style={{
          transformOrigin: 'top center',
          willChange: isOpen ? 'transform, filter' : 'auto',
        }}
      >
        {children}
      </motion.div>
    </SheetBackdropContext.Provider>
  )
}
