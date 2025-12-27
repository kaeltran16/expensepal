'use client'

import { motion } from 'framer-motion'
import { Plus, ChevronRight, Clock, Dumbbell, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { hapticFeedback } from '@/lib/utils'
import type { WorkoutTemplate } from '@/lib/supabase'

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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`w-full ios-card p-4 border-l-4 ${config.border} group`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          onClick={() => {
            onClick()
            hapticFeedback('light')
          }}
          className="flex-1 min-w-0 text-left"
        >
          <h4 className="ios-headline mb-1 truncate">{template.name}</h4>
          <p className="ios-caption text-muted-foreground line-clamp-1">
            {template.description}
          </p>
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
          onClick()
          hapticFeedback('light')
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
        <div className="ml-auto">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
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
  const visibleTemplates = templates.slice(0, maxVisible)

  return (
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
                  // Could trigger a "view all" sheet in the future
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
  )
}
