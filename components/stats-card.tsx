'use client'

import { motion } from 'motion/react'
import { springs, getStaggerDelay } from '@/lib/motion-system'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  index?: number
}

export function StatsCard({ title, value, icon: Icon, description, index = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...springs.ios,
        delay: getStaggerDelay(index),
      }}
      whileTap={{ scale: 0.97 }}
      className="ios-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(var(--card-rgb), 1) 0%, rgba(var(--card-rgb), 0.95) 100%)',
      }}
    >
      <div className="p-5 relative">
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

        {/* Content */}
        <div className="relative">
          {/* Header with icon */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="ios-caption text-muted-foreground uppercase tracking-wider font-semibold">
              {title}
            </h3>
            <motion.div
              className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <Icon className="h-5 w-5 text-primary" />
            </motion.div>
          </div>

          {/* Value */}
          <div className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
            {value}
          </div>

          {/* Description */}
          {description && (
            <p className="ios-caption text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
