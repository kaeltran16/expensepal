'use client'

import { motion } from 'framer-motion'
import { Dumbbell, PlayCircle, CheckCircle2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ScheduledWorkout } from '@/lib/hooks/use-workout-schedule'

interface WorkoutHeroProps {
  todayWorkout?: ScheduledWorkout | null
  todayCompleted: boolean
  completedCount: number
  onQuickStart?: () => void
  hasTemplates?: boolean
}

export function WorkoutHero({
  todayWorkout,
  todayCompleted,
  completedCount,
  onQuickStart,
  hasTemplates = false
}: WorkoutHeroProps) {
  const getHeroContent = () => {
    if (todayCompleted) {
      return {
        icon: <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />,
        iconBg: 'bg-green-500/10',
        badge: 'Completed',
        badgeColor: 'bg-green-500 text-white',
        title: 'Workout Complete!',
        description: `You've completed ${completedCount} workout${completedCount > 1 ? 's' : ''} today. Great job!`,
        showButton: false
      }
    }

    if (todayWorkout) {
      const template = todayWorkout.template
      const exerciseCount = Array.isArray(template?.exercises) ? template.exercises.length : 0

      return {
        icon: <Dumbbell className="h-7 w-7 text-primary" />,
        iconBg: 'bg-primary/10',
        badge: "Today's Workout",
        badgeColor: 'bg-primary text-white',
        title: template?.name || 'Scheduled Workout',
        description: `${template?.difficulty || 'Custom'} \u2022 ${template?.duration_minutes || 30} min \u2022 ${exerciseCount} exercises`,
        showButton: true,
        buttonText: 'Start Workout',
        buttonIcon: <PlayCircle className="h-5 w-5" />
      }
    }

    return {
      icon: <Zap className="h-7 w-7 text-primary" />,
      iconBg: 'bg-primary/10',
      badge: 'Ready to Train',
      badgeColor: 'bg-primary/80 text-white',
      title: hasTemplates ? 'Time to Get Strong' : 'Start Your Journey',
      description: hasTemplates
        ? 'Choose a workout template below to get started'
        : 'Create your first workout template to begin training',
      showButton: false
    }
  }

  const content = getHeroContent()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="ios-card overflow-hidden"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Workout
              </p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${content.badgeColor}`}>
                {content.badge}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{content.description}</p>
          </div>

          <div className={`w-14 h-14 rounded-2xl ${content.iconBg} flex items-center justify-center border border-border/50 shadow-sm`}>
            {content.icon}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold tracking-tight mb-4">{content.title}</h2>

        {/* CTA Button */}
        {content.showButton && onQuickStart && (
          <Button
            size="lg"
            className="w-full min-h-touch gap-2 bg-primary shadow-sm"
            onClick={onQuickStart}
          >
            {content.buttonIcon}
            {content.buttonText}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
