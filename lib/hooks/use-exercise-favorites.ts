'use client'

import { useEffect, useState } from 'react'

export function useExerciseFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('workout-exercise-favorites')
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('workout-exercise-favorites', JSON.stringify(Array.from(favorites)))
      } catch (error) {
        console.error('Failed to save favorites:', error)
      }
    }
  }, [favorites, isLoaded])

  const toggleFavorite = (exerciseId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
  }

  const isFavorite = (exerciseId: string) => {
    return favorites.has(exerciseId)
  }

  const clearFavorites = () => {
    setFavorites(new Set())
  }

  return {
    favorites,
    isLoaded,
    toggleFavorite,
    isFavorite,
    clearFavorites
  }
}
