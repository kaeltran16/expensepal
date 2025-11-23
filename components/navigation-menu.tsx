'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Menu,
  X,
  List,
  BarChart3,
  Target,
  Download,
  Mail,
  Sparkles,
  FileText,
  Lightbulb,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface NavigationMenuProps {
  activeView: 'expenses' | 'analytics' | 'budget' | 'goals' | 'summary' | 'insights'
  onViewChange: (view: 'expenses' | 'analytics' | 'budget' | 'goals' | 'summary' | 'insights') => void
  onExport: () => void
  onSync: () => void
  syncing: boolean
}

export function NavigationMenu({
  activeView,
  onViewChange,
  onExport,
  onSync,
  syncing
}: NavigationMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { id: 'expenses' as const, label: 'Expenses', icon: List },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'budget' as const, label: 'Budget', icon: Target },
    { id: 'goals' as const, label: 'Savings Goals', icon: Sparkles },
    { id: 'summary' as const, label: 'Weekly Summary', icon: FileText },
    { id: 'insights' as const, label: 'Category Insights', icon: Lightbulb },
  ]

  const handleItemClick = (view: 'expenses' | 'analytics' | 'budget' | 'goals' | 'summary' | 'insights') => {
    onViewChange(view)
    setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="rounded-full h-10 w-10"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background border-r shadow-2xl z-50"
            >
              {/* Header */}
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Menu</h2>
                  <p className="text-sm text-muted-foreground">Expense Tracker</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <div className="p-4 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeView === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Divider */}
              <div className="px-4 py-2">
                <div className="border-t" />
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => {
                    onSync()
                    setIsOpen(false)
                  }}
                  disabled={syncing}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-muted transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">{syncing ? 'Syncing...' : 'Sync Emails'}</span>
                </button>

                <button
                  onClick={() => {
                    onExport()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-muted transition-colors"
                >
                  <Download className="h-5 w-5" />
                  <span className="font-medium">Export CSV</span>
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="p-4 border-t mt-auto absolute bottom-0 left-0 right-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
