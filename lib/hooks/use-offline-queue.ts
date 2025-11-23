'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type PendingMutation = {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'expense' | 'budget' | 'goal' | 'meal'
  data: any
  timestamp: number
  retryCount: number
}

const QUEUE_KEY = 'offline_mutation_queue'
const MAX_RETRIES = 3

/**
 * Hook for managing offline mutation queue
 * Automatically retries failed mutations when back online
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<PendingMutation[]>([])
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const queryClient = useQueryClient()

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(QUEUE_KEY)
    if (stored) {
      try {
        setQueue(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load offline queue:', error)
      }
    }
  }, [])

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }, [queue])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online, processing queue...')
      setIsOnline(true)
    }

    const handleOffline = () => {
      console.log('Gone offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Process queue when back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      processQueue()
    }
  }, [isOnline, queue.length])

  /**
   * Add a mutation to the offline queue
   */
  const addToQueue = useCallback((mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>) => {
    const newMutation: PendingMutation = {
      ...mutation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    }

    setQueue((prev) => [...prev, newMutation])
    console.log('Added to offline queue:', newMutation)

    return newMutation.id
  }, [])

  /**
   * Remove a mutation from the queue
   */
  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((m) => m.id !== id))
  }, [])

  /**
   * Process the offline queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessing || !isOnline) return

    setIsProcessing(true)

    const currentQueue = [...queue]

    for (const mutation of currentQueue) {
      try {
        await processMutation(mutation)
        removeFromQueue(mutation.id)
        console.log('Successfully processed:', mutation)
      } catch (error) {
        console.error('Failed to process mutation:', error)

        // Retry logic
        if (mutation.retryCount < MAX_RETRIES) {
          setQueue((prev) =>
            prev.map((m) =>
              m.id === mutation.id
                ? { ...m, retryCount: m.retryCount + 1 }
                : m
            )
          )
        } else {
          // Max retries reached, remove from queue
          console.error('Max retries reached for mutation:', mutation)
          removeFromQueue(mutation.id)
        }
      }
    }

    // Invalidate queries after processing
    if (currentQueue.length > 0) {
      queryClient.invalidateQueries()
    }

    setIsProcessing(false)
  }, [queue, isOnline, isProcessing, queryClient, removeFromQueue])

  /**
   * Process a single mutation
   */
  const processMutation = async (mutation: PendingMutation) => {
    const { entity, type, data } = mutation

    const endpoint = `/api/${entity}s`
    let method = 'POST'
    let url = endpoint

    if (type === 'update') {
      method = 'PUT'
      url = `${endpoint}/${data.id}`
    } else if (type === 'delete') {
      method = 'DELETE'
      url = `${endpoint}/${data.id}`
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: type !== 'delete' ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    return response.json()
  }

  /**
   * Clear the entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([])
    localStorage.removeItem(QUEUE_KEY)
  }, [])

  /**
   * Retry processing the queue manually
   */
  const retryQueue = useCallback(() => {
    if (isOnline) {
      processQueue()
    }
  }, [isOnline, processQueue])

  return {
    queue,
    isOnline,
    isProcessing,
    queueLength: queue.length,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryQueue,
  }
}
