'use client'

import { useAuth } from '@/components/auth-provider'
import { SplashScreen } from '@/components/splash-screen'
import { ReactNode, useCallback, useEffect, useState } from 'react'

const SPLASH_SHOWN_KEY = 'splash_shown'

export function SplashGate({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_SHOWN_KEY)) return
    setShowSplash(true)
    const timer = setTimeout(() => setMinTimeElapsed(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleSplashFinished = useCallback(() => {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, '1')
    setShowSplash(false)
  }, [])
  const ready = minTimeElapsed && !authLoading

  return (
    <>
      {children}
      {showSplash && <SplashScreen ready={ready} onFinished={handleSplashFinished} />}
    </>
  )
}
