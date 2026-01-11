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

    // Fallback: Show motivational message when no workout scheduled
    return {
      icon: <Zap className="h-5 w-5 text-primary" />,
      badge: 'Ready to Train',
      title: hasTemplates ? 'Time to Get Strong 💪' : 'Start Your Journey',
      description: hasTemplates
        ? 'Choose a workout template below to get started'
        : 'Create your first workout template to begin training',
      showButton: false
    }
  }

  const content = getHeroContent()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
    >
      <div className="relative z-10">
        <motion.div
          className="flex items-center gap-2 mb-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: todayCompleted ? [0, 5, -5, 0] : 0
            }}
            transition={{
              duration: 0.5,
              repeat: todayCompleted ? Infinity : 0,
              repeatDelay: 2
            }}
          >
            {content.icon}
          </motion.div>
          <span className="ios-subheadline text-primary">{content.badge}</span>
        </motion.div>

        <motion.h2
          className="ios-title1 mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
        >
          {content.title}
        </motion.h2>

        <motion.p
          className="ios-body text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {content.description}
        </motion.p>

        {content.showButton && onQuickStart && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
          >
            <Button
              size="lg"
              className="w-full touch-xl gap-2 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={onQuickStart}
            >
              {content.buttonIcon}
              {content.buttonText}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Animated decorative circles */}
      <motion.div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.7, 0.5]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/10 blur-xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.8, 0.6]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      />
    </motion.div>
  )
}
