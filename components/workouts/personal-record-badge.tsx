'use client'

import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'

interface PersonalRecord {
  type: string
  value: number
  unit: string
}

interface PersonalRecordBadgeProps {
  personalRecords: PersonalRecord[]
  onDismiss: () => void
}

/**
 * PersonalRecordBadge component - celebrates when user achieves a new PR
 * Features:
 * - Full-screen celebration overlay
 * - Trophy animation with bounce effect
 * - Lists all PRs achieved in the set
 * - Dismissible by clicking anywhere or button
 */
export function PersonalRecordBadge({
  personalRecords,
  onDismiss
}: PersonalRecordBadgeProps) {
  return (
    <AnimatePresence>
      {personalRecords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center"
          onClick={onDismiss}
        >
          <div className="text-center px-4">
            {/* Trophy Icon with Bounce Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.6 }}
              className="text-8xl mb-4"
            >
              🏆
            </motion.div>

            {/* Celebration Title */}
            <h2 className="ios-title1 mb-2">new personal record!</h2>

            {/* List of PRs */}
            {personalRecords.map((pr, idx) => (
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="ios-body text-primary"
              >
                {pr.type}: {pr.value} {pr.unit}
              </motion.p>
            ))}

            {/* Dismiss Button */}
            <Button
              onClick={onDismiss}
              className="mt-6 min-h-touch"
            >
              awesome!
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
