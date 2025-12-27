'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Calendar, Clock, Dumbbell, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { hapticFeedback } from '@/lib/utils'
import { format } from 'date-fns'
import type { WorkoutTemplate } from '@/lib/supabase'
import { useCreateScheduledWorkout } from '@/lib/hooks/use-workout-schedule'

interface WorkoutScheduleSheetProps {
  isOpen: boolean
  selectedDate: Date | null
  templates: WorkoutTemplate[]
  onClose: () => void
  onSuccess?: () => void
}

export function WorkoutScheduleSheet({
  isOpen,
  selectedDate,
  templates,
  onClose,
  onSuccess
}: WorkoutScheduleSheetProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [notes, setNotes] = useState('')
  const createScheduledWorkout = useCreateScheduledWorkout()

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTemplate) return

    try {
      await createScheduledWorkout.mutateAsync({
        template_id: selectedTemplate.id,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined
      })

      hapticFeedback('medium')
      setSelectedTemplate(null)
      setNotes('')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to schedule workout:', error)
      hapticFeedback('heavy')
      // TODO: Show error toast
    }
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setNotes('')
    onClose()
    hapticFeedback('light')
  }

  if (!selectedDate) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 40, stiffness: 400, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-[70] bg-background rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="safe-top p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="ios-headline">Schedule Workout</h2>
                <p className="ios-caption text-muted-foreground mt-0.5">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Select Template */}
              <div className="space-y-2">
                <Label className="ios-subheadline">Select Template</Label>
                <div className="space-y-2">
                  {templates.map((template) => {
                    const exercises = (template.exercises as any[]) || []
                    const isSelected = selectedTemplate?.id === template.id

                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template)
                          hapticFeedback('light')
                        }}
                        className={`
                          w-full ios-card p-3 border-2 transition-all
                          ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <h4 className="ios-subheadline truncate">{template.name}</h4>
                            <p className="ios-caption text-muted-foreground">
                              {template.difficulty} • {template.duration_minutes}min • {exercises.length} exercises
                            </p>
                          </div>
                          {isSelected && (
                            <div className="shrink-0">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <ChevronRight className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}

                  {templates.length === 0 && (
                    <div className="text-center py-8">
                      <p className="ios-body text-muted-foreground">
                        No templates available. Create a template first.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Notes */}
              {selectedTemplate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Label htmlFor="notes" className="ios-subheadline">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes for this workout..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="safe-bottom p-4 border-t bg-background/95 backdrop-blur flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 min-h-touch"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={!selectedTemplate || createScheduledWorkout.isPending}
                className="flex-1 min-h-touch gap-2"
              >
                <Calendar className="h-4 w-4" />
                {createScheduledWorkout.isPending ? 'Scheduling...' : 'Schedule Workout'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
