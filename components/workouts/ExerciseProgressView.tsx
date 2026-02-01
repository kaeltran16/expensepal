'use client'

import { Button } from '@/components/ui/button'
import { useExerciseHistory, usePersonalRecords } from '@/lib/hooks/use-workouts'
import { getProgressiveOverloadSuggestion } from '@/lib/workout-helpers'
import { format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { ArrowUp, Calendar, Dumbbell, Flame, Target, TrendingUp, Trophy, Zap } from 'lucide-react'
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface ExerciseProgressViewProps {
  exerciseId: string
  exerciseName: string
  targetRepsMin?: number
  targetRepsMax?: number
}

export function ExerciseProgressView({
  exerciseId,
  exerciseName,
  targetRepsMin = 8,
  targetRepsMax = 12
}: ExerciseProgressViewProps) {
  const { data: history = [], isLoading: historyLoading } = useExerciseHistory(exerciseId, 20)
  const { data: personalRecords = [], isLoading: prsLoading } = usePersonalRecords(exerciseId)

  // Get progressive overload suggestion
  const suggestion = useMemo(() => {
    return getProgressiveOverloadSuggestion(history, targetRepsMin, targetRepsMax)
  }, [history, targetRepsMin, targetRepsMax])

  // Prepare chart data (reverse for chronological order)
  const chartData = useMemo(() => {
    return [...history].reverse().map((entry) => ({
      date: format(parseISO(entry.workouts.workout_date), 'MMM d'),
      weight: entry.maxWeight,
      volume: Math.round(entry.totalVolume),
      estimated1RM: Math.round(entry.estimated1RM),
      reps: Math.round(entry.totalReps / (entry.totalSets || 1))
    }))
  }, [history])

  // Calculate 1RM progression
  const oneRMProgression = useMemo(() => {
    if (chartData.length < 2) return null
    const first = chartData[0]?.estimated1RM || 0
    const last = chartData[chartData.length - 1]?.estimated1RM || 0
    const change = last - first
    const percentChange = first > 0 ? ((change / first) * 100).toFixed(1) : 0
    return { change, percentChange, isPositive: change > 0 }
  }, [chartData])

  // Get relevant PR for this exercise
  const exercisePR = useMemo(() => {
    const maxWeightPR = personalRecords.find(pr => pr.record_type === 'max_weight')
    const oneRMPR = personalRecords.find(pr => pr.record_type === '1rm')
    return oneRMPR || maxWeightPR
  }, [personalRecords])

  const isLoading = historyLoading || prsLoading

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-24 bg-muted rounded-2xl" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold mb-2">No history yet</h3>
        <p className="text-sm text-muted-foreground">
          Complete workouts with this exercise to track your progress
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1RM Progression Card */}
      {oneRMProgression && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-card p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Estimated 1RM</h3>
              <p className="text-xs text-muted-foreground">Based on recent performance</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-bold">
                {chartData[chartData.length - 1]?.estimated1RM || 0}
              </span>
              <span className="text-lg text-muted-foreground ml-1">kg</span>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              oneRMProgression.isPositive
                ? 'bg-green-500/10 text-green-600'
                : 'bg-red-500/10 text-red-600'
            }`}>
              <ArrowUp className={`h-4 w-4 ${!oneRMProgression.isPositive && 'rotate-180'}`} />
              {oneRMProgression.percentChange}%
            </div>
          </div>
        </motion.div>
      )}

      {/* Weight Progress Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="ios-card p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold">Weight Progression</h3>
            <p className="text-xs text-muted-foreground">Last {chartData.length} workouts</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value} kg`, 'Max Weight']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#weightGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* AI Coach Suggestion */}
      {suggestion.type !== 'maintain' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`ios-card p-5 border-l-4 ${
            suggestion.type === 'increase_weight' || suggestion.type === 'increase_reps'
              ? 'border-l-green-500'
              : suggestion.type === 'deload' || suggestion.type === 'decrease_weight'
              ? 'border-l-orange-500'
              : 'border-l-primary'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${
              suggestion.type === 'increase_weight' || suggestion.type === 'increase_reps'
                ? 'bg-green-500/10'
                : suggestion.type === 'deload' || suggestion.type === 'decrease_weight'
                ? 'bg-orange-500/10'
                : 'bg-primary/10'
            }`}>
              {suggestion.type === 'increase_weight' && <TrendingUp className="h-5 w-5 text-green-500" />}
              {suggestion.type === 'increase_reps' && <Zap className="h-5 w-5 text-green-500" />}
              {suggestion.type === 'decrease_weight' && <Target className="h-5 w-5 text-orange-500" />}
              {suggestion.type === 'deload' && <Flame className="h-5 w-5 text-orange-500" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">AI Coach</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                  {suggestion.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{suggestion.suggestion}</p>
              {suggestion.recommendedWeight && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Recommended:</span>
                  <span className="font-bold text-lg">{suggestion.recommendedWeight} kg</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Personal Record */}
      {exercisePR && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="ios-card p-5 bg-yellow-500/10 border-yellow-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/20">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Personal Record</h3>
              <p className="text-xs text-muted-foreground capitalize">
                {exercisePR.record_type.replace('_', ' ')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{exercisePR.value}</span>
              <span className="text-sm text-muted-foreground ml-1">
                {exercisePR.unit || 'kg'}
              </span>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(exercisePR.achieved_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Workout Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="font-semibold mb-3">Recent Workouts</h3>
        <div className="space-y-2">
          {history.slice(0, 5).map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="ios-card p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">
                  {format(parseISO(entry.workouts.workout_date), 'EEEE, MMM d')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.totalSets} sets • {Math.round(entry.totalVolume)} kg volume
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{entry.maxWeight} kg</p>
                <p className="text-xs text-muted-foreground">max weight</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
