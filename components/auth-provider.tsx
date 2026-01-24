'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Helper to clear service worker caches
  const clearServiceWorkerCaches = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[Auth] Requesting service worker to clear auth caches')
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_AUTH_CACHES'
      })

      // Wait for cache clear confirmation (with timeout)
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[Auth] Cache clear timeout, proceeding anyway')
          resolve()
        }, 1000)

        const handler = (event: MessageEvent) => {
          if (event.data?.type === 'CACHE_CLEARED') {
            clearTimeout(timeout)
            navigator.serviceWorker.removeEventListener('message', handler)
            console.log('[Auth] Service worker caches cleared')
            resolve()
          }
        }

        navigator.serviceWorker.addEventListener('message', handler)
      })
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // Handle invalid refresh token or other auth errors
      if (error) {
        console.error('Session error:', error.message)
        // Clear invalid session state
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.error('Token refresh failed')
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setLoading(false)
        router.push('/login')
        return
      }

      // Handle sign out or session expiry
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setLoading(false)

        // Clear service worker caches to prevent serving stale auth state
        clearServiceWorkerCaches().then(() => {
          console.log('[Auth] Caches cleared after sign out')
        }).catch(err => {
          console.error('[Auth] Failed to clear caches:', err)
        })

        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Only refresh on token refresh events to update server components
      // Don't refresh on SIGNED_IN to avoid redirect loops in Safari PWA
      if (event === 'TOKEN_REFRESHED' && session) {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const signInWithGoogle = async () => {
    // Check if we're already on the open_in_browser flow to avoid redirect loop
    const params = new URLSearchParams(window.location.search)
    const openInBrowser = params.get('open_in_browser') === '1'

    // Detect iOS PWA - OAuth won't work properly, open in Safari instead
    const isIOSPWA =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    // Only redirect if we're in iOS PWA AND not already in the open_in_browser flow
    if (isIOSPWA && !openInBrowser) {
      // Open login page in Safari - user logs in there, then returns to PWA
      window.location.href = `${window.location.origin}/login?open_in_browser=1`
      return
    }

    // Proceed with OAuth (either non-iOS PWA or already in open_in_browser flow)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
