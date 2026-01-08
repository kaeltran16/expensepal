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

    // Apply waiting service worker update
    const applyUpdate = () => {
      const waiting = registrationRef.current?.waiting
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
        registrationRef.current = registration

        // Check for updates immediately on load
        registration.update()

        // Check for updates periodically (every 30 minutes)
        const updateInterval = setInterval(() => {
          registration.update()
        }, 30 * 60 * 1000)

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
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    // Check for updates when app becomes visible (user switches back to PWA)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registrationRef.current?.update()

        // Auto-apply update if one is pending and user just came back
        if (updatePendingRef.current) {
          // Small delay to let the app settle
          setTimeout(() => {
            const waiting = registrationRef.current?.waiting
            if (waiting) {
              toast.info('Updating app...', { duration: 2000 })
              waiting.postMessage({ type: 'SKIP_WAITING' })
            }
          }, 1000)
        }
      }
    }

    // Check for updates on focus (for desktop browsers)
    const handleFocus = () => {
      registrationRef.current?.update()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Handle service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        toast.success('Synced pending changes')
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
