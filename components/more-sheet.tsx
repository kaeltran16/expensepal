'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Target, Repeat, User, ChevronRight, X, Sparkles } from 'lucide-react'
import type { ViewType } from '@/lib/constants/filters'
import { hapticFeedback } from '@/lib/utils'

interface MoreSheetProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: ViewType) => void
  activeView: ViewType
}

const MORE_ITEMS = [
  { id: 'routines' as const, label: 'Routines', description: 'Daily habits & XP rewards', icon: Sparkles, color: 'text-teal-500' },
  { id: 'calories' as const, label: 'Calories', description: 'Track meals & nutrition', icon: Flame, color: 'text-orange-500' },
  { id: 'budget' as const, label: 'Budget', description: 'Manage spending limits', icon: Target, color: 'text-blue-500' },
  { id: 'recurring' as const, label: 'Recurring', description: 'Subscriptions & bills', icon: Repeat, color: 'text-green-500' },
  { id: 'profile' as const, label: 'Profile', description: 'Settings & preferences', icon: User, color: 'text-purple-500' },
]

export function MoreSheet({ isOpen, onClose, onNavigate, activeView }: MoreSheetProps) {
  const handleItemClick = (viewId: ViewType) => {
    hapticFeedback('light')
    onNavigate(viewId)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-lg font-semibold">More</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 pb-6">
              <div className="ios-list-group">
                {MORE_ITEMS.map((item, index) => {
                  const Icon = item.icon
                  const isActive = activeView === item.id

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${
                        isActive ? 'bg-primary/10' : 'hover:bg-muted/50 active:bg-muted'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
