'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, AlertTriangle, Star, Lightbulb, Loader2, ChevronDown } from 'lucide-react'
import { useHabitCoach } from '@/lib/hooks/use-habit-coach'

const TYPE_CONFIG: Record<string, { icon: typeof Brain; color: string; bg: string }> = {
  pattern: { icon: Brain, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-500/20' },
  risk: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  win: { icon: Star, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-500/20' },
  tip: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/20' },
}

export function HabitCoachCard() {
  const { data, isLoading, error } = useHabitCoach()
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Compact header - always visible, tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-3 text-left"
      >
        <Brain className="h-4 w-4 shrink-0 text-violet-500" />
        <p className="flex-1 text-sm text-muted-foreground line-clamp-1">
          {data.encouragement}
        </p>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable suggestions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {data.suggestions.map((suggestion, i) => {
                const config = TYPE_CONFIG[suggestion.type] || TYPE_CONFIG.tip
                const Icon = config.icon

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl border p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-1.5 ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{suggestion.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.description}</p>
                        <p className="mt-1.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                          {suggestion.action}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
