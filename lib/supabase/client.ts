import { createBrowserClient } from '@supabase/ssr'

// Detect if running as iOS PWA (standalone mode)
function isIOSPWA(): boolean {
  if (typeof window === 'undefined') return false
  const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  return isIOS && isStandalone
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  // Use localStorage for iOS PWA to persist auth across app restarts
  // iOS Safari in standalone mode has unreliable cookie persistence
  if (isIOSPWA()) {
    return createBrowserClient(url, key, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase-auth',
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  }

  return createBrowserClient(url, key)
}
