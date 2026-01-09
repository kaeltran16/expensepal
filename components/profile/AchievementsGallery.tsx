'use client'

import { Button } from '@/components/ui/button'
import { ACHIEVEMENTS, type Achievement } from '@/lib/achievements'
import { useAchievements } from '@/lib/hooks/use-achievements'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, ChevronRight, Lock, X } from 'lucide-react'
import { useState } from 'react'

export function AchievementsGallery() {
  const { data: userAchievements = [], isLoading } = useAchievements()
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  const unlockedIds = new Set(userAchievements.map(a => a.achievement_type))

  const categories = [
    { id: 'workout', name: 'Workouts', icon: '🏋️' },
    { id: 'streak', name: 'Streaks', icon: '🔥' },
    { id: 'strength', name: 'Strength', icon: '💪' },
    { id: 'milestone', name: 'Milestones', icon: '🏆' },
  ] as const

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const unlockedCount = userAchievements.length
  const totalCount = ACHIEVEMENTS.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Achievements
          </h3>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} of {totalCount} unlocked
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{Math.round((unlockedCount / totalCount) * 100)}%</div>
          <p className="text-xs text-muted-foreground">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-primary rounded-full"
        />
      </div>

      {/* Categories */}
      {categories.map(category => {
        const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category.id)
        const unlockedInCategory = categoryAchievements.filter(a => unlockedIds.has(a.id))

        return (
          <div key={category.id}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <span>{category.icon}</span>
                {category.name}
              </h4>
              <span className="text-xs text-muted-foreground">
                {unlockedInCategory.length}/{categoryAchievements.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {categoryAchievements.map(achievement => {
                const isUnlocked = unlockedIds.has(achievement.id)
                const userAchievement = userAchievements.find(a => a.achievement_type === achievement.id)

                return (
                  <motion.button
                    key={achievement.id}
                    onClick={() => {
                      setSelectedAchievement(achievement)
                      hapticFeedback('light')
                    }}
                    whileTap={{ scale: 0.95 }}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all ${
                      isUnlocked
                        ? 'bg-primary/10 border-2 border-primary/20'
                        : 'bg-muted/50 border-2 border-transparent opacity-50'
                    }`}
                  >
                    <span className="text-2xl mb-1">
                      {isUnlocked ? achievement.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                    </span>
                    <span className="text-[10px] text-center line-clamp-2 font-medium">
                      {isUnlocked ? achievement.name : '???'}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <AchievementDetailModal
            achievement={selectedAchievement}
            isUnlocked={unlockedIds.has(selectedAchievement.id)}
            achievedAt={userAchievements.find(a => a.achievement_type === selectedAchievement.id)?.achieved_at}
            onClose={() => setSelectedAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AchievementDetailModal({
  achievement,
  isUnlocked,
  achievedAt,
  onClose,
}: {
  achievement: Achievement
  isUnlocked: boolean
  achievedAt?: string
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
      >
        <div className="ios-card p-6 text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Icon */}
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isUnlocked ? 'bg-primary/10' : 'bg-muted'
          }`}>
            <span className="text-4xl">
              {isUnlocked ? achievement.icon : <Lock className="h-10 w-10 text-muted-foreground" />}
            </span>
          </div>

          {/* Name */}
          <h3 className="text-xl font-bold mb-2">{achievement.name}</h3>

          {/* Description */}
          <p className="text-muted-foreground mb-4">{achievement.description}</p>

          {/* Status */}
          {isUnlocked ? (
            <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-full inline-flex items-center gap-2">
              <span className="text-sm font-medium">Unlocked</span>
              {achievedAt && (
                <span className="text-xs opacity-75">
                  {new Date(achievedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : (
            <div className="bg-muted px-4 py-2 rounded-full inline-flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Locked</span>
            </div>
          )}

          {/* Requirement hint for locked achievements */}
          {!isUnlocked && (
            <p className="text-xs text-muted-foreground mt-4">
              {getRequirementHint(achievement)}
            </p>
          )}
        </div>
      </motion.div>
    </>
  )
}

function getRequirementHint(achievement: Achievement): string {
  const { type, value } = achievement.requirement

  switch (type) {
    case 'workout_count':
      return `Complete ${value} workouts to unlock`
    case 'streak_days':
      return `Maintain a ${value}-day streak to unlock`
    case 'pr_count':
      return `Set ${value} personal records to unlock`
    case 'total_volume':
      return `Lift ${value.toLocaleString()} kg total to unlock`
    case 'single_workout_volume':
      return `Lift ${value.toLocaleString()} kg in one workout to unlock`
    default:
      return 'Keep working out to unlock!'
  }
}
