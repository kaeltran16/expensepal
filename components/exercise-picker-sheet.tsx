'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExercises } from '@/lib/hooks/use-workouts'
import { useExerciseFavorites } from '@/lib/hooks/use-exercise-favorites'
import { useRecentExercises } from '@/lib/hooks/use-recent-exercises'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, Heart, Search, X } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState, useCallback, memo, useRef, useEffect } from 'react'

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
  const [displayCount, setDisplayCount] = useState(30) // Start with 30 exercises
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: exercises = [], isLoading } = useExercises()
  const { favorites, toggleFavorite, isFavorite } = useExerciseFavorites()
  const { recentIds, addRecent } = useRecentExercises()

  // Filter exercises based on search, area, equipment, and active tab
  const filteredExercises = useMemo(() => {
    let filtered = exercises

    // Tab filter (favorites or recent)
    if (activeTab === 'favorites') {
      filtered = exercises.filter((ex: Exercise) => favorites.has(ex.id))
    } else if (activeTab === 'recent') {
      // Sort by recent order
      const recentSet = new Set(recentIds)
      filtered = exercises.filter((ex: Exercise) => recentSet.has(ex.id))
      // Sort by recency
      filtered = filtered.sort((a: Exercise, b: Exercise) => {
        const aIndex = recentIds.indexOf(a.id)
        const bIndex = recentIds.indexOf(b.id)
        return aIndex - bIndex
      })
    }

    // Search filter
    filtered = filtered.filter((exercise: Exercise) => {
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

    return filtered
  }, [exercises, searchQuery, selectedArea, selectedEquipment, activeTab, favorites, recentIds])

  // Paginated exercises - only show displayCount items
  const displayedExercises = useMemo(() => {
    return filteredExercises.slice(0, displayCount)
  }, [filteredExercises, displayCount])

  const hasMore = displayCount < filteredExercises.length

  // Load more exercises
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount(prev => prev + 30)
    }
  }, [hasMore])

  // Reset display count when filters change
  const resetDisplayCount = useCallback(() => {
    setDisplayCount(30)
  }, [])

  // Reset on filter/search changes
  useMemo(() => {
    resetDisplayCount()
  }, [searchQuery, selectedArea, selectedEquipment, activeTab, resetDisplayCount])

  // Handle scroll event for infinite loading
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      // Load more when scrolled to bottom (with 200px threshold)
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore) {
        loadMore()
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadMore])

  const toggleExercise = useCallback((exerciseId: string) => {
    // Always toggle selection
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
  }, [])

  const handleDone = () => {
    const selected = exercises.filter((e: Exercise) => selectedExercises.has(e.id))
    onSelectExercises(selected)
    // Track all selected as recent
    selected.forEach((ex: Exercise) => addRecent(ex.id))
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
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[100] bg-background rounded-t-3xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Add Exercise</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-10 w-10 -mr-2"
                  aria-label="Close"
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
                    onClick={() => {
                      setActiveTab(tab)
                      hapticFeedback('light')
                    }}
                    className={`py-2 text-sm font-semibold transition-colors relative ${
                      activeTab === tab
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'favorites' && favorites.size > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                        {favorites.size}
                      </span>
                    )}
                    {tab === 'recent' && recentIds.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                        {recentIds.length}
                      </span>
                    )}
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
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-4">
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
                  className="text-center py-16 px-4"
                >
                  {activeTab === 'favorites' ? (
                    <>
                      <Heart className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg font-medium mb-2">No favorites yet</p>
                      <p className="text-sm text-muted-foreground/70">
                        Tap the heart icon on exercises to save them here
                      </p>
                    </>
                  ) : activeTab === 'recent' ? (
                    <>
                      <Dumbbell className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg font-medium mb-2">No recent exercises</p>
                      <p className="text-sm text-muted-foreground/70">
                        Exercises you add will appear here
                      </p>
                    </>
                  ) : (
                    <>
                      <Dumbbell className="h-14 w-14 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">No exercises found</p>
                      <p className="text-sm text-muted-foreground/70 mt-2">
                        Try adjusting your filters
                      </p>
                    </>
                  )}
                </motion.div>
              ) : (
                <>
                  <div className="space-y-3 pb-6">
                    {displayedExercises.map((exercise: Exercise) => (
                      <ExerciseListItem
                        key={exercise.id}
                        exercise={exercise}
                        isSelected={selectedExercises.has(exercise.id)}
                        isFavorite={isFavorite(exercise.id)}
                        onToggle={() => toggleExercise(exercise.id)}
                        onToggleFavorite={() => {
                          toggleFavorite(exercise.id)
                          hapticFeedback('light')
                        }}
                      />
                    ))}
                  </div>

                  {/* Loading indicator when scrolling */}
                  {hasMore && (
                    <div className="pb-6 flex justify-center">
                      <div className="text-sm text-muted-foreground">
                        Scroll for more...
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Floating Add Button - Always visible */}
            <div className="p-5 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom">
              <Button
                onClick={handleDone}
                disabled={selectedExercises.size === 0}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-semibold"
                size="lg"
              >
                Add {selectedExercises.size > 0 && `(${selectedExercises.size})`}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Exercise list item component - Memoized for performance
const ExerciseListItem = memo(function ExerciseListItem({
  exercise,
  isSelected,
  isFavorite,
  onToggle,
  onToggleFavorite
}: {
  exercise: Exercise
  isSelected: boolean
  isFavorite: boolean
  onToggle: () => void
  onToggleFavorite: () => void
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <motion.button
      onClick={onToggle}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
            loading="lazy"
            unoptimized
            sizes="80px"
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

      {/* Favorite Heart Icon */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
        className="shrink-0 p-1 hover:bg-muted/50 rounded-lg transition-colors"
        whileTap={{ scale: 0.9 }}
      >
        <Heart
          className={`h-5 w-5 transition-all ${
            isFavorite
              ? 'fill-red-500 text-red-500'
              : 'text-muted-foreground/40 hover:text-red-400'
          }`}
        />
      </motion.button>
    </motion.button>
  )
})
