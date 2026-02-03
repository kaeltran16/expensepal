'use client'

import { springs } from '@/lib/animation-config'
import type { ViewType } from '@/lib/constants/filters'
import { hapticFeedback } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Dumbbell, Lightbulb, MoreHorizontal, Plus, Wallet } from 'lucide-react'

interface BottomNavProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  onAddExpense?: () => void
  onOpenMore?: () => void
  isMoreOpen?: boolean
}

type NavItem = {
  id: ViewType | 'more'
  label: string
  icon: LucideIcon
}

const LEFT_NAV_ITEMS: NavItem[] = [
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
]

const RIGHT_NAV_ITEMS: NavItem[] = [
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

// Views that are accessible from the "More" menu
const MORE_VIEWS: ViewType[] = ['routines', 'calories', 'budget', 'recurring', 'profile']

export function BottomNavigation({ activeView, onViewChange, onAddExpense, onOpenMore, isMoreOpen }: BottomNavProps) {
  const handleNavClick = (viewId: ViewType | 'more') => {
    hapticFeedback('light')
    if (viewId === 'more') {
      onOpenMore?.()
    } else {
      onViewChange(viewId)
    }
  }

  const handleAddClick = () => {
    hapticFeedback('medium')
    onAddExpense?.()
  }

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    // "More" is active if the sheet is open OR if current view is one of the "more" views
    const isActive = item.id === 'more'
      ? (isMoreOpen || MORE_VIEWS.includes(activeView))
      : activeView === item.id

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className="relative flex flex-col items-center justify-center flex-1 py-1 ios-touch"
        data-testid={`nav-${item.id}`}
      >
        {/* Icon - using CSS transform for better performance */}
        <div
          className={`relative mb-1 transition-transform duration-200 ease-out ${
            isActive ? 'scale-100' : 'scale-[0.94]'
          }`}
        >
          <Icon
            className={`h-6 w-6 transition-colors duration-200 ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </div>

        {/* Label - using CSS for color transition */}
        <span
          className={`text-[10px] font-medium transition-colors duration-200 ${
            isActive ? 'text-primary' : 'text-muted-foreground'
          }`}
          style={{
            letterSpacing: '-0.1px',
          }}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={springs.default}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 will-animate"
      data-testid="bottom-navigation"
    >
      {/* iOS hairline border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border/30" />

      {/* Tab items with center CTA */}
      <div className="flex items-end justify-around px-safe-left px-safe-right pb-1 pt-2 max-w-screen-sm mx-auto">
        {/* Left nav items */}
        {LEFT_NAV_ITEMS.map(renderNavItem)}

        {/* Center CTA Button */}
        <div className="relative flex flex-col items-center justify-center flex-1 py-1">
          <motion.button
            onClick={handleAddClick}
            whileTap={{ scale: 0.9 }}
            className="relative -mt-6 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center ios-touch"
            data-testid="nav-add"
          >
            <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-md -z-10" />
          </motion.button>
        </div>

        {/* Right nav items */}
        {RIGHT_NAV_ITEMS.map(renderNavItem)}
      </div>

      {/* Safe area padding for iOS home indicator */}
      <div
        className="w-full bg-background/80"
        style={{
          height: 'max(env(safe-area-inset-bottom), 8px)',
        }}
      />
    </motion.nav>
  )
}
