'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell,
  Play,
  Clock,
  TrendingUp,
  Plus,
  Search,
  Filter as FilterIcon,
  Edit2,
  Trash2,
  BookOpen,
  BarChart3,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { WorkoutTemplate, Workout } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { useExercises, useDeleteTemplate } from '@/lib/hooks'
import { TemplateBuilder } from '@/components/template-builder'

interface WorkoutsViewPlanfitProps {
  templates: WorkoutTemplate[]
  recentWorkouts: Workout[]
  loading: boolean
  onStartWorkout: (template: WorkoutTemplate) => void
}

export function WorkoutsViewPlanfit({
  templates,
  recentWorkouts,
  loading,
  onStartWorkout,
}: WorkoutsViewPlanfitProps) {
  const [activeTab, setActiveTab] = useState('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)

  // mutations
  const deleteTemplate = useDeleteTemplate()

  const handleTemplateClick = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateModal(true)
    hapticFeedback('light')
  }

  const handleStartWorkout = () => {
    if (selectedTemplate) {
      onStartWorkout(selectedTemplate)
      setShowTemplateModal(false)
      hapticFeedback('medium')
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setShowTemplateBuilder(true)
    hapticFeedback('medium')
  }

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template)
    setShowTemplateBuilder(true)
    setShowTemplateModal(false)
    hapticFeedback('light')
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('delete this template? this action cannot be undone.')) {
      await deleteTemplate.mutateAsync(templateId)
      hapticFeedback('medium')
    }
  }

  const handleCloseBuilder = () => {
    setShowTemplateBuilder(false)
    setEditingTemplate(null)
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
      <div className="pb-24">
        {/* header with create button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="ios-title1">workouts</h2>
            <p className="ios-caption text-muted-foreground">
              build strength, track progress
            </p>
          </div>
          <Button
            onClick={handleCreateTemplate}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            create
          </Button>
        </div>

        {/* tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 glass">
            <TabsTrigger value="templates" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">templates</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">history</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="gap-2">
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">exercises</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">progress</span>
            </TabsTrigger>
          </TabsList>

          {/* templates tab */}
          <TabsContent value="templates" className="space-y-6 mt-0">
            {/* this week summary */}
            {recentWorkouts.length > 0 && (
              <div className="ios-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="ios-headline">this week</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="h-4 w-4" />
                    <span>{recentWorkouts.length} workouts</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label="total time"
                    value={`${calculateTotalTime(recentWorkouts)}min`}
                  />
                  <StatCard label="workouts" value={recentWorkouts.length.toString()} />
                  <StatCard
                    label="avg time"
                    value={`${calculateAvgTime(recentWorkouts)}min`}
                  />
                </div>
              </div>
            )}

            {/* template list */}
            <div className="space-y-3">
              <h3 className="ios-headline px-1">workout templates</h3>
              {templates.length === 0 ? (
                <div className="ios-card p-8 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">no templates yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    create your first workout template
                  </p>
                  <Button onClick={handleCreateTemplate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    create template
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template, index) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      index={index}
                      onClick={() => handleTemplateClick(template)}
                      onEdit={() => handleEditTemplate(template)}
                      onDelete={() => handleDeleteTemplate(template.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* workout history tab */}
          <TabsContent value="history" className="space-y-4 mt-0">
            <WorkoutHistory workouts={recentWorkouts} />
          </TabsContent>

          {/* exercise library tab */}
          <TabsContent value="exercises" className="space-y-4 mt-0">
            <ExerciseLibrary />
          </TabsContent>

          {/* analytics tab */}
          <TabsContent value="analytics" className="space-y-4 mt-0">
            <div className="ios-card p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">coming soon</h3>
              <p className="text-sm text-muted-foreground">
                progress charts and analytics
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* template detail modal */}
      <AnimatePresence>
        {showTemplateModal && selectedTemplate && (
          <>
            {/* backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
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
                  {!selectedTemplate.is_default && (
                    <Button
                      variant="outline"
                      onClick={() => handleEditTemplate(selectedTemplate)}
                      className="flex-1 ripple-effect min-h-touch gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      edit
                    </Button>
                  )}
                  <Button
                    onClick={handleStartWorkout}
                    className="flex-1 ripple-effect min-h-touch gap-2"
                  >
                    <Play className="h-4 w-4" />
                    start workout
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* template builder */}
      <TemplateBuilder
        open={showTemplateBuilder}
        onClose={handleCloseBuilder}
        template={editingTemplate}
      />
    </>
  )
}

// template card component with edit/delete actions
function TemplateCard({
  template,
  index,
  onClick,
  onEdit,
  onDelete,
}: {
  template: WorkoutTemplate
  index: number
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [showActions, setShowActions] = useState(false)

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

  const isCustom = !template.is_default

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="ios-card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="ios-headline">{template.name}</h4>
            {isCustom && (
              <Badge variant="secondary" className="text-xs">
                custom
              </Badge>
            )}
          </div>
          <p className="ios-caption text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
              template.difficulty || 'beginner'
            )}`}
          >
            {template.difficulty || 'beginner'}
          </span>
          {isCustom && (onEdit || onDelete) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                setShowActions(!showActions)
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
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

        {showActions && isCustom && (
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                  setShowActions(false)
                }}
                className="gap-2"
              >
                <Edit2 className="h-3 w-3" />
                edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                  setShowActions(false)
                }}
                className="gap-2"
              >
                <Trash2 className="h-3 w-3" />
                delete
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// workout history component
function WorkoutHistory({ workouts }: { workouts: Workout[] }) {
  if (workouts.length === 0) {
    return (
      <div className="ios-card p-8 text-center">
        <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="font-semibold mb-2">no workouts yet</h3>
        <p className="text-sm text-muted-foreground">
          your completed workouts will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="ios-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="ios-headline">
              {new Date(workout.workout_date).toLocaleDateString()}
            </h4>
            <Badge variant="outline">{workout.duration_minutes}min</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4" />
              <span>completed</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// exercise library browser
function ExerciseLibrary() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const { data: exercises = [], isLoading } = useExercises()

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      !searchQuery ||
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscle_groups?.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = !categoryFilter || exercise.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const categories = ['strength', 'cardio', 'flexibility']

  return (
    <div className="space-y-4">
      {/* search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* category filters */}
      <div className="flex gap-2">
        <Button
          variant={categoryFilter === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter(null)}
        >
          all
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={categoryFilter === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* exercise list */}
      {isLoading ? (
        <div className="space-y-3">
          <TemplateSkeleton />
          <TemplateSkeleton />
        </div>
      ) : (
        <ScrollArea className="h-[50vh]">
          <div className="space-y-2 pr-4">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="ios-card p-4">
                <h4 className="ios-headline mb-1">{exercise.name}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">
                    {exercise.category}
                  </Badge>
                  {exercise.muscle_groups?.map((muscle) => (
                    <Badge key={muscle} variant="secondary" className="text-xs capitalize">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
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
