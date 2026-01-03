'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type PendingMutation = {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'expense' | 'budget' | 'goal' | 'meal' | 'workout'
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

const QUEUE_KEY = 'offline_mutation_queue'
const MAX_RETRIES = 3
const DB_NAME = 'expensepal-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-requests'

/**
 * Enhanced hook for managing offline mutation queue
 * Uses Service Worker + IndexedDB for robust offline support
 * Automatically retries failed mutations when back online
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<PendingMutation[]>([])
  const [queueCount, setQueueCount] = useState(0)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const queryClient = useQueryClient()

  // Load queue from both localStorage (legacy) and IndexedDB on mount
  useEffect(() => {
    // Load from localStorage for backward compatibility
    const stored = localStorage.getItem(QUEUE_KEY)
    if (stored) {
      try {
        setQueue(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load offline queue:', error)
      }
    }

    // Update count from IndexedDB (service worker queue)
    updateQueueCount()
  }, [])

  // Listen for service worker messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        const { syncedCount, totalCount } = event.data
        setIsProcessing(false)

        if (syncedCount > 0) {
          toast.success(`Synced ${syncedCount} offline ${syncedCount === 1 ? 'item' : 'items'}`)
          updateQueueCount()
          queryClient.invalidateQueries()
        } else if (totalCount > 0) {
          toast.error('Failed to sync some items')
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [queryClient])

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

  /**
   * Update queue count from IndexedDB (service worker queue)
   */
  const updateQueueCount = async () => {
    try {
      const count = await getIndexedDBQueueCount()
      setQueueCount(count)

      // Update app badge
      if ('setAppBadge' in navigator && count > 0) {
        await (navigator as Navigator & { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count)
      } else if ('clearAppBadge' in navigator && count === 0) {
        await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge()
      }
    } catch (error) {
      console.error('Error getting queue count:', error)
    }
  }

  /**
   * Trigger service worker background sync manually
   */
  const triggerBackgroundSync = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('Background sync not supported')
      return
    }

    try {
      setIsProcessing(true)
      const registration = await navigator.serviceWorker.ready

      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-expenses')
        toast.info('Sync started...')
      } else {
        // Fallback to manual processing
        await processQueue()
      }
    } catch (error) {
      console.error('Error triggering sync:', error)
      toast.error('Failed to start sync')
      setIsProcessing(false)
    }
  }

  /**
   * Register periodic background sync for email import
   */
  const registerPeriodicSync = async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.ready

      if ('periodicSync' in registration) {
        const status = await (navigator as Navigator & {
          permissions: {
            query: (descriptor: { name: string }) => Promise<{ state: string }>
          }
        }).permissions.query({
          name: 'periodic-background-sync',
        })

        if (status.state === 'granted') {
          await (registration as ServiceWorkerRegistration & {
            periodicSync: {
              register: (tag: string, options: { minInterval: number }) => Promise<void>
            }
          }).periodicSync.register('sync-emails', {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
          })
          console.log('Periodic sync registered for email import')
        }
      }
    } catch (error) {
      console.error('Error registering periodic sync:', error)
    }
  }

  // Auto-trigger sync when back online
  useEffect(() => {
    if (isOnline && (queue.length > 0 || queueCount > 0) && !isProcessing) {
      triggerBackgroundSync()
    }
  }, [isOnline])

  return {
    queue,
    isOnline,
    isProcessing,
    queueLength: queue.length + queueCount,
    queueCount, // Service worker queue
    localQueueLength: queue.length, // Local storage queue
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryQueue,
    triggerBackgroundSync,
    registerPeriodicSync,
    updateQueueCount,
  }
}

// Helper: Get IndexedDB queue count
async function getIndexedDBQueueCount(): Promise<number> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })
  } catch {
    return 0
  }
}

// Helper: Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}
