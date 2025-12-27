'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExercises } from '@/lib/hooks/use-workouts'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, Heart, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

interface ExerciseSet {
  id: string
  weight: number
  reps: number
}

interface Exercise {
  id: string
  name: string
  category: string
  equipment: string | null
  muscle_groups: string[]
  image_url: string | null
  gif_url: string | null
}

interface ExerciseDetailSheetProps {
  isOpen: boolean
  exerciseIndex: number | null
  exercise: {
    _id?: string
    name: string
    sets: number
    reps: string
    weight: number
    rest: number
    image_url?: string | null
    gif_url?: string | null
  } | null
  onClose: () => void
  onUpdate: (updates: { sets: number; weight: number; reps: string }) => void
  onDelete: () => void
  onReplace: (newExercise: Exercise) => void
}

export function ExerciseDetailSheet({
  isOpen,
  exerciseIndex,
  exercise,
  onClose,
  onUpdate,
  onDelete,
  onReplace
}: ExerciseDetailSheetProps) {
  const [sets, setSets] = useState<ExerciseSet[]>([])
  const [imageError, setImageError] = useState(false)
  const [showReplacePicker, setShowReplacePicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: allExercises = [], isLoading } = useExercises()

  // Filter exercises for replace picker
  const filteredExercises = useMemo(() => {
    if (!searchQuery) return allExercises.slice(0, 50)
    return allExercises.filter((ex: Exercise) => 
      ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50)
  }, [allExercises, searchQuery])

  // Initialize sets from exercise data
  useEffect(() => {
    if (exercise) {
      const initialSets: ExerciseSet[] = []
      const numSets = exercise.sets || 3
      const weight = exercise.weight || 0
      const reps = parseInt(exercise.reps) || 10

      for (let i = 0; i < numSets; i++) {
        initialSets.push({
          id: `set-${i}`,
          weight,
          reps
        })
      }
      setSets(initialSets)
      setImageError(false)
      setShowReplacePicker(false)
      setSearchQuery('')
    }
  }, [exercise])

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1]
    setSets([
      ...sets,
      {
        id: `set-${Date.now()}`,
        weight: lastSet?.weight || 0,
        reps: lastSet?.reps || 10
      }
    ])
    hapticFeedback('light')
  }

  const handleRemoveSet = (setId: string) => {
    if (sets.length > 1) {
      setSets(sets.filter(s => s.id !== setId))
      hapticFeedback('light')
    }
  }


  const handleSetValue = (setId: string, field: 'weight' | 'reps', value: number) => {
    setSets(sets.map(s => 
      s.id === setId ? { ...s, [field]: value } : s
    ))
  }

  const handleClose = () => {
    // Calculate average values for the exercise
    if (sets.length > 0) {
      const avgWeight = Math.round(sets.reduce((sum, s) => sum + s.weight, 0) / sets.length)
      const avgReps = Math.round(sets.reduce((sum, s) => sum + s.reps, 0) / sets.length)
      onUpdate({
        sets: sets.length,
        weight: avgWeight,
        reps: avgReps.toString()
      })
    }
    onClose()
  }

  const handleDelete = () => {
    onDelete()
    onClose()
    hapticFeedback('medium')
  }

  const handleReplaceExercise = (newExercise: Exercise) => {
    onReplace(newExercise)
    setShowReplacePicker(false)
    hapticFeedback('medium')
  }

  if (!isOpen || !exercise) return null

  const imageUrl = exercise.gif_url || exercise.image_url

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
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[90] bg-background flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-center justify-between safe-top border-b">
              <h2 className="text-xl font-bold truncate pr-4">
                {showReplacePicker ? 'Replace Exercise' : exercise.name}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={showReplacePicker ? () => setShowReplacePicker(false) : handleClose}
                className="h-10 w-10 -mr-2 shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {showReplacePicker ? (
              /* Replace Picker View */
              <>
                {/* Search */}
                <div className="px-5 pb-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search exercise..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 bg-muted/50 border-0 rounded-xl text-base"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Exercise List */}
                <div className="flex-1 overflow-y-auto px-5 pb-4">
                  {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredExercises.map((ex: Exercise) => (
                        <ReplaceExerciseItem
                          key={ex.id}
                          exercise={ex}
                          onSelect={() => handleReplaceExercise(ex)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Normal Detail View */
              <>
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 py-6">
                  {/* Exercise Image */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full aspect-[4/3] rounded-2xl bg-muted/30 overflow-hidden relative mb-6"
                  >
                    {!imageError && imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={exercise.name}
                        fill
                        className="object-contain"
                        onError={() => setImageError(true)}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-20 w-20 text-muted-foreground/30" />
                      </div>
                    )}
                  </motion.div>

                  {/* Add Warm-up Sets */}
                  <button className="w-full text-left py-4 border-b border-muted/50 flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add Warm-up Sets</span>
                  </button>

                  {/* Sets */}
                  <div className="py-4 space-y-3">
                    {sets.map((set, index) => (
                      <motion.div
                        key={set.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-muted/40"
                      >
                        {/* Set Number */}
                        <span className="w-14 text-sm font-medium text-muted-foreground shrink-0">
                          Set {index + 1}
                        </span>

                        {/* Weight Input */}
                        <input
                          type="number"
                          value={set.weight || ''}
                          onChange={(e) => handleSetValue(set.id, 'weight', parseInt(e.target.value) || 0)}
                          className="w-16 h-11 text-center bg-muted border-0 rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary"
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">kg</span>

                        {/* Reps Input */}
                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) => handleSetValue(set.id, 'reps', parseInt(e.target.value) || 0)}
                          className="w-16 h-11 text-center bg-muted border-0 rounded-xl font-semibold text-foreground focus:ring-2 focus:ring-primary"
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">reps</span>

                        {/* Delete Set */}
                        <button
                          onClick={() => handleRemoveSet(set.id)}
                          disabled={sets.length <= 1}
                          className="h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 ml-auto"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Add Set Button */}
                  <motion.button
                    onClick={handleAddSet}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 text-center font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    + Add Set
                  </motion.button>
                </div>

                {/* Action Buttons */}
                <div className="p-5 border-t bg-background safe-bottom flex gap-3">
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setShowReplacePicker(true)}
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Replace exercise item component
function ReplaceExerciseItem({
  exercise,
  onSelect
}: {
  exercise: Exercise
  onSelect: () => void
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <motion.button
      onClick={onSelect}
      className="w-full flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
      whileTap={{ scale: 0.98 }}
    >
      {/* Exercise Image */}
      <div className="w-14 h-14 rounded-xl bg-muted/50 overflow-hidden shrink-0 relative">
        {!imageError && (exercise.image_url || exercise.gif_url) ? (
          <Image
            src={exercise.gif_url || exercise.image_url || ''}
            alt={exercise.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 min-w-0 text-left">
        <h4 className="font-semibold text-sm truncate">{exercise.name}</h4>
        <p className="text-xs text-muted-foreground truncate capitalize">
          {exercise.equipment || 'Body Only'}
        </p>
      </div>

      <Heart className="h-5 w-5 text-muted-foreground/30 shrink-0" />
    </motion.button>
  )
}
