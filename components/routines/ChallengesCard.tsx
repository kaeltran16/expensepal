'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Award, ChevronRight, Gift, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { RoutineChallenge, UserChallengeProgress } from '@/lib/types/routines'

interface ChallengesCardProps {
  challenges: Array<RoutineChallenge & { progress: UserChallengeProgress }>
  onClaimReward: (challengeId: string) => void
  className?: string
  loading?: boolean
}

export function ChallengesCard({
  challenges,
  onClaimReward,
  className,
  loading,
}: ChallengesCardProps) {
  if (loading) {
    return (
      <div className={cn('ios-card animate-pulse p-4', className)}>
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!challenges || challenges.length === 0) {
    return (
      <div className={cn('ios-card p-4 text-center', className)}>
        <Award className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No active challenges</p>
      </div>
    )
  }

  return (
    <div className={cn('ios-card p-4', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Challenges</h3>
        <button className="flex items-center text-sm text-primary">
          View all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {challenges.slice(0, 3).map((challenge) => {
          const progress = challenge.progress
          const progressPercent = Math.min(
            100,
            (progress.current_progress / challenge.requirement_value) * 100
          )
          const isCompleted = progress.is_completed
          const canClaim = isCompleted && !progress.xp_claimed

          return (
            <div
              key={challenge.id}
              className={cn(
                'rounded-lg border-l-4 bg-muted/50 p-3',
                isCompleted ? 'border-l-ios-success' : 'border-l-primary'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{challenge.icon}</span>
                  <div>
                    <h4 className="font-medium">{challenge.name}</h4>
                    <p className="text-xs text-muted-foreground">{challenge.description}</p>
                  </div>
                </div>

                {canClaim ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Button
                      size="sm"
                      onClick={() => onClaimReward(challenge.id)}
                      className="bg-ios-success hover:bg-ios-success/90"
                    >
                      <Gift className="mr-1 h-3 w-3" />
                      Claim
                    </Button>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-1 text-xs">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      +{challenge.xp_reward} XP
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {progress.current_progress} / {challenge.requirement_value}
                  </span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress
                  value={progressPercent}
                  className="h-1.5"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
