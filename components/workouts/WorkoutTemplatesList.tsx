'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Plus, ChevronRight, Dumbbell, Edit, ArrowLeft, Trash2, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { EmptyState } from '@/components/ui/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getStaggerDelay, springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import type { WorkoutTemplate } from '@/lib/supabase'
import { useState, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface WorkoutTemplatesListProps {
  templates: WorkoutTemplate[]
  exerciseMap?: Map<string, { name: string; muscle_groups: string[] }>
  onTemplateClick: (template: WorkoutTemplate) => void
  onEditTemplate?: (template: WorkoutTemplate) => void
  onDeleteTemplate?: (template: WorkoutTemplate) => void
  onCreateTemplate: () => void
  onGenerateWorkout?: () => void
  maxVisible?: number
}

const difficultyStyles: Record<string, { gradient: string; badge: string }> = {
  beginner: { gradient: 'from-green-400 to-emerald-500', badge: 'text-green-600 dark:text-green-400' },
  intermediate: { gradient: 'from-blue-400 to-indigo-500', badge: 'text-blue-600 dark:text-blue-400' },
  advanced: { gradient: 'from-red-400 to-purple-500', badge: 'text-red-600 dark:text-red-400' },
}

function TemplateCard({
  template,
  index,
  exerciseMap,
  onClick,
  onEdit,
  onDelete
}: {
  template: WorkoutTemplate
  index: number
  exerciseMap?: Map<string, { name: string; muscle_groups: string[] }>
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const exercises = (template.exercises as unknown as Array<{ exercise_id: string }>) || []
  const styles = difficultyStyles[template.difficulty as string] || difficultyStyles.beginner

  const muscleGroupText = useMemo(() => {
    if (!exerciseMap) return ''
    const groups = new Set<string>()
    for (const ex of exercises) {
      const exData = exerciseMap.get(ex.exercise_id)
      if (exData) {
        for (const mg of exData.muscle_groups) {
          groups.add(mg.charAt(0).toUpperCase() + mg.slice(1))
        }
      }
    }
    return Array.from(groups).slice(0, 3).join(', ')
  }, [exercises, exerciseMap])

  // Native touch-based swipe state
  const [translateX, setTranslateX] = useState(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const isDraggingRef = useRef(false)
  const hasTriggeredHapticRef = useRef(false)

  const canDelete = onDelete && !template.is_default
  const DELETE_THRESHOLD = -50

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canDelete) return
    startXRef.current = e.touches[0].clientX
    currentXRef.current = 0
    isDraggingRef.current = true
    hasTriggeredHapticRef.current = false
    setIsAnimating(false)
  }, [canDelete])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !canDelete) return

    const deltaX = e.touches[0].clientX - startXRef.current

    if (deltaX > 0) {
      currentXRef.current = 0
      setTranslateX(0)
      return
    }

    const clampedX = Math.max(deltaX * 0.8, -120)
    currentXRef.current = clampedX
    setTranslateX(clampedX)

    if (clampedX <= DELETE_THRESHOLD && !hasTriggeredHapticRef.current) {
      hapticFeedback('medium')
      hasTriggeredHapticRef.current = true
    }
  }, [canDelete])

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !canDelete) return
    isDraggingRef.current = false
    setIsAnimating(true)

    if (currentXRef.current <= DELETE_THRESHOLD) {
      hapticFeedback('medium')
      setShowDeleteDialog(true)
    }

    setTranslateX(0)
  }, [canDelete])

  const handleDelete = () => {
    if (onDelete) {
      hapticFeedback('heavy')
      onDelete()
      setShowDeleteDialog(false)
    }
  }

  const deleteOpacity = Math.min(Math.abs(translateX) / 50, 1)

  return (
    <>
      <motion.div
        {...variants.slideUp}
        transition={{ delay: getStaggerDelay(index), ...springs.ios }}
        className="relative w-full overflow-hidden rounded-xl"
      >
        {/* Delete background */}
        {canDelete && (
          <div
            className="absolute inset-0 bg-destructive rounded-xl flex items-center justify-end px-6"
            style={{ opacity: deleteOpacity }}
          >
            <Trash2 className="h-5 w-5 text-destructive-foreground" />
          </div>
        )}

        {/* Swipeable card */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translate3d(${translateX}px, 0, 0)`,
            transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
            willChange: 'transform',
          }}
          className="w-full ios-card p-3.5 group cursor-pointer relative z-10 bg-background"
        >
          <button
            onClick={() => {
              if (!isDraggingRef.current) {
                onClick()
                hapticFeedback('light')
              }
            }}
            className="w-full flex items-center gap-3"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center shrink-0`}>
              <Dumbbell className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-sm font-semibold truncate">{template.name}</h4>
              {muscleGroupText && (
                <p className="text-[11px] text-muted-foreground truncate">{muscleGroupText}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <span>{exercises.length} exercises</span>
                <span>&middot;</span>
                <span>{template.duration_minutes}min</span>
                <span className={styles.badge}>{template.difficulty}</span>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {onEdit && !template.is_default && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
                hapticFeedback('light')
              }}
              className="absolute top-2 right-8 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Edit template"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{template.name}&quot;</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function WorkoutTemplatesList({
  templates,
  exerciseMap,
  onTemplateClick,
  onEditTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  onGenerateWorkout,
  maxVisible = 5
}: WorkoutTemplatesListProps) {
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const visibleTemplates = templates.slice(0, maxVisible)

  return (
    <>
      <div className="space-y-3 overflow-visible">
        <div className="flex items-center justify-between px-1">
          <h3 className="ios-headline">My Templates</h3>
          <div className="flex items-center gap-3">
            {onGenerateWorkout && (
              <button
                onClick={() => {
                  onGenerateWorkout()
                  hapticFeedback('light')
                }}
                className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Generate
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-primary gap-1"
              onClick={() => {
                onCreateTemplate()
                hapticFeedback('light')
              }}
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </div>

        {templates.length === 0 ? (
          <EmptyState
            icon="\u{1F3CB}\u{FE0F}"
            title="No templates yet"
            description="Create your first workout template to get started"
            action={{
              label: 'Create Template',
              onClick: onCreateTemplate,
              icon: <Plus className="h-5 w-5" />
            }}
          />
        ) : (
          <div className="space-y-3 overflow-visible">
            {visibleTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                exerciseMap={exerciseMap}
                onClick={() => onTemplateClick(template)}
                onEdit={onEditTemplate ? () => onEditTemplate(template) : undefined}
                onDelete={onDeleteTemplate ? () => onDeleteTemplate(template) : undefined}
              />
            ))}

            {templates.length > maxVisible && (
              <Button
                variant="ghost"
                className="w-full text-primary"
                onClick={() => {
                  setShowAllTemplates(true)
                  hapticFeedback('light')
                }}
              >
                View all {templates.length} templates
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* All Templates Sheet */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {showAllTemplates && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springs.sheet}
            className="fixed inset-0 z-[60] bg-background flex flex-col !mt-0"
          >
            {/* Header */}
            <div className="safe-top border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 py-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAllTemplates(false)
                    hapticFeedback('light')
                  }}
                  className="h-10 w-10 shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h2 className="ios-headline text-left">All Templates</h2>
                  <p className="text-xs text-muted-foreground">{templates.length} total</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary gap-1.5 shrink-0"
                  onClick={() => {
                    setShowAllTemplates(false)
                    onCreateTemplate()
                    hapticFeedback('light')
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
            </div>

            {/* Templates List */}
            <div className="flex-1 overflow-y-auto overflow-x-visible px-4 py-4">
              <div className="space-y-3 pb-6 overflow-visible">
                {templates.map((template, index) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={index}
                    onClick={() => {
                      setShowAllTemplates(false)
                      onTemplateClick(template)
                    }}
                    onEdit={onEditTemplate ? () => {
                      setShowAllTemplates(false)
                      onEditTemplate(template)
                    } : undefined}
                    onDelete={onDeleteTemplate ? () => onDeleteTemplate(template) : undefined}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  )
}
