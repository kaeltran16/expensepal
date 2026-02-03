'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, Reorder } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Clock,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { TimeOfDayPicker } from './TimeOfDayPicker'
import type {
  RoutineStep,
  CustomRoutineStep,
  RoutineTemplate,
  TemplateStepRef,
  TimeOfDay,
  CreateRoutineTemplateInput,
} from '@/lib/types/routines'

interface RoutineTemplateBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (template: CreateRoutineTemplateInput) => void
  template?: RoutineTemplate | null
  availableSteps: RoutineStep[]
  customSteps: CustomRoutineStep[]
  isLoading?: boolean
}

const EMOJI_OPTIONS = ['🌅', '🌙', '💪', '🧘', '✨', '🌟', '💆', '🎯', '🏃', '💧']

interface SelectedStep extends TemplateStepRef {
  name: string
  duration_seconds: number
  category?: string
}

export function RoutineTemplateBuilder({
  open,
  onOpenChange,
  onSave,
  template,
  availableSteps,
  customSteps,
  isLoading,
}: RoutineTemplateBuilderProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('✨')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | undefined>()
  const [selectedSteps, setSelectedSteps] = useState<SelectedStep[]>([])
  const [stepPickerOpen, setStepPickerOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Initialize form when editing
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setIcon(template.icon || '✨')
      setTimeOfDay(template.time_of_day || undefined)

      // Expand template steps with full data
      const expanded: SelectedStep[] = (template.steps || []).map((stepRef) => {
        const step = availableSteps.find((s) => s.id === stepRef.step_id)
        const customStep = customSteps.find((s) => s.id === stepRef.step_id)
        const foundStep = step || customStep

        return {
          ...stepRef,
          name: foundStep?.name || 'Unknown Step',
          duration_seconds: stepRef.custom_duration || foundStep?.duration_seconds || 60,
          category: foundStep?.category || undefined,
        }
      })
      setSelectedSteps(expanded)
    } else {
      // Reset form
      setName('')
      setDescription('')
      setIcon('✨')
      setTimeOfDay(undefined)
      setSelectedSteps([])
    }
  }, [template, availableSteps, customSteps, open])

  const handleSave = () => {
    const steps: TemplateStepRef[] = selectedSteps.map((step, index) => ({
      step_id: step.step_id,
      order: index,
      notes: step.notes,
      custom_duration: step.custom_duration,
      is_custom: step.is_custom,
    }))

    const totalMinutes = Math.ceil(
      selectedSteps.reduce((acc, s) => acc + s.duration_seconds, 0) / 60
    )

    onSave({
      name,
      description: description || undefined,
      icon,
      time_of_day: timeOfDay,
      estimated_minutes: totalMinutes,
      steps,
    })
  }

  const handleAddStep = (step: RoutineStep | CustomRoutineStep, isCustom: boolean) => {
    const newStep: SelectedStep = {
      step_id: step.id,
      order: selectedSteps.length,
      is_custom: isCustom,
      name: step.name,
      duration_seconds: step.duration_seconds,
      category: step.category || undefined,
    }
    setSelectedSteps([...selectedSteps, newStep])
  }

  const handleRemoveStep = (index: number) => {
    setSelectedSteps(selectedSteps.filter((_, i) => i !== index))
  }

  const isValid = name.trim().length > 0 && selectedSteps.length > 0

  // Group steps by category
  const stepsByCategory = availableSteps.reduce(
    (acc, step) => {
      const category = step.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(step)
      return acc
    },
    {} as Record<string, RoutineStep[]>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>{template ? 'Edit Routine' : 'New Routine'}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-safe">
          {/* Name and icon */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Icon</label>
              <div className="relative">
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500 text-2xl"
                  onClick={() => {
                    const currentIndex = EMOJI_OPTIONS.indexOf(icon)
                    const nextIndex = (currentIndex + 1) % EMOJI_OPTIONS.length
                    setIcon(EMOJI_OPTIONS[nextIndex])
                  }}
                >
                  {icon}
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning Routine"
                className="mt-1"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Start your day right"
              className="mt-1"
            />
          </div>

          {/* Time of day */}
          <div>
            <label className="text-xs text-muted-foreground">Time of Day</label>
            <TimeOfDayPicker
              value={timeOfDay}
              onChange={setTimeOfDay}
              className="mt-2"
            />
          </div>

          {/* Selected steps */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                Steps ({selectedSteps.length})
              </label>
              <span className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" />
                {Math.ceil(selectedSteps.reduce((a, s) => a + s.duration_seconds, 0) / 60)} min
              </span>
            </div>

            {selectedSteps.length > 0 && (
              <Reorder.Group
                axis="y"
                values={selectedSteps}
                onReorder={setSelectedSteps}
                className="space-y-2"
              >
                {selectedSteps.map((step, index) => (
                  <Reorder.Item
                    key={step.step_id + index}
                    value={step}
                    className="flex items-center gap-2 rounded-lg bg-muted p-3"
                  >
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-xs text-white">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(step.duration_seconds / 60)}m {step.duration_seconds % 60}s
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => handleRemoveStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setStepPickerOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </div>

          {/* Step picker */}
          {stepPickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-background p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium">Add Steps</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setStepPickerOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {Object.entries(stepsByCategory).map(([category, steps]) => (
                  <Collapsible
                    key={category}
                    open={expandedCategory === category}
                    onOpenChange={(open) => setExpandedCategory(open ? category : null)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted p-2 text-sm font-medium capitalize">
                      {category}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedCategory === category && 'rotate-180'
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {steps.map((step) => {
                        const isAdded = selectedSteps.some((s) => s.step_id === step.id)
                        return (
                          <button
                            key={step.id}
                            onClick={() => !isAdded && handleAddStep(step, false)}
                            disabled={isAdded}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm',
                              isAdded
                                ? 'bg-teal-50 dark:bg-teal-900/20'
                                : 'hover:bg-muted'
                            )}
                          >
                            {isAdded ? (
                              <Check className="h-4 w-4 text-teal-500" />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="flex-1">{step.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(step.duration_seconds / 60)}m
                            </span>
                          </button>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {/* Custom steps */}
                {customSteps.length > 0 && (
                  <Collapsible
                    open={expandedCategory === 'custom'}
                    onOpenChange={(open) => setExpandedCategory(open ? 'custom' : null)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted p-2 text-sm font-medium">
                      My Custom Steps
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedCategory === 'custom' && 'rotate-180'
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {customSteps.map((step) => {
                        const isAdded = selectedSteps.some((s) => s.step_id === step.id)
                        return (
                          <button
                            key={step.id}
                            onClick={() => !isAdded && handleAddStep(step, true)}
                            disabled={isAdded}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm',
                              isAdded
                                ? 'bg-teal-50 dark:bg-teal-900/20'
                                : 'hover:bg-muted'
                            )}
                          >
                            {isAdded ? (
                              <Check className="h-4 w-4 text-teal-500" />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="flex-1">{step.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(step.duration_seconds / 60)}m
                            </span>
                          </button>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-teal-500 hover:bg-teal-600"
              onClick={handleSave}
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
