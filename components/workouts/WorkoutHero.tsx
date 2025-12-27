'use client'

import { motion } from 'framer-motion'
import { Dumbbell, PlayCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ScheduledWorkout } from '@/lib/hooks/use-workout-schedule'

interface WorkoutHeroProps {
  todayWorkout?: ScheduledWorkout
  todayCompleted: boolean
  completedCount: number
  onQuickStart?: () => void
}

export function WorkoutHero({
  todayWorkout,
  todayCompleted,
  completedCount,
  onQuickStart
}: WorkoutHeroProps) {
  // Determine hero content based on state
  const getHeroContent = () => {
    if (todayCompleted) {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
        badge: 'Completed',
        title: 'Workout Complete! ✅',
        description: `You've completed ${completedCount} workout${completedCount > 1 ? 's' : ''} today. Great job!`,
        showButton: false
      }
    }

    if (todayWorkout) {
      const template = todayWorkout.template
      const exerciseCount = Array.isArray(template?.exercises) ? template.exercises.length : 0

      return {
        icon: <Dumbbell className="h-5 w-5 text-primary" />,
        badge: 'Today\'s Workout',
        title: template?.name || 'Scheduled Workout',
        description: `${template?.difficulty || 'Custom'} • ${template?.duration_minutes || 30} min • ${exerciseCount} exercises`,
        showButton: true,
        buttonText: 'Start Workout',
        buttonIcon: <PlayCircle className="h-5 w-5" />
      }
    }

    // Return null to hide the hero when there's no workout scheduled and none completed
    return null
  }

  const content = getHeroContent()

  // Don't render anything if there's no scheduled workout and nothing completed
  if (!content) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          {content.icon}
          <span className="ios-subheadline text-primary">{content.badge}</span>
        </div>

        <h2 className="ios-title1 mb-2">
          {content.title}
        </h2>

        <p className="ios-body text-muted-foreground mb-4">
          {content.description}
        </p>

        {content.showButton && onQuickStart && (
          <Button
            size="lg"
            className="w-full touch-xl gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20"
            onClick={onQuickStart}
          >
            {content.buttonIcon}
            {content.buttonText}
          </Button>
        )}
      </div>

      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/10 blur-xl" />
    </motion.div>
  )
}
