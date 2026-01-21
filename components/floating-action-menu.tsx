'use client'

import { springs, variants, durations, easings, getFabItemTransition } from '@/lib/animation-config'
import { hapticFeedback } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Plus, X, Pencil, RefreshCw } from 'lucide-react'

interface FloatingActionMenuProps {
  onAddExpense: () => void
  onSyncEmails: () => void
  syncing?: boolean
}

export function FloatingActionMenu({
  onAddExpense,
  onSyncEmails,
  syncing = false,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])

  // Mouse tracking for magnetic effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 20, stiffness: 300 }
  const x = useSpring(useTransform(mouseX, [-100, 100], [-8, 8]), springConfig)
  const y = useSpring(useTransform(mouseY, [-100, 100], [-8, 8]), springConfig)

  const toggleMenu = () => {
    hapticFeedback('medium')
    setIsOpen(!isOpen)
  }

  const handleAction = (action: () => void) => {
    hapticFeedback('light')
    setIsOpen(false)
    action()
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id))
    }, 600)
  }

  const actions = [
    {
      icon: Pencil,
      label: 'Add Expense',
      onClick: () => handleAction(onAddExpense),
      gradient: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-500',
    },
    {
      icon: RefreshCw,
      label: 'Sync Emails',
      onClick: () => handleAction(onSyncEmails),
      gradient: 'from-green-500 to-green-600',
      iconColor: 'text-green-500',
      disabled: syncing,
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...variants.fade}
            transition={{ duration: durations.fast, ease: easings.ios }}
            onClick={toggleMenu}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            style={{ WebkitBackdropFilter: 'blur(8px)' }}
          />
        )}
      </AnimatePresence>

      {/* Action Menu */}
      <div
        className="fixed right-4 z-50"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        {/* Action Buttons */}
        <AnimatePresence mode="popLayout">
          {isOpen && (
            <motion.div
              {...variants.fade}
              transition={{ duration: durations.fast }}
              className="absolute bottom-16 right-0 flex flex-col gap-2.5 items-end mb-3"
            >
              {actions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.3, y: 20, x: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.3, y: 20, x: 20 }}
                    transition={{
                      type: 'spring',
                      damping: 15,
                      stiffness: 300,
                      delay: index * 0.05,
                    }}
                    className="flex items-center gap-3 will-animate-all"
                  >
                    {/* Label Pill */}
                    <motion.span
                      initial={{ opacity: 0, x: 10, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 10, scale: 0.9 }}
                      transition={{
                        delay: index * 0.05 + 0.1,
                        type: 'spring',
                        damping: 20,
                        stiffness: 300,
                      }}
                      className="
                        ios-card
                        px-4 py-2.5
                        text-sm font-semibold
                        whitespace-nowrap
                        shadow-xl
                        border border-border/50
                      "
                      style={{
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      {action.label}
                    </motion.span>

                    {/* Action Button */}
                    <motion.button
                      data-testid={action.label === 'Add Expense' ? 'add-expense-action' : 'sync-emails-action'}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9, rotate: -5 }}
                      className={`
                        relative
                        w-14 h-14 rounded-full
                        bg-gradient-to-br ${action.gradient}
                        disabled:opacity-60 disabled:grayscale
                        flex items-center justify-center
                        shadow-2xl
                        border border-white/30
                        transition-all duration-200
                        overflow-hidden
                      `}
                      style={{
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {/* Glossy overlay */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none" />

                      {/* Icon */}
                      <Icon
                        className={`relative z-10 h-6 w-6 text-white ${action.disabled && syncing ? 'animate-spin' : ''}`}
                        strokeWidth={2.5}
                      />

                      {/* Shine effect on hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                        initial={{ x: '-100%', opacity: 0 }}
                        whileHover={{ x: '100%', opacity: 1 }}
                        transition={{ duration: 0.6 }}
                      />
                    </motion.button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button - Enhanced */}
        <motion.button
          data-testid="fab-menu"
          onClick={(e) => {
            createRipple(e)
            toggleMenu()
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{ x, y }}
          className="
            relative
            w-16 h-16 rounded-full
            bg-gradient-to-br from-primary via-primary to-purple-600
            shadow-2xl
            flex items-center justify-center
            border border-white/30
            overflow-hidden
          "
        >
          {/* Enhanced shadow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 -2px 8px rgba(0, 0, 0, 0.1)',
            }}
          />

          {/* Glossy overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none" />

          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 via-primary to-blue-500"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ opacity: 0.3 }}
          />

          {/* Ripple effects */}
          <AnimatePresence>
            {ripples.map((ripple) => (
              <motion.div
                key={ripple.id}
                className="absolute rounded-full bg-white/30"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: 0,
                  height: 0,
                }}
                initial={{ width: 0, height: 0, opacity: 1 }}
                animate={{ width: 120, height: 120, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>

          {/* Icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isOpen ? 'close' : 'open'}
              initial={{ rotate: isOpen ? -180 : 180, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: isOpen ? 180 : -180, opacity: 0, scale: 0.5 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
              }}
              className="relative z-10"
            >
              {isOpen ? (
                <X className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={3} />
              ) : (
                <Plus className="h-7 w-7 text-white drop-shadow-lg" strokeWidth={3} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pulse effect when syncing */}
          <AnimatePresence>
            {syncing && !isOpen && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-500/40"
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-500/30"
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0, 0.4],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.3,
                  }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-0"
            style={{
              background: 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%)',
            }}
            animate={{
              x: ['-100%', '200%'],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          />
        </motion.button>
      </div>
    </>
  )
}
