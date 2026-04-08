'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import type { CardioPlan } from '@/lib/types/cardio'

interface CardioPlanHeroProps {
  plan: CardioPlan | null
  onStartSession: () => void
  onGeneratePlan: () => void
}

function ProgressRing({ progress }: { progress: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width="44" height="44" className="transform -rotate-90">
      <circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="currentColor"
        className="text-muted" strokeWidth="3"
      />
      <motion.circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="currentColor"
        className="text-primary" strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={springs.ios}
      />
    </svg>
  )
}

export function CardioPlanHero({ plan, onStartSession, onGeneratePlan }: CardioPlanHeroProps) {
  if (!plan) {
    return (
      <motion.div
        {...variants.slideUp}
        transition={springs.ios}
        className="ios-card p-4"
      >
        <h3 className="font-semibold text-foreground">Start a Cardio Plan</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a personalized treadmill training program
        </p>
        <Button className="w-full mt-3" onClick={onGeneratePlan}>
          Generate a Plan
        </Button>
      </motion.div>
    )
  }

  const totalSessions = plan.total_weeks * plan.sessions_per_week
  const completedSessions = ((plan.current_week - 1) * plan.sessions_per_week) + (plan.current_session - 1)
  const progress = Math.round((completedSessions / totalSessions) * 100)

  const isCompleted = plan.status === 'completed'

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{plan.name}</h3>
          <p className="text-sm text-primary mt-0.5">
            {isCompleted
              ? 'Plan completed!'
              : `Week ${plan.current_week} of ${plan.total_weeks} — Session ${plan.current_session} of ${plan.sessions_per_week}`
            }
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <ProgressRing progress={isCompleted ? 100 : progress} />
          <span className="absolute text-[11px] font-bold text-primary">
            {isCompleted ? '100' : progress}%
          </span>
        </div>
      </div>
      <Button
        className="w-full mt-3"
        onClick={isCompleted ? onGeneratePlan : onStartSession}
      >
        {isCompleted ? 'Generate New Plan' : "Start Today's Run"}
      </Button>
    </motion.div>
  )
}
