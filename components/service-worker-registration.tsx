'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // Check every hour

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is ready
                  toast.info('App update available!', {
                    action: {
                      label: 'Refresh',
                      onClick: () => window.location.reload(),
                    },
                    duration: 10000,
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          toast.success('Synced pending changes')
        }
      })
    }
  }, [])

  return null
}
