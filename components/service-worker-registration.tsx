'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function ServiceWorkerRegistration() {
  const updatePendingRef = useRef(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadedThisSessionRef = useRef(false) // Prevent multiple reloads in same session

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
        console.log('[SW] Applying update manually')
        reloadedThisSessionRef.current = true // Mark that we're reloading

        const claimAndReload = () => {
          console.log('[SW] New worker activated, claiming clients')
          // Send CLAIM_CLIENTS to the newly activated SW
          // This triggers clients.claim() which fires controllerchange
          waiting.postMessage({ type: 'CLAIM_CLIENTS' })
        }

        // Check if already activated (edge case)
        if (waiting.state === 'activated') {
          claimAndReload()
          return
        }

        // Listen for the waiting worker to become active
        waiting.addEventListener('statechange', () => {
          if (waiting.state === 'activated') {
            claimAndReload()
          }
        })

        // Tell the waiting SW to skip waiting and become active
        waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }

    // Throttled update check
    const checkForUpdate = () => {
      // Don't check if we already reloaded this session
      if (reloadedThisSessionRef.current) {
        console.log('[SW] Skipping update check (already reloaded this session)')
        return
      }

      const now = Date.now()
      if (now - lastUpdateCheck < UPDATE_CHECK_COOLDOWN) {
        console.log('[SW] Skipping update check (cooldown active)')
        return
      }
      lastUpdateCheck = now
      console.log('[SW] Checking for updates')
      registrationRef.current?.update()
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
        registrationRef.current = registration

        // Check for updates on initial load (only once per session)
        if (!reloadedThisSessionRef.current) {
          console.log('[SW] Initial update check on app load')
          registration.update()
          lastUpdateCheck = Date.now() // Set cooldown
        }

        // Check for updates periodically (every 1 hour)
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

                console.log('[SW] Update available, showing notification')
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
    // ONLY if user manually triggered the update
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return

      // Only reload if user explicitly clicked "Update now"
      if (!reloadedThisSessionRef.current) {
        console.log('[SW] Controller changed but update not requested by user, skipping reload')
        return
      }

      refreshing = true
      console.log('[SW] Reloading after user-initiated update')

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

    // Debounced visibility change handler to prevent iOS flicker
    let visibilityTimeout: ReturnType<typeof setTimeout> | null = null
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any pending timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout)
        }

        // Only check for updates if user stays on the app for 5 seconds
        // This prevents checks during quick app switching on iOS
        visibilityTimeout = setTimeout(() => {
          checkForUpdate()
        }, 5000)
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
