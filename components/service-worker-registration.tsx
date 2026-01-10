'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function ServiceWorkerRegistration() {
  const updatePendingRef = useRef(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Disable service worker in development
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
          console.log('Service Worker unregistered in development mode')
        })
      })
      return
    }

    // Track last update check to prevent excessive checks
    let lastUpdateCheck = 0
    const UPDATE_CHECK_COOLDOWN = 5 * 60 * 1000 // 5 minutes cooldown between checks

    // Apply waiting service worker update
    const applyUpdate = () => {
      const waiting = registrationRef.current?.waiting
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }

    // Throttled update check
    const checkForUpdate = () => {
      const now = Date.now()
      if (now - lastUpdateCheck < UPDATE_CHECK_COOLDOWN) {
        console.log('[SW] Skipping update check (cooldown active)')
        return
      }
      lastUpdateCheck = now
      registrationRef.current?.update()
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
        registrationRef.current = registration

        // Check for updates periodically (every 1 hour instead of 30 min)
        const updateInterval = setInterval(() => {
          checkForUpdate()
        }, 60 * 60 * 1000)

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                updatePendingRef.current = true

                // Show toast with update option
                toast.info('New version available!', {
                  action: {
                    label: 'Update now',
                    onClick: () => {
                      applyUpdate()
                    },
                  },
                  duration: Infinity, // Keep visible until dismissed
                  id: 'sw-update', // Prevent duplicates
                })
              }
            })
          }
        })

        return () => clearInterval(updateInterval)
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })

    // When the new service worker takes over, reload the page
    // Add a small delay on iOS to prevent flickering
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true

      // Detect if running as iOS PWA
      const isIOSPWA = ('standalone' in navigator) && (navigator as any).standalone === true

      if (isIOSPWA) {
        // Add a slight delay for iOS to prevent flicker
        setTimeout(() => {
          window.location.reload()
        }, 300)
      } else {
        window.location.reload()
      }
    })

    // Debounced visibility change handler
    let visibilityTimeout: ReturnType<typeof setTimeout> | null = null
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any pending timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout)
        }

        // Debounce: only check for updates if user stays on the app for 3 seconds
        visibilityTimeout = setTimeout(() => {
          checkForUpdate()
        }, 3000)
      } else {
        // Clear timeout when app goes to background
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout)
          visibilityTimeout = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        toast.success('Synced pending changes')
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
