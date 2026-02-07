'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Lightbulb, Loader2, RefreshCw } from 'lucide-react'
import { useWeeklyDigest } from '@/lib/hooks/use-weekly-digest'

/** Domains that are already shown inline in their own data cards */
const INLINE_DOMAINS = new Set(['spending', 'nutrition'])

export function WeeklyDigest() {
  const { data, isLoading, error, refetch, isFetching } = useWeeklyDigest()
  const [tipExpanded, setTipExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed p-3">
        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
        <p className="text-xs text-muted-foreground">Generating AI insights...</p>
      </div>
    )
  }

  if (error || !data) return null

  // Only show sections that aren't already integrated into data cards
  const extraSections = data.sections.filter((s) => !INLINE_DOMAINS.has(s.domain))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Extra domain insights (routines, fitness, goals) as compact chips */}
      {extraSections.length > 0 && (
        <div className="space-y-2">
          {extraSections.map((section) => (
            <div
              key={section.domain}
              className="flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 px-3 py-2.5"
            >
              <span className="text-sm mt-0.5">{section.emoji}</span>
              <div className="min-w-0">
                {section.highlight && (
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-0.5">
                    {section.highlight}
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {section.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip — compact, tap to expand */}
      <button
        onClick={() => setTipExpanded(!tipExpanded)}
        className="flex w-full items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-left"
      >
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <p className={`text-xs text-muted-foreground leading-relaxed ${tipExpanded ? '' : 'line-clamp-1'}`}>
          <span className="font-medium text-amber-600 dark:text-amber-400">Tip: </span>
          {data.tip_of_the_week}
        </p>
        <RefreshCw
          onClick={(e) => {
            e.stopPropagation()
            refetch()
          }}
          className={`mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50 ${isFetching ? 'animate-spin' : ''}`}
        />
      </button>
    </motion.div>
  )
}
