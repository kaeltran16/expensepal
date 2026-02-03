'use client'

import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { cn, hapticFeedback } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Clock, MoreVertical, Play, Plus, Sparkles, Sun, Moon, Sunset, CloudMoon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRoutines } from '@/lib/hooks/use-routines'
import type { RoutineTemplate } from '@/lib/types/routines'

// Get current date in GMT+7 as YYYY-MM-DD
const getGMT7Date = () => {
  const now = new Date()
  const gmt7Offset = 7 * 60 * 60 * 1000
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const gmt7Time = new Date(utcTime + gmt7Offset)
  return gmt7Time.toISOString().split('T')[0]
}

// Group icons for common routine categories
const GROUP_ICONS: Record<string, string> = {
  skincare: '🧴',
  fitness: '💪',
  morning: '☀️',
  evening: '🌙',
  night: '😴',
  mindfulness: '🧘',
  hygiene: '🚿',
  work: '💼',
  health: '❤️',
}

// Time of day icons and colors
const TIME_OF_DAY_CONFIG: Record<string, { icon: typeof Sun; label: string; color: string }> = {
  morning: { icon: Sun, label: 'Morning', color: 'text-amber-500' },
  afternoon: { icon: Sunset, label: 'Afternoon', color: 'text-orange-500' },
  evening: { icon: Moon, label: 'Evening', color: 'text-indigo-500' },
  night: { icon: CloudMoon, label: 'Night', color: 'text-slate-500' },
}

interface RoutineTemplatesListProps {
  templates: RoutineTemplate[]
  onStartRoutine: (template: RoutineTemplate) => void
  onEditTemplate: (template: RoutineTemplate) => void
  onDeleteTemplate: (template: RoutineTemplate) => void
  onCreateTemplate: () => void
  loading?: boolean
}


// Journey card - swipeable card showing routines with progress
interface JourneyCardProps {
  templates: RoutineTemplate[]
  groupName?: string
  groupIcon?: string
  completedIds: string[]
  onStart: (template: RoutineTemplate) => void
  onEdit: (template: RoutineTemplate) => void
  onDelete: (template: RoutineTemplate) => void
}

const JourneyCard = memo(function JourneyCard({
  templates,
  groupName,
  groupIcon,
  completedIds,
  onStart,
  onEdit,
  onDelete,
}: JourneyCardProps) {
  const [viewIndex, setViewIndex] = useState(0)

  // Set initial view to first uncompleted routine
  useEffect(() => {
    const firstUncompleted = templates.findIndex(t => !completedIds.includes(t.id))
    if (firstUncompleted >= 0) {
      setViewIndex(firstUncompleted)
    } else if (templates.length > 0) {
      setViewIndex(templates.length - 1)
    }
  }, [templates, completedIds])

  const currentTemplate = templates[viewIndex]
  const isCurrentCompleted = currentTemplate ? completedIds.includes(currentTemplate.id) : false
  const completedCount = templates.filter(t => completedIds.includes(t.id)).length
  const allCompleted = completedCount === templates.length

  const handleStart = useCallback(() => {
    if (!currentTemplate) return
    hapticFeedback('light')
    onStart(currentTemplate)
  }, [currentTemplate, onStart])

  const handleEdit = useCallback(() => {
    if (!currentTemplate) return
    onEdit(currentTemplate)
  }, [currentTemplate, onEdit])

  const handleDelete = useCallback(() => {
    if (!currentTemplate) return
    onDelete(currentTemplate)
  }, [currentTemplate, onDelete])

  // Touch swipe handlers
  const touchStartX = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    const swipeThreshold = 50

    if (diff > swipeThreshold && viewIndex < templates.length - 1) {
      hapticFeedback('light')
      setViewIndex(viewIndex + 1)
    } else if (diff < -swipeThreshold && viewIndex > 0) {
      hapticFeedback('light')
      setViewIndex(viewIndex - 1)
    }
  }, [viewIndex, templates.length])

  if (!currentTemplate) return null

  const estimatedTime = currentTemplate.estimated_minutes || (currentTemplate.steps?.length || 0) * 2 || 5
  const timeConfig = currentTemplate.time_of_day ? TIME_OF_DAY_CONFIG[currentTemplate.time_of_day] : null
  const TimeIcon = timeConfig?.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileTap={{ scale: 0.995 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="ios-card ios-press relative overflow-hidden"
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent" />

      {/* Group header - only for groups */}
      {groupName && templates.length > 1 && (
        <div className="relative flex items-center justify-between border-b border-border/30 bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{groupIcon}</span>
            <span className="ios-headline capitalize">{groupName}</span>
            {allCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500"
              >
                <Check className="h-3 w-3 text-white" />
              </motion.div>
            )}
          </div>
          {/* Step navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (viewIndex > 0) {
                  hapticFeedback('light')
                  setViewIndex(viewIndex - 1)
                }
              }}
              disabled={viewIndex === 0}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                viewIndex === 0
                  ? 'text-muted-foreground/30'
                  : 'text-muted-foreground hover:bg-muted active:scale-95'
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">
              {viewIndex + 1} / {templates.length}
            </span>
            <button
              onClick={() => {
                if (viewIndex < templates.length - 1) {
                  hapticFeedback('light')
                  setViewIndex(viewIndex + 1)
                }
              }}
              disabled={viewIndex === templates.length - 1}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                viewIndex === templates.length - 1
                  ? 'text-muted-foreground/30'
                  : 'text-muted-foreground hover:bg-muted active:scale-95'
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <motion.div
            key={`${currentTemplate.id}-${isCurrentCompleted}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition-all duration-300',
              isCurrentCompleted
                ? 'bg-teal-500/10 ring-2 ring-teal-500/30'
                : 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25'
            )}
          >
            <AnimatePresence mode="wait">
              {isCurrentCompleted ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Check className="h-7 w-7 text-teal-500" />
                </motion.div>
              ) : (
                <motion.span
                  key="icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentTemplate.icon || '✨'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={currentTemplate.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'truncate ios-headline',
                      isCurrentCompleted && 'text-muted-foreground line-through decoration-teal-500/50'
                    )}
                  >
                    {currentTemplate.name}
                  </motion.h3>
                </AnimatePresence>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {estimatedTime} min
                  </span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-muted-foreground">
                    {currentTemplate.steps?.length || 0} steps
                  </span>
                  {timeConfig && TimeIcon && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className={cn('flex items-center gap-1', timeConfig.color)}>
                        <TimeIcon className="h-3.5 w-3.5" />
                        <span className="ios-caption">{timeConfig.label}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Menu */}
              {!currentTemplate.is_default && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem onClick={handleEdit} className="gap-2">
                      Edit routine
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-4 flex items-center justify-end">
          {/* CTA button */}
          <AnimatePresence mode="wait">
            {isCurrentCompleted ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 rounded-full bg-teal-500/10 px-4 py-2"
              >
                <Check className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">Done</span>
              </motion.div>
            ) : (
              <motion.div
                key="start"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  onClick={handleStart}
                  className="h-10 gap-2 rounded-full bg-teal-500 px-5 font-semibold shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-500/30 active:scale-95"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start
                  <ChevronRight className="h-4 w-4 -ml-1" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
})

// Helper to group templates by their primary tag
function groupTemplatesByTag(templates: RoutineTemplate[]): Map<string, RoutineTemplate[]> {
  const groups = new Map<string, RoutineTemplate[]>()

  for (const template of templates) {
    // Use first tag as group, or 'ungrouped' if no tags
    const groupKey = template.tags?.[0] || 'ungrouped'

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(template)
  }

  // Sort groups: skincare first (if exists), then alphabetically, ungrouped last
  const sortedGroups = new Map<string, RoutineTemplate[]>()
  const keys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'ungrouped') return 1
    if (b === 'ungrouped') return -1
    if (a === 'skincare') return -1
    if (b === 'skincare') return 1
    return a.localeCompare(b)
  })

  for (const key of keys) {
    // Sort templates within group by time of day
    const timeOrder = { morning: 0, afternoon: 1, evening: 2, night: 3 }
    const sorted = groups.get(key)!.sort((a, b) => {
      const aOrder = a.time_of_day ? timeOrder[a.time_of_day] ?? 4 : 4
      const bOrder = b.time_of_day ? timeOrder[b.time_of_day] ?? 4 : 4
      return aOrder - bOrder
    })
    sortedGroups.set(key, sorted)
  }

  return sortedGroups
}

export function RoutineTemplatesList({
  templates,
  onStartRoutine,
  onEditTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  loading,
}: RoutineTemplatesListProps) {
  // Fetch today's completions from database (GMT+7)
  const todayGMT7 = useMemo(() => getGMT7Date(), [])
  const { data: completionsData } = useRoutines({ startDate: todayGMT7, endDate: todayGMT7 })

  // Extract completed template IDs for today
  const todayCompletedIds = useMemo(() => {
    if (!completionsData?.completions) return []
    return completionsData.completions
      .map(c => c.template_id)
      .filter((id): id is string => id != null)
  }, [completionsData])

  // Group templates by tag
  const groupedTemplates = useMemo(() => groupTemplatesByTag(templates), [templates])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="ios-card animate-pulse overflow-hidden">
            <div className="border-b border-border/30 bg-muted/30 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-5 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
                <div className="h-3 w-8 rounded bg-muted" />
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-muted" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-36 rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-4 w-16 rounded bg-muted" />
                    <div className="h-4 w-16 rounded bg-muted" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end">
                <div className="h-10 w-24 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="ios-card flex flex-col items-center justify-center px-6 py-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', bounce: 0.5 }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/25"
        >
          <Sparkles className="h-10 w-10 text-white" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-5 ios-headline"
        >
          Start your first routine
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 max-w-[240px] text-sm text-muted-foreground"
        >
          Build healthy habits with personalized daily routines
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onCreateTemplate}
            className="mt-6 h-11 gap-2 rounded-full bg-teal-500 px-6 font-semibold shadow-lg shadow-teal-500/25 hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-500/30"
          >
            <Plus className="h-5 w-5" />
            Create Routine
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {Array.from(groupedTemplates.entries()).map(([groupName, groupTemplates], groupIndex) => {
        // For grouped routines, show as one journey card
        if (groupName !== 'ungrouped') {
          return (
            <motion.div
              key={groupName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.05, duration: 0.4 }}
            >
              <JourneyCard
                templates={groupTemplates}
                groupName={groupName}
                groupIcon={GROUP_ICONS[groupName]}
                completedIds={todayCompletedIds}
                onStart={onStartRoutine}
                onEdit={onEditTemplate}
                onDelete={onDeleteTemplate}
              />
            </motion.div>
          )
        }

        // For ungrouped routines, each gets its own journey card
        return groupTemplates.map((template, templateIndex) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (groupIndex + templateIndex) * 0.05, duration: 0.4 }}
          >
            <JourneyCard
              templates={[template]}
              completedIds={todayCompletedIds}
              onStart={onStartRoutine}
              onEdit={onEditTemplate}
              onDelete={onDeleteTemplate}
            />
          </motion.div>
        ))
      })}

      {/* Add button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Button
          variant="ghost"
          className="w-full h-12 gap-2 rounded-2xl border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-teal-500/50 hover:bg-teal-500/5 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          onClick={onCreateTemplate}
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Add New Routine</span>
        </Button>
      </motion.div>
    </div>
  )
}
