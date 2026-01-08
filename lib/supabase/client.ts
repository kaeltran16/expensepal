import { createBrowserClient } from '@supabase/ssr'

// Detect if running as a PWA (standalone mode) on any platform
function isPWA(): boolean {
  if (typeof window === 'undefined') return false

  // iOS standalone mode
  const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true

  // Android/Desktop PWA via display-mode media query
  const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches

  // Fullscreen PWA mode
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches

  // Minimal UI mode (some Android browsers)
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches

  return isIOSStandalone || isStandaloneDisplay || isFullscreen || isMinimalUI
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

  // Use localStorage for PWA to persist auth across app restarts
  // PWAs in standalone mode have unreliable cookie persistence across
  // different browser contexts (especially iOS Safari and Android WebView)
  if (isPWA()) {
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
