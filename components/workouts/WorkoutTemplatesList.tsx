'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronRight, Clock, Dumbbell, Edit, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { hapticFeedback } from '@/lib/utils'
import type { WorkoutTemplate } from '@/lib/supabase'
import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface WorkoutTemplatesListProps {
  templates: WorkoutTemplate[]
  onTemplateClick: (template: WorkoutTemplate) => void
  onEditTemplate?: (template: WorkoutTemplate) => void
  onDeleteTemplate?: (template: WorkoutTemplate) => void
  onCreateTemplate: () => void
  maxVisible?: number
}

const difficultyConfig = {
  beginner: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    border: 'border-l-green-500'
  },
  intermediate: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    border: 'border-l-blue-500'
  },
  advanced: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    border: 'border-l-red-500'
  }
}

function TemplateCard({
  template,
  index,
  onClick,
  onEdit,
  onDelete
}: {
  template: WorkoutTemplate
  index: number
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const exercises = (template.exercises as unknown as Array<{ exercise_id: string }>) || []
  const config = difficultyConfig[template.difficulty as keyof typeof difficultyConfig] || difficultyConfig.beginner

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
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
          className={`w-full ios-card p-4 border-l-4 ${config.border} group cursor-pointer relative z-10 bg-background`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <button
              onClick={() => {
                if (!isDraggingRef.current) {
                  onClick()
                  hapticFeedback('light')
                }
              }}
              className="flex-1 min-w-0 text-left"
            >
              <h4 className="text-sm font-semibold mb-1 truncate">{template.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`${config.color} border-0`}>
                {template.difficulty}
              </Badge>
              {onEdit && !template.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                    hapticFeedback('light')
                  }}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Edit template"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (!isDraggingRef.current) {
                onClick()
                hapticFeedback('light')
              }
            }}
            className="w-full flex items-center gap-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{template.duration_minutes}min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5" />
              <span>{exercises.length} exercises</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
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
  onTemplateClick,
  onEditTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  maxVisible = 5
}: WorkoutTemplatesListProps) {
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const visibleTemplates = templates.slice(0, maxVisible)

  return (
    <>
      <div className="space-y-3 overflow-visible">
        <div className="flex items-center justify-between px-1">
          <h3 className="ios-headline">Templates</h3>
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
            New Template
          </Button>
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
            transition={{ type: 'spring', damping: 40, stiffness: 400, mass: 0.8 }}
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
