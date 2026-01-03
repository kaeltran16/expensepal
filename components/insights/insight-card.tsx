'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { IconType } from '@/lib/types'

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Bills: '💡',
  Health: '🏥',
  Other: '📦',
}

interface InsightCardProps {
  type: 'trend' | 'pattern' | 'alert' | 'tip'
  category?: string
  title: string
  description: string
  value?: string
  change?: number
  icon: IconType
  index: number
}

/**
 * Reusable insight card component for displaying spending insights
 * Handles all insight types (trend, pattern, alert, tip) with appropriate styling
 */
export function InsightCard({
  type,
  category,
  title,
  description,
  value,
  change,
  icon: Icon,
  index,
}: InsightCardProps) {
  const getInsightColor = () => {
    if (type === 'alert') return 'border-l-destructive bg-destructive/5'
    if (type === 'tip') return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
    if (type === 'pattern') return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20'
    if (change !== undefined) {
      return change > 0
        ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
        : 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
    }
    return 'border-l-primary bg-primary/5'
  }

  const getIconColor = () => {
    if (type === 'alert') return 'text-destructive'
    if (type === 'tip') return 'text-blue-500'
    if (type === 'pattern') return 'text-purple-500'
    if (change !== undefined) {
      return change > 0 ? 'text-orange-500' : 'text-green-500'
    }
    return 'text-primary'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`p-4 border-l-4 ${getInsightColor()}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background/50 ${getIconColor()}`}>
            {category && (
              <span className="text-xl mr-1">
                {CATEGORY_EMOJI[category] || '📦'}
              </span>
            )}
            <Icon className="h-5 w-5 inline" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>

            {value && (
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{value}</p>
                {change !== undefined && (
                  <div className="flex items-center gap-1">
                    {change > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-orange-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-green-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        change > 0 ? 'text-orange-500' : 'text-green-500'
                      }`}
                    >
                      {Math.abs(change).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
