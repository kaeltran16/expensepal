'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import type { LucideIcon } from 'lucide-react'

interface CompactWidgetProps {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  label: string
  value: string
  subtitle?: string
  onTap: () => void
}

export function CompactWidget({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  subtitle,
  onTap,
}: CompactWidgetProps) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.97 }}
      transition={springs.touch}
      className="flex-1 ios-card p-3.5 text-left"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </motion.button>
  )
}
