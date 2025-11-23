'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { hapticFeedback } from '@/lib/utils'

interface InlineAddExpenseProps {
  onAddExpense: () => void
}

export function InlineAddExpense({ onAddExpense }: InlineAddExpenseProps) {
  const handleClick = () => {
    hapticFeedback('medium')
    onAddExpense()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        className="
          w-full ios-card p-4 mb-4
          flex items-center gap-3
          border-2 border-dashed border-border/50
          hover:border-primary/50
          transition-colors duration-200
          group
          min-h-touch
        "
      >
        {/* Icon Container */}
        <div className="
          w-11 h-11 rounded-full
          bg-primary/10 dark:bg-primary/20
          flex items-center justify-center
          transition-transform duration-200
          group-hover:scale-110
        ">
          <Plus className="h-5 w-5 text-primary" strokeWidth={2.5} />
        </div>

        {/* Text */}
        <div className="flex-1 text-left">
          <p className="ios-headline text-foreground/90">Add Expense</p>
          <p className="ios-caption text-muted-foreground">
            Tap to record a new transaction
          </p>
        </div>

        {/* Subtle Arrow Indicator */}
        <div className="
          w-6 h-6 rounded-full
          bg-muted/50
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        ">
          <svg
            className="w-3 h-3 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </motion.button>
    </motion.div>
  )
}
