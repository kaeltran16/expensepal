'use client'

import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface ProgressIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  progress?: number
  detail?: string
}

export function ProgressIndicator({ status, message, progress, detail }: ProgressIndicatorProps) {
  if (status === 'idle') return null

  const statusConfig = {
    loading: {
      icon: Loader2,
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-500/20',
      iconClass: 'animate-spin',
      accentColor: 'bg-blue-500',
    },
    success: {
      icon: CheckCircle2,
      bg: 'bg-green-500/10 dark:bg-green-500/20',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-500/20',
      iconClass: '',
      accentColor: 'bg-green-500',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-500/20',
      iconClass: '',
      accentColor: 'bg-red-500',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="ios-card overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3.5">
          {/* Icon container with iOS-style background */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 400,
              delay: 0.1
            }}
            className={`
              flex-shrink-0 w-10 h-10 rounded-full
              ${config.iconBg}
              flex items-center justify-center
              backdrop-blur-xl
            `}
          >
            <Icon className={`h-5 w-5 ${config.iconColor} ${config.iconClass}`} strokeWidth={2.5} />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={`text-sm font-semibold ${config.text} leading-snug`}
            >
              {message}
            </motion.p>

            {detail && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-xs mt-1.5 ${config.text} opacity-70 leading-relaxed`}
              >
                {detail}
              </motion.p>
            )}

            {typeof progress === 'number' && status === 'loading' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`${config.text} opacity-70 font-medium`}>
                    Syncing...
                  </span>
                  <span className={`${config.text} font-semibold`}>
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
