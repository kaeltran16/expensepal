'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Play, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkoutTemplate, Workout } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'

interface WorkoutsViewProps {
  templates: WorkoutTemplate[]
  recentWorkouts: Workout[]
  loading: boolean
  onStartWorkout: (template: WorkoutTemplate) => void
}

export function WorkoutsView({
  templates,
  recentWorkouts,
  loading,
  onStartWorkout
}: WorkoutsViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)

  const handleTemplateClick = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    hapticFeedback('light')
  }

  const handleGetStarted = () => {
    if (selectedTemplate) {
      onStartWorkout(selectedTemplate)
      hapticFeedback('medium')
    }
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    hapticFeedback('light')
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <TemplateSkeleton />
        <TemplateSkeleton />
        <TemplateSkeleton />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 pb-24">
        {/* recent workouts summary */}
        {recentWorkouts.length > 0 && (
          <div className="ios-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="ios-headline">This Week</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span>{recentWorkouts.length} workouts</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Time" value={`${calculateTotalTime(recentWorkouts)}min`} />
              <StatCard label="Workouts" value={recentWorkouts.length.toString()} />
              <StatCard label="Avg Time" value={`${calculateAvgTime(recentWorkouts)}min`} />
            </div>
          </div>
        )}

        {/* workout templates */}
        <div className="space-y-3">
          <h3 className="ios-headline px-1">Workout Templates</h3>
          <div className="space-y-3">
            {templates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        </div>

        {templates.length === 0 && (
          <div className="ios-card p-8 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">No templates yet</h3>
            <p className="text-sm text-muted-foreground">
              workout templates will appear here
            </p>
          </div>
        )}
      </div>

      {/* template detail modal with "get started" */}
      <AnimatePresence>
        {selectedTemplate && (
          <>
            {/* backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
            >
              <div className="ios-card p-6">
                <h2 className="text-2xl font-bold mb-2">{selectedTemplate.name}</h2>
                <p className="text-muted-foreground mb-4">{selectedTemplate.description}</p>

                {/* template details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{selectedTemplate.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="capitalize">{selectedTemplate.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    <span>{(selectedTemplate.exercises as any[]).length} exercises</span>
                  </div>
                </div>

                {/* action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 ripple-effect min-h-touch"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGetStarted}
                    className="flex-1 ripple-effect min-h-touch gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Get Started
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// template card component
function TemplateCard({
  template,
  index,
  onClick
}: {
  template: WorkoutTemplate
  index: number
  onClick: () => void
}) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      case 'intermediate':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      case 'advanced':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="ios-card p-4 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="ios-headline mb-1">{template.name}</h4>
          <p className="ios-caption text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty || 'beginner')}`}>
          {template.difficulty || 'beginner'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>{template.duration_minutes}min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4" />
          <span>{(template.exercises as any[]).length} exercises</span>
        </div>
      </div>
    </motion.div>
  )
}

// stat card for summary
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

// skeleton loader
function TemplateSkeleton() {
  return (
    <div className="ios-card p-4 animate-pulse">
      <div className="h-5 bg-muted rounded w-2/3 mb-2" />
      <div className="h-4 bg-muted rounded w-full mb-4" />
      <div className="flex gap-4">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-4 bg-muted rounded w-20" />
      </div>
    </div>
  )
}

// helper functions
function calculateTotalTime(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
}

function calculateAvgTime(workouts: Workout[]): number {
  if (workouts.length === 0) return 0
  return Math.round(calculateTotalTime(workouts) / workouts.length)
}
