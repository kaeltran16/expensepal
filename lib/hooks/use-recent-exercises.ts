'use client'

import { useEffect, useState } from 'react'

const MAX_RECENT = 20

export function useRecentExercises() {
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load recent exercises from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('workout-exercise-recent')
      if (stored) {
        setRecentIds(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load recent exercises:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save recent exercises to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('workout-exercise-recent', JSON.stringify(recentIds))
      } catch (error) {
        console.error('Failed to save recent exercises:', error)
      }
    }
  }, [recentIds, isLoaded])

  const addRecent = (exerciseId: string) => {
    setRecentIds(prev => {
      // Remove if already exists
      const filtered = prev.filter(id => id !== exerciseId)
      // Add to front
      const updated = [exerciseId, ...filtered]
      // Keep only MAX_RECENT items
      return updated.slice(0, MAX_RECENT)
    })
  }

  const clearRecent = () => {
    setRecentIds([])
  }

  return {
    recentIds,
    isLoaded,
    addRecent,
    clearRecent
  }
}
