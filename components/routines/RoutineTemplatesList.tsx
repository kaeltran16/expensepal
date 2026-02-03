'use client'

import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { cn, hapticFeedback } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Check, Clock, MoreVertical, Play, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRoutines } from '@/lib/hooks/use-routines'
import type { RoutineTemplate, TimeOfDay } from '@/lib/types/routines'

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

// Time labels for journey view
const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: '8 AM',
  afternoon: '12 PM',
  evening: '7 PM',
  night: '12 AM',
}

interface RoutineTemplatesListProps {
  templates: RoutineTemplate[]
  onStartRoutine: (template: RoutineTemplate) => void
  onEditTemplate: (template: RoutineTemplate) => void
  onDeleteTemplate: (template: RoutineTemplate) => void
  onCreateTemplate: () => void
  loading?: boolean
}

interface TemplateCardProps {
  template: RoutineTemplate
  index: number
  onStart: (template: RoutineTemplate) => void
  onEdit: (template: RoutineTemplate) => void
  onDelete: (template: RoutineTemplate) => void
}

const TIME_OF_DAY_COLORS: Record<TimeOfDay, string> = {
  morning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  afternoon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  evening: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  night: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
}

// Animation variants defined outside component to prevent recreation
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 },
  }),
}

// Memoized template card to prevent unnecessary re-renders
const TemplateCard = memo(function TemplateCard({
  template,
  index,
  onStart,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const handleStart = useCallback(() => {
    hapticFeedback('light')
    onStart(template)
  }, [onStart, template])

  const handleEdit = useCallback(() => onEdit(template), [onEdit, template])
  const handleDelete = useCallback(() => onDelete(template), [onDelete, template])

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className="ios-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500 text-2xl">
          {template.icon || '✨'}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{template.name}</h3>
            {template.is_default && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Default
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {template.time_of_day && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 capitalize',
                  TIME_OF_DAY_COLORS[template.time_of_day]
                )}
              >
                {template.time_of_day}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {template.estimated_minutes || template.steps?.length * 2 || 5} min
            </span>
            <span>{template.steps?.length || 0} steps</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-teal-500 hover:bg-teal-600"
            onClick={handleStart}
          >
            <Play className="h-4 w-4" />
          </Button>

          {!template.is_default && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <div className="border-t px-4 py-2">
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
      )}
    </motion.div>
  )
})

// Group header component
const GroupHeader = memo(function GroupHeader({
  name,
  count,
  icon,
}: {
  name: string
  count: number
  icon?: string
}) {
  return (
    <div className="flex items-center gap-2 pb-2 pt-1">
      {icon && <span className="text-base">{icon}</span>}
      <h3 className="text-sm font-semibold capitalize text-foreground">{name}</h3>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  )
})

// Single card journey view - shows current routine, tracks progress with swipe
interface RoutineJourneyProps {
  groupName: string
  templates: RoutineTemplate[]
  icon?: string
  todayCompletedIds: string[] // From database
  onStartRoutine: (template: RoutineTemplate) => void
  onEditTemplate: (template: RoutineTemplate) => void
  onDeleteTemplate: (template: RoutineTemplate) => void
}

const RoutineJourney = memo(function RoutineJourney({
  groupName,
  templates,
  icon,
  todayCompletedIds,
  onStartRoutine,
  onEditTemplate,
  onDeleteTemplate,
}: RoutineJourneyProps) {
  const [viewIndex, setViewIndex] = useState(0)

  // Get completed IDs for this journey's templates
  const completedIds = useMemo(() => {
    return templates
      .filter(t => todayCompletedIds.includes(t.id))
      .map(t => t.id)
  }, [templates, todayCompletedIds])

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
  const allCompleted = completedIds.length === templates.length

  const handleStart = useCallback(() => {
    if (!currentTemplate) return
    hapticFeedback('light')
    onStartRoutine(currentTemplate)
  }, [currentTemplate, onStartRoutine])

  const handleEdit = useCallback(() => {
    if (!currentTemplate) return
    onEditTemplate(currentTemplate)
  }, [currentTemplate, onEditTemplate])

  const handleDelete = useCallback(() => {
    if (!currentTemplate) return
    onDeleteTemplate(currentTemplate)
  }, [currentTemplate, onDeleteTemplate])

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
      // Swipe left - next
      hapticFeedback('light')
      setViewIndex(viewIndex + 1)
    } else if (diff < -swipeThreshold && viewIndex > 0) {
      // Swipe right - previous
      hapticFeedback('light')
      setViewIndex(viewIndex - 1)
    }
  }, [viewIndex, templates.length])

  return (
    <motion.div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="ios-card overflow-hidden"
    >
      {allCompleted && viewIndex === templates.length - 1 ? (
        // All done state
        <div className="p-4">
          {/* Header inside card */}
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {icon && <span>{icon}</span>}
              <span className="font-medium capitalize text-foreground">{groupName}</span>
            </div>
            <span>{completedIds.length}/{templates.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10">
              <Check className="h-6 w-6 text-teal-500" />
            </div>
            <div>
              <p className="font-medium">All done for today!</p>
              <p className="text-xs text-muted-foreground">Resets at midnight</p>
            </div>
          </div>
        </div>
      ) : currentTemplate ? (
        <div className="p-4">
          {/* Header row with group name, progress, and menu */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              {icon && <span>{icon}</span>}
              <span className="font-medium capitalize">{groupName}</span>
              <span className="text-muted-foreground">• {viewIndex + 1}/{templates.length}</span>
            </div>

            {!currentTemplate.is_default && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Main content row */}
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl',
                isCurrentCompleted && 'opacity-50',
                currentTemplate.time_of_day === 'morning' && 'bg-amber-100 dark:bg-amber-900/30',
                currentTemplate.time_of_day === 'afternoon' && 'bg-yellow-100 dark:bg-yellow-900/30',
                currentTemplate.time_of_day === 'evening' && 'bg-orange-100 dark:bg-orange-900/30',
                currentTemplate.time_of_day === 'night' && 'bg-indigo-100 dark:bg-indigo-900/30',
                !currentTemplate.time_of_day && 'bg-teal-100 dark:bg-teal-900/30'
              )}
            >
              {isCurrentCompleted ? <Check className="h-7 w-7 text-teal-500" /> : (currentTemplate.icon || '✨')}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h4 className={cn('font-semibold truncate', isCurrentCompleted && 'text-muted-foreground')}>
                {currentTemplate.name}
              </h4>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {currentTemplate.time_of_day && (
                  <>
                    <span className="capitalize">{currentTemplate.time_of_day}</span>
                    <span>•</span>
                  </>
                )}
                <span>{currentTemplate.estimated_minutes || currentTemplate.steps?.length * 2 || 5} min</span>
                <span>•</span>
                <span>{currentTemplate.steps?.length || 0} steps</span>
              </div>
            </div>

            {/* Action */}
            {!isCurrentCompleted ? (
              <Button
                size="icon"
                onClick={handleStart}
                className="h-11 w-11 shrink-0 rounded-full bg-teal-500 hover:bg-teal-600"
              >
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <div className="shrink-0 rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400">
                Done
              </div>
            )}
          </div>

          {/* Progress dots */}
          {templates.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {templates.map((t, idx) => {
                const isCompleted = completedIds.includes(t.id)
                const isCurrent = idx === viewIndex

                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      hapticFeedback('light')
                      setViewIndex(idx)
                    }}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      isCurrent ? 'w-5' : 'w-1.5',
                      isCompleted ? 'bg-teal-500' : isCurrent ? 'bg-teal-500' : 'bg-muted'
                    )}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : null}
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
  const hasMultipleGroups = groupedTemplates.size > 1 ||
    (groupedTemplates.size === 1 && !groupedTemplates.has('ungrouped'))

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="ios-card animate-pulse p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="ios-card flex flex-col items-center justify-center p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
          <Sparkles className="h-8 w-8 text-teal-600 dark:text-teal-400" />
        </div>
        <h3 className="mt-4 font-semibold">No routines yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first routine to get started
        </p>
        <Button
          onClick={onCreateTemplate}
          className="mt-4 bg-teal-500 hover:bg-teal-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Routine
        </Button>
      </div>
    )
  }

  let globalIndex = 0

  // Check if a group should use journey view (multiple routines with different times of day)
  const shouldUseJourneyView = (groupTemplates: RoutineTemplate[]) => {
    if (groupTemplates.length < 2) return false
    const timesOfDay = new Set(groupTemplates.map(t => t.time_of_day).filter(Boolean))
    return timesOfDay.size >= 2 // At least 2 different times of day
  }

  return (
    <div className="space-y-5">
      {Array.from(groupedTemplates.entries()).map(([groupName, groupTemplates]) => {
        const useJourney = shouldUseJourneyView(groupTemplates)

        if (useJourney && groupName !== 'ungrouped') {
          return (
            <RoutineJourney
              key={groupName}
              groupName={groupName}
              templates={groupTemplates}
              icon={GROUP_ICONS[groupName]}
              todayCompletedIds={todayCompletedIds}
              onStartRoutine={onStartRoutine}
              onEditTemplate={onEditTemplate}
              onDeleteTemplate={onDeleteTemplate}
            />
          )
        }

        return (
          <div key={groupName}>
            {/* Only show group header if there are multiple groups or it's a named group */}
            {hasMultipleGroups && groupName !== 'ungrouped' && (
              <GroupHeader
                name={groupName}
                count={groupTemplates.length}
                icon={GROUP_ICONS[groupName]}
              />
            )}

            <div className="space-y-2">
              {groupTemplates.map((template) => {
                const index = globalIndex++
                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={index}
                    onStart={onStartRoutine}
                    onEdit={onEditTemplate}
                    onDelete={onDeleteTemplate}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Add button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={onCreateTemplate}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create New Routine
      </Button>
    </div>
  )
}
