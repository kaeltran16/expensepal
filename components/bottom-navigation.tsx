'use client'

import { motion } from 'framer-motion'
import { List, BarChart3, Target, Sparkles, FileText, Lightbulb, Flame } from 'lucide-react'
import { hapticFeedback } from '@/lib/utils'

interface BottomNavProps {
  activeView: 'expenses' | 'analytics' | 'budget' | 'goals' | 'summary' | 'insights' | 'calories'
  onViewChange: (view: 'expenses' | 'analytics' | 'budget' | 'goals' | 'summary' | 'insights' | 'calories') => void
}

const NAV_ITEMS = [
  { id: 'expenses' as const, label: 'Expenses', icon: List },
  { id: 'calories' as const, label: 'Calories', icon: Flame },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'budget' as const, label: 'Budget', icon: Target },
  { id: 'insights' as const, label: 'Insights', icon: Lightbulb },
]

export function BottomNavigation({ activeView, onViewChange }: BottomNavProps) {
  const handleNavClick = (viewId: typeof activeView) => {
    hapticFeedback('light')
    onViewChange(viewId)
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'rgba(var(--card) / 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* iOS hairline border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border/30" />

      {/* Tab items */}
      <div className="flex items-end justify-around px-safe-left px-safe-right pb-1 pt-2 max-w-screen-sm mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 py-1 ios-touch"
            >
              {/* Icon */}
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.94,
                }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="relative mb-1"
              >
                <Icon
                  className={`h-6 w-6 transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
                transition={{ duration: 0.2 }}
                className="text-[10px] font-medium"
                style={{
                  letterSpacing: '-0.1px',
                }}
              >
                {item.label}
              </motion.span>
            </button>
          )
        })}
      </div>

      {/* Safe area padding for iOS home indicator */}
      <div
        className="w-full"
        style={{
          height: 'max(env(safe-area-inset-bottom), 8px)',
          backgroundColor: 'rgba(var(--card) / 0.8)',
        }}
      />
    </motion.nav>
  )
}
