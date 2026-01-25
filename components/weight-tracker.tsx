'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, TrendingDown, TrendingUp, Plus, X, Check, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWeightLogs, useLogWeight } from '@/lib/hooks'
import { hapticFeedback } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts'

export function WeightTracker() {
  const [showLogModal, setShowLogModal] = useState(false)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')

  const { data: weightLogs, isLoading } = useWeightLogs({ limit: 14 })
  const logWeight = useLogWeight()

  // Prepare chart data (reverse to show oldest first)
  const chartData = [...(weightLogs || [])]
    .reverse()
    .map((log) => ({
      date: new Date(log.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      weight: log.weight,
    }))

  // Calculate trend
  const latestWeight = weightLogs?.[0]?.weight
  const previousWeight = weightLogs?.[1]?.weight
  const trend = latestWeight && previousWeight ? latestWeight - previousWeight : 0

  // Calculate min/max for chart
  const weights = chartData.map(d => d.weight)
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0

  const handleLogWeight = () => {
    if (!weight || isNaN(parseFloat(weight))) return

    hapticFeedback('medium')
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    logWeight.mutate(
      {
        weight: parseFloat(weight),
        date: localDate,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setShowLogModal(false)
          setWeight('')
          setNotes('')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="ios-card p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-10 w-10 rounded-full bg-muted" />
        </div>
        <div className="h-20 rounded bg-muted mb-4" />
        <div className="h-32 rounded bg-muted" />
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Weight Tracker</h3>
              <p className="text-xs text-muted-foreground">
                {weightLogs?.length || 0} entries logged
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setShowLogModal(true)
              hapticFeedback('light')
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-5 w-5 text-white" />
          </motion.button>
        </div>

        {/* Current weight display */}
        {latestWeight ? (
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{latestWeight}</span>
              <span className="text-lg text-muted-foreground">kg</span>
            </div>

            {trend !== 0 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                  trend < 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}
              >
                {trend < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">{Math.abs(trend).toFixed(1)} kg</span>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Scale className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-muted-foreground mb-1">No weight data yet</p>
            <p className="text-xs text-muted-foreground">Tap + to log your first entry</p>
          </div>
        )}

        {/* Mini chart */}
        {chartData.length > 1 && (
          <div className="h-32 -mx-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(168, 85, 247)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="rgb(168, 85, 247)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[minWeight - 1, maxWeight + 1]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [`${value} kg`, 'Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="rgb(168, 85, 247)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(168, 85, 247)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: 'rgb(168, 85, 247)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length === 1 && (
          <p className="text-sm text-center text-muted-foreground mt-2">
            Log more weights to see your trend chart
          </p>
        )}
      </motion.div>

      {/* Log Weight Modal */}
      <AnimatePresence>
        {showLogModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setShowLogModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-card/95 backdrop-blur-xl rounded-t-[2rem] shadow-2xl border-t border-border/50"
              style={{ maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: '85vh' }}>
                {/* Handle bar */}
                <div className="flex justify-center pt-4 pb-3">
                  <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="relative px-6 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Scale className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Log Weight</h2>
                        <p className="text-sm text-muted-foreground">Track your progress</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLogModal(false)}
                      className="h-9 w-9"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-sm font-medium">
                      Weight (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="e.g., 70.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="h-14 text-2xl text-center font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Notes (optional)
                    </Label>
                    <Input
                      id="notes"
                      placeholder="e.g., After morning workout"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="border-t bg-background p-4 sm:p-6 flex-shrink-0">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLogModal(false)}
                      className="flex-1 h-12 sm:h-14 text-base font-medium"
                      disabled={logWeight.isPending}
                    >
                      Cancel
                    </Button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLogWeight}
                      disabled={!weight || logWeight.isPending}
                      className="flex-1 h-12 sm:h-14 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold text-base shadow-lg shadow-purple-500/25 disabled:opacity-50"
                    >
                      {logWeight.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Logging...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-5 w-5" />
                          <span>Log Weight</span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
