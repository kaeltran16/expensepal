'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { hapticFeedback } from '@/lib/utils'
import type { WorkoutTemplate, WorkoutTemplateInsert } from '@/lib/supabase'

interface TemplateFormDialogProps {
  isOpen: boolean
  template?: WorkoutTemplate
  onClose: () => void
  onSave: (template: Partial<WorkoutTemplateInsert>) => Promise<void>
  title: string
}

export function TemplateFormDialog({
  isOpen,
  template,
  onClose,
  onSave,
  title
}: TemplateFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<string>('beginner')
  const [duration, setDuration] = useState('45')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when template changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name)
        setDescription(template.description || '')
        setDifficulty(template.difficulty || 'beginner')
        setDuration(template.duration_minutes?.toString() || '45')
      } else {
        // Reset for new template
        setName('')
        setDescription('')
        setDifficulty('beginner')
        setDuration('45')
      }
    }
  }, [isOpen, template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await onSave({
        name,
        description,
        difficulty,
        duration_minutes: parseInt(duration),
        exercises: template?.exercises || []
      })
      hapticFeedback('medium')
    } catch (error) {
      console.error('Failed to save template:', error)
      hapticFeedback('heavy')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
      />

      {/* Dialog Container */}
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[calc(100vh-80px)] sm:max-h-[85vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {template ? 'Update your workout template' : 'Create a new workout template'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Template Name *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Push Day, Full Body"
                    className="text-lg h-12"
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this workout..."
                    className="min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>

                {/* Difficulty Pills */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Difficulty Level</Label>
                  <div className="flex gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setDifficulty(level)
                          hapticFeedback('light')
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          difficulty === level
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <span className="capitalize">{level}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium">
                    Estimated Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="45"
                    className="h-12"
                    min="5"
                    max="180"
                    required
                  />
                </div>

                {/* Info Note */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">
                    💡 After {template ? 'updating' : 'creating'} the template, you can add exercises and configure sets, reps, and rest times.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 min-h-touch"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 min-h-touch"
                  disabled={isSaving || !name.trim()}
                >
                  {isSaving ? 'Saving...' : template ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
