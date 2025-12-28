'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronRight, Clock, Dumbbell, Edit, ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { hapticFeedback } from '@/lib/utils'
import type { WorkoutTemplate } from '@/lib/supabase'
import { useState } from 'react'

interface WorkoutTemplatesListProps {
  templates: WorkoutTemplate[]
  onTemplateClick: (template: WorkoutTemplate) => void
  onEditTemplate?: (template: WorkoutTemplate) => void
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
  onEdit
}: {
  template: WorkoutTemplate
  index: number
  onClick: () => void
  onEdit?: () => void
}) {
  const exercises = (template.exercises as any[]) || []
  const config = difficultyConfig[template.difficulty as keyof typeof difficultyConfig] || difficultyConfig.beginner

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 350,
        damping: 25
      }}
      whileHover={{
        scale: 1.02,
        x: 4,
        transition: { type: "spring", stiffness: 400, damping: 20 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={`w-full ios-card p-4 border-l-4 ${config.border} group cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          onClick={() => {
            onClick()
            hapticFeedback('light')
          }}
          className="flex-1 min-w-0 text-left"
        >
          <motion.h4
            className="ios-headline mb-1 truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.06 + 0.1 }}
          >
            {template.name}
          </motion.h4>
          <motion.p
            className="ios-caption text-muted-foreground line-clamp-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.06 + 0.15 }}
          >
            {template.description}
          </motion.p>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: index * 0.06 + 0.2,
              type: "spring",
              stiffness: 500,
              damping: 15
            }}
          >
            <Badge className={`${config.color} border-0`}>
              {template.difficulty}
            </Badge>
          </motion.div>
          {onEdit && !template.is_default && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                  hapticFeedback('light')
                }}
                className="h-8 w-8"
                aria-label="Edit template"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          onClick()
          hapticFeedback('light')
        }}
        className="w-full flex items-center gap-4 text-sm text-muted-foreground"
      >
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 + 0.25 }}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{template.duration_minutes}min</span>
        </motion.div>
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 + 0.3 }}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          <span>{exercises.length} exercises</span>
        </motion.div>
        <motion.div
          className="ml-auto"
          animate={{ x: [0, 4, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
    </motion.div>
  )
}

export function WorkoutTemplatesList({
  templates,
  onTemplateClick,
  onEditTemplate,
  onCreateTemplate,
  maxVisible = 5
}: WorkoutTemplatesListProps) {
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const visibleTemplates = templates.slice(0, maxVisible)

  return (
    <>
      <div className="space-y-3">
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
            icon="🏋️"
            title="No templates yet"
            description="Create your first workout template to get started"
            action={{
              label: 'Create Template',
              onClick: onCreateTemplate,
              icon: <Plus className="h-5 w-5" />
            }}
          />
        ) : (
          <div className="space-y-3">
            {visibleTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                onClick={() => onTemplateClick(template)}
                onEdit={onEditTemplate ? () => onEditTemplate(template) : undefined}
              />
            ))}

            {templates.length > maxVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: maxVisible * 0.05 }}
              >
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
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* All Templates Sheet */}
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
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3 pb-6">
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
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
