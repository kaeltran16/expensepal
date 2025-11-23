'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Pencil, RefreshCw } from 'lucide-react'
import { hapticFeedback } from '@/lib/utils'

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

  const toggleMenu = () => {
    hapticFeedback('medium')
    setIsOpen(!isOpen)
  }

  const handleAction = (action: () => void) => {
    hapticFeedback('light')
    setIsOpen(false)
    action()
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2.5 items-end mb-3"
            >
              {actions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    transition={{
                      delay: index * 0.04,
                      type: 'spring',
                      damping: 20,
                      stiffness: 400,
                    }}
                    className="flex items-center gap-2.5"
                  >
                    {/* Label Pill */}
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.04 + 0.05 }}
                      className="
                        ios-card
                        px-3.5 py-2
                        text-sm font-medium
                        whitespace-nowrap
                        shadow-lg
                      "
                    >
                      {action.label}
                    </motion.span>

                    {/* Action Button */}
                    <motion.button
                      onClick={action.onClick}
                      disabled={action.disabled}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        w-12 h-12 rounded-full
                        bg-background
                        border-2 border-border
                        disabled:opacity-60
                        flex items-center justify-center
                        shadow-lg
                        transition-all duration-200
                      `}
                    >
                      <Icon
                        className={`h-5 w-5 ${action.iconColor} ${action.disabled && syncing ? 'animate-spin' : ''}`}
                        strokeWidth={2.5}
                      />
                    </motion.button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button - Redesigned */}
        <motion.button
          onClick={toggleMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="
            w-14 h-14 rounded-full
            bg-gradient-to-br from-primary via-primary to-purple-600
            shadow-xl
            flex items-center justify-center
            relative
            border border-white/20
          "
          style={{
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Glossy overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none" />

          {/* Icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isOpen ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="relative z-10"
            >
              {isOpen ? (
                <X className="h-6 w-6 text-white" strokeWidth={3} />
              ) : (
                <Plus className="h-6 w-6 text-white" strokeWidth={3} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pulse effect when syncing */}
          {syncing && !isOpen && (
            <motion.div
              className="absolute inset-0 rounded-full bg-green-500/30"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </motion.button>
      </div>
    </>
  )
}
