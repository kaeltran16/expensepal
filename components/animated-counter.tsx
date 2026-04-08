'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  locale?: string
  pulse?: boolean
}

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  locale = 'vi-VN',
  pulse = false,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const prevValueRef = useRef<number | null>(null)
  const hasAnimatedRef = useRef(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.1 })

  useEffect(() => {
    if (!inView) return

    const from = hasAnimatedRef.current && prevValueRef.current !== null
      ? prevValueRef.current
      : 0
    const to = value

    if (hasAnimatedRef.current && from === to) return

    prevValueRef.current = value
    hasAnimatedRef.current = true

    if (pulse && from !== 0) {
      setIsPulsing(true)
      pulseTimeoutRef.current = setTimeout(() => setIsPulsing(false), 300)
    }

    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      setCount(from + (to - from) * easeProgress)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(to)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [value, duration, inView, pulse])

  const pulseStyle: React.CSSProperties = isPulsing
    ? { transform: 'scale(1.04)', transition: 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)' }
    : { transform: 'scale(1)', transition: 'transform 0.15s cubic-bezier(0.22, 1, 0.36, 1)' }

  return (
    <span ref={ref} className={className} style={pulse ? pulseStyle : undefined}>
      {prefix}
      {count.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}
