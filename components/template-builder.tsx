'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  Dumbbell,
  Clock,
  TrendingUp,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkoutTemplate, Exercise } from '@/lib/supabase'
import { useExercises, useCreateTemplate, useUpdateTemplate } from '@/lib/hooks'
import { hapticFeedback } from '@/lib/utils'
import { toast } from 'sonner'

interface TemplateExercise {
  exercise_id: string
  exercise?: Exercise // for display purposes
  sets: number
  reps: string // can be "8-12" or "10"
  rest_seconds: number
  notes?: string
}

interface TemplateBuilderProps {
  open: boolean
  onClose: () => void
  template?: WorkoutTemplate | null // if editing existing template
  onSave?: (template: WorkoutTemplate) => void
}

export function TemplateBuilder({
  open,
  onClose,
  template,
  onSave,
}: TemplateBuilderProps) {
  // form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'beginner'
  )
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([])

  // ui state
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  // mutations
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  // fetch all exercises for matching
  const { data: allExercises = [] } = useExercises()

  // load template data if editing
  useEffect(() => {
    if (template && allExercises.length > 0) {
      setName(template.name)
      setDescription(template.description || '')
      setDifficulty(template.difficulty as any || 'beginner')
      setDurationMinutes(template.duration_minutes || 45)

      // parse exercises from jsonb and hydrate with full exercise data
      const exercises = template.exercises as any[]
      const hydratedExercises = exercises.map((ex) => ({
        ...ex,
        exercise: allExercises.find((e) => e.id === ex.exercise_id),
      }))
      setTemplateExercises(hydratedExercises)
    } else if (!template) {
      // reset form
      setName('')
      setDescription('')
      setDifficulty('beginner')
      setDurationMinutes(45)
      setTemplateExercises([])
    }
  }, [template, open, allExercises])

  const handleAddExercise = (exercise: Exercise) => {
    const newExercise: TemplateExercise = {
      exercise_id: exercise.id,
      exercise, // store full exercise for display
      sets: 3,
      reps: '8-12',
      rest_seconds: 90,
    }

    setTemplateExercises([...templateExercises, newExercise])
    setShowExercisePicker(false)
    hapticFeedback('light')
  }

  const handleRemoveExercise = (index: number) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== index))
    hapticFeedback('medium')
  }

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newExercises = [...templateExercises]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newExercises.length) return

    ;[newExercises[index], newExercises[targetIndex]] = [
      newExercises[targetIndex],
      newExercises[index],
    ]

    setTemplateExercises(newExercises)
    hapticFeedback('light')
  }

  const handleUpdateExercise = (
    index: number,
    field: keyof TemplateExercise,
    value: any
  ) => {
    const newExercises = [...templateExercises]
    newExercises[index] = { ...newExercises[index], [field]: value }
    setTemplateExercises(newExercises)
  }

  const handleSave = async () => {
    // validation
    if (!name.trim()) {
      toast.error('please enter a template name')
      return
    }

    if (templateExercises.length === 0) {
      toast.error('add at least one exercise')
      return
    }

    // prepare exercises for jsonb (remove full exercise object)
    const exercisesForDb = templateExercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes,
    }))

    try {
      if (template?.id) {
        // update existing template
        await updateTemplate.mutateAsync({
          id: template.id,
          name,
          description,
          difficulty,
          duration_minutes: durationMinutes,
          exercises: exercisesForDb,
        })

        onClose()
      } else {
        // create new template
        await createTemplate.mutateAsync({
          name,
          description,
          difficulty,
          duration_minutes: durationMinutes,
          exercises: exercisesForDb,
        })

        onClose()
      }
    } catch (error) {
      console.error('failed to save template:', error)
    }
  }

  if (!open) return null

  return (
    <>
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      {/* main sheet */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-background z-50 shadow-2xl"
      >
        <div className="flex flex-col h-full">
          {/* header */}
          <div className="flex items-center justify-between p-4 border-b glass">
            <div>
              <h2 className="ios-title1">
                {template ? 'edit template' : 'create template'}
              </h2>
              <p className="ios-caption text-muted-foreground">
                build your custom workout
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* form */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* basic info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">template name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. push day, leg day"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">description</Label>
                  <Textarea
                    id="description"
                    placeholder="what this workout focuses on..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(value: any) => setDifficulty(value)}
                    >
                      <SelectTrigger id="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">beginner</SelectItem>
                        <SelectItem value="intermediate">intermediate</SelectItem>
                        <SelectItem value="advanced">advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      min={10}
                      max={180}
                    />
                  </div>
                </div>
              </div>

              {/* exercises section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>exercises ({templateExercises.length})</Label>
                  <Button
                    size="sm"
                    onClick={() => setShowExercisePicker(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    add exercise
                  </Button>
                </div>

                {templateExercises.length === 0 ? (
                  <div className="ios-card p-8 text-center">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      no exercises added yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templateExercises.map((ex, index) => (
                      <ExerciseConfigCard
                        key={index}
                        exercise={ex}
                        index={index}
                        canMoveUp={index > 0}
                        canMoveDown={index < templateExercises.length - 1}
                        onUpdate={(field, value) =>
                          handleUpdateExercise(index, field, value)
                        }
                        onRemove={() => handleRemoveExercise(index)}
                        onMoveUp={() => handleMoveExercise(index, 'up')}
                        onMoveDown={() => handleMoveExercise(index, 'down')}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* footer actions */}
          <div className="p-4 border-t glass">
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createTemplate.isPending || updateTemplate.isPending}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                {createTemplate.isPending || updateTemplate.isPending
                  ? 'saving...'
                  : 'save template'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* exercise picker modal */}
      <AnimatePresence>
        {showExercisePicker && (
          <ExercisePicker
            onSelect={handleAddExercise}
            onClose={() => setShowExercisePicker(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// exercise config card component
function ExerciseConfigCard({
  exercise,
  index,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  exercise: TemplateExercise
  index: number
  canMoveUp: boolean
  canMoveDown: boolean
  onUpdate: (field: keyof TemplateExercise, value: any) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="ios-card p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-semibold text-muted-foreground">
              {index + 1}.
            </span>
            <h4 className="ios-headline">{exercise.exercise?.name || 'exercise'}</h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {exercise.exercise?.muscle_groups?.map((muscle) => (
              <Badge key={muscle} variant="secondary" className="text-xs capitalize">
                {muscle}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* exercise config */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">sets</Label>
          <Input
            type="number"
            value={exercise.sets}
            onChange={(e) => onUpdate('sets', Number(e.target.value))}
            min={1}
            max={10}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">reps</Label>
          <Input
            value={exercise.reps}
            onChange={(e) => onUpdate('reps', e.target.value)}
            placeholder="8-12"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">rest (sec)</Label>
          <Input
            type="number"
            value={exercise.rest_seconds}
            onChange={(e) => onUpdate('rest_seconds', Number(e.target.value))}
            min={30}
            max={300}
            step={15}
            className="h-9"
          />
        </div>
      </div>
    </motion.div>
  )
}

// exercise picker component
function ExercisePicker({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const { data: exercises = [], isLoading } = useExercises()

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      !searchQuery ||
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscle_groups?.some((m) =>
        m.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesCategory = !categoryFilter || exercise.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const categories = ['strength', 'cardio', 'flexibility']

  return (
    <>
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
      />

      {/* picker modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-4 top-[10%] bottom-[10%] z-[60] max-w-2xl mx-auto"
      >
        <div className="ios-card h-full flex flex-col">
          {/* header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="ios-title2">select exercise</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* search and filters */}
          <div className="p-4 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

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
          </div>

          {/* exercise list */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-12">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">no exercises found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map((exercise) => (
                  <motion.button
                    key={exercise.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelect(exercise)
                      hapticFeedback('light')
                    }}
                    className="w-full ios-card p-4 text-left hover:border-primary transition-colors"
                  >
                    <h4 className="ios-headline mb-2">{exercise.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">
                        {exercise.category}
                      </Badge>
                      {exercise.muscle_groups?.slice(0, 3).map((muscle) => (
                        <Badge
                          key={muscle}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </motion.div>
    </>
  )
}
