'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExercises } from '@/lib/hooks/use-workouts'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, Heart, Search, X } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'

interface Exercise {
  id: string
  name: string
  category: string
  equipment: string | null
  muscle_groups: string[]
  image_url: string | null
  gif_url: string | null
  difficulty: string | null
}

interface ExercisePickerSheetProps {
  isOpen: boolean
  onClose: () => void
  onSelectExercises: (exercises: Exercise[]) => void
}

// Body area filters
const AREA_FILTERS = [
  { id: 'all', label: 'Area' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Leg' },
  { id: 'shoulders', label: 'Shoulder' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'abdominals', label: 'Abs' },
]

// Equipment filters
const EQUIPMENT_FILTERS = [
  { id: 'all', label: 'Equipment' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbell', label: 'Dumbbell' },
  { id: 'kettlebells', label: 'Kettlebell' },
  { id: 'cable', label: 'Cable' },
  { id: 'machine', label: 'Machine' },
  { id: 'body only', label: 'Bodyweight' },
]

export function ExercisePickerSheet({
  isOpen,
  onClose,
  onSelectExercises
}: ExercisePickerSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState('all')
  const [selectedEquipment, setSelectedEquipment] = useState('all')
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all')

  const { data: exercises = [], isLoading } = useExercises()

  // Filter exercises based on search, area, and equipment
  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise: Exercise) => {
      // Search filter
      if (searchQuery && !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Area filter (check muscle_groups)
      if (selectedArea !== 'all') {
        const muscleGroups = exercise.muscle_groups || []
        if (!muscleGroups.some((m: string) => m.toLowerCase().includes(selectedArea.toLowerCase()))) {
          return false
        }
      }

      // Equipment filter
      if (selectedEquipment !== 'all') {
        const equipment = exercise.equipment?.toLowerCase() || ''
        if (!equipment.includes(selectedEquipment.toLowerCase())) {
          return false
        }
      }

      return true
    })
  }, [exercises, searchQuery, selectedArea, selectedEquipment])

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
    hapticFeedback('light')
  }

  const handleDone = () => {
    const selected = exercises.filter((e: Exercise) => selectedExercises.has(e.id))
    onSelectExercises(selected)
    setSelectedExercises(new Set())
    onClose()
    hapticFeedback('medium')
  }

  const handleClose = () => {
    setSelectedExercises(new Set())
    setSearchQuery('')
    setSelectedArea('all')
    setSelectedEquipment('all')
    onClose()
  }

  if (!isOpen) return null

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
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[80] bg-background rounded-t-3xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">Add Exercise</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-10 w-10 -mr-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search exercise by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-muted/50 border-0 rounded-xl text-base"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 py-3 border-b">
              <div className="flex gap-6">
                {(['all', 'favorites', 'recent'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 text-sm font-semibold transition-colors ${
                      activeTab === tab
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {tab === 'all' ? 'MY' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="px-5 py-4 space-y-3 border-b">
              {/* Area filters */}
              <div className="flex flex-wrap gap-2">
                {AREA_FILTERS.map((filter, idx) => (
                  <motion.button
                    key={filter.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => {
                      setSelectedArea(filter.id)
                      hapticFeedback('light')
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedArea === filter.id
                        ? 'bg-foreground text-background'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {filter.label}
                  </motion.button>
                ))}
              </div>

              {/* Equipment filters */}
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_FILTERS.map((filter, idx) => (
                  <motion.button
                    key={filter.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + idx * 0.02 }}
                    onClick={() => {
                      setSelectedEquipment(filter.id)
                      hapticFeedback('light')
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedEquipment === filter.id
                        ? 'bg-foreground text-background'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {filter.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="px-5 py-3 flex justify-between text-sm text-muted-foreground">
              <span>Selected exercises {selectedExercises.size.toString().padStart(2, '0')} / {filteredExercises.length}</span>
              <span>Total {exercises.length}</span>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 animate-pulse"
                    >
                      <div className="w-20 h-20 rounded-xl bg-muted" />
                      <div className="flex-1">
                        <div className="h-5 bg-muted rounded w-32 mb-2" />
                        <div className="h-4 bg-muted rounded w-20" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : filteredExercises.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <Dumbbell className="h-14 w-14 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No exercises found</p>
                </motion.div>
              ) : (
                <motion.div 
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.03
                      }
                    }
                  }}
                >
                  {filteredExercises.map((exercise: Exercise) => (
                    <ExerciseListItem
                      key={exercise.id}
                      exercise={exercise}
                      isSelected={selectedExercises.has(exercise.id)}
                      onToggle={() => toggleExercise(exercise.id)}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Done Button */}
            <div className="p-5 border-t bg-background safe-bottom">
              <Button
                onClick={handleDone}
                disabled={selectedExercises.size === 0}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-semibold"
                size="lg"
              >
                Done ({selectedExercises.size} selected)
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Exercise list item component
function ExerciseListItem({
  exercise,
  isSelected,
  onToggle
}: {
  exercise: Exercise
  isSelected: boolean
  onToggle: () => void
}) {
  const [imageError, setImageError] = useState(false)

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  }

  return (
    <motion.button
      onClick={onToggle}
      variants={itemVariants}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
        isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
      }`}
      whileTap={{ scale: 0.98 }}
    >
      {/* Exercise Image */}
      <div className="w-20 h-20 rounded-xl bg-muted/50 overflow-hidden shrink-0 relative">
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
            <Dumbbell className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 min-w-0 text-left">
        <h4 className="font-semibold text-base mb-1 truncate">{exercise.name}</h4>
        <p className="text-sm text-muted-foreground truncate capitalize">
          {exercise.equipment || 'Body Only'}
        </p>
      </div>

      {/* Favorite Button */}
      <motion.div
        animate={{ 
          scale: isSelected ? [1, 1.2, 1] : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <Heart
          className={`h-6 w-6 shrink-0 transition-colors ${
            isSelected ? 'fill-primary text-primary' : 'text-muted-foreground/50'
          }`}
        />
      </motion.div>
    </motion.button>
  )
}
