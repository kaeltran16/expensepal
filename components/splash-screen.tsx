'use client'

import { useEffect, useRef, useState } from 'react'

export function SplashScreen({ ready, onFinished }: { ready: boolean; onFinished: () => void }) {
  const [exiting, setExiting] = useState(false)
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished

  useEffect(() => {
    if (!ready) return
    setExiting(true)
  }, [ready])

  useEffect(() => {
    if (!exiting) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => onFinishedRef.current(), prefersReducedMotion ? 0 : 500)
    return () => clearTimeout(timer)
  }, [exiting])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#0a0a12' }}
    >
      {/* subtle purple haze */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '40%',
          background: 'linear-gradient(180deg, rgba(124,92,191,0.04) 0%, transparent 100%)',
        }}
      />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* app icon */}
        <div
          className="animate-[splash-scale-in_0.6s_ease-out_both] w-20 h-20 rounded-[20px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #7c5cbf 0%, #6b4fad 100%)',
            boxShadow: '0 0 50px rgba(124,92,191,0.3), 0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* wallet icon */}
          <div className="relative w-10 h-8">
            {/* money bills */}
            <div
              className="absolute top-[-4px] left-1 w-8 rounded-[3px]"
              style={{ height: '22px', background: '#5ab87a', transform: 'rotate(-5deg)' }}
            />
            <div
              className="absolute top-[-2px] left-2 w-7 rounded-[3px]"
              style={{ height: '20px', background: '#7ecf96', transform: 'rotate(-2deg)' }}
            />
            {/* wallet body */}
            <div className="absolute bottom-0 w-10 rounded-[4px]" style={{ height: '26px', background: '#f0a030' }}>
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-[3px]"
                style={{ width: '12px', height: '10px', background: '#e08820' }}
              />
              <div
                className="absolute right-[3px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full"
                style={{ background: '#c07018' }}
              />
            </div>
          </div>
        </div>

        {/* title */}
        <span
          className="animate-[splash-fade-up_0.5s_ease-out_0.25s_both] text-[26px] font-bold"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f0ecf5' }}
        >
          ExpensePal
        </span>

        {/* subtitle */}
        <span
          className="animate-[splash-fade-up_0.5s_ease-out_0.4s_both] text-xs"
          style={{ color: '#8878a8' }}
        >
          Track smarter, spend better
        </span>

        {/* loading bars */}
        <div className="flex gap-1 mt-7 items-end animate-[splash-fade-in_0.4s_ease-out_0.6s_both]">
          <div
            className="w-[3px] rounded-[2px]"
            style={{
              height: '12px',
              background: 'rgba(124,92,191,0.5)',
              animation: 'splash-bar-bounce 1.2s ease-in-out 0s infinite',
            }}
          />
          <div
            className="w-[3px] rounded-[2px]"
            style={{
              height: '18px',
              background: 'rgba(240,160,48,0.6)',
              animation: 'splash-bar-bounce 1.2s ease-in-out 0.2s infinite',
            }}
          />
          <div
            className="w-[3px] rounded-[2px]"
            style={{
              height: '8px',
              background: 'rgba(124,92,191,0.3)',
              animation: 'splash-bar-bounce 1.2s ease-in-out 0.4s infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
