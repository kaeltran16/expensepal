'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getCategoryColor, hapticFeedback } from '@/lib/utils'
import { Trash2, Edit, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Expense } from '@/lib/supabase'

interface ExpenseCardProps {
  expense: Expense
  onDelete?: (id: string) => void
  onEdit?: (expense: Expense) => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Bills: '💡',
  Health: '🏥',
  Other: '📦',
}

export function ExpenseCard({ expense, onDelete, onEdit }: ExpenseCardProps) {
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null)
  const x = useMotionValue(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const backgroundColor = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(239, 68, 68, 0.1)', 'rgba(0, 0, 0, 0)', 'rgba(59, 130, 246, 0.1)']
  )

  const categoryColors = getCategoryColor(expense.category || 'Other')

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 80

    if (info.offset.x < -threshold && onDelete) {
      // Swipe left to delete
      setIsRevealed('left')
      x.set(-80)
      hapticFeedback('medium')
    } else if (info.offset.x > threshold && onEdit) {
      // Swipe right to edit
      setIsRevealed('right')
      x.set(80)
      hapticFeedback('medium')
    } else {
      // Reset
      setIsRevealed(null)
      x.set(0)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      hapticFeedback('heavy')
      onDelete(expense.id)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      hapticFeedback('light')
      onEdit(expense)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background action buttons */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {/* Right swipe - Edit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isRevealed === 'right' ? 1 : 0 }}
          className="flex items-center gap-2 text-blue-600"
        >
          <Edit className="h-5 w-5" />
          <ChevronRight className="h-4 w-4" />
        </motion.div>

        {/* Left swipe - Delete */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isRevealed === 'left' ? 1 : 0 }}
          className="flex items-center gap-2 text-destructive"
        >
          <ChevronLeft className="h-4 w-4" />
          <Trash2 className="h-5 w-5" />
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        ref={cardRef}
        layout
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, backgroundColor }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`bg-card rounded-2xl p-4 shadow-sm border-l-4 ${categoryColors.border} hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing`}
        onClick={() => {
          if (isRevealed === 'left') handleDelete()
          else if (isRevealed === 'right') handleEdit()
        }}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="text-2xl sm:text-3xl flex-shrink-0">
              {CATEGORY_EMOJI[expense.category || 'Other'] || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg truncate">{expense.merchant}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {formatDate(expense.transaction_date)}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base sm:text-xl font-bold text-destructive">
              {formatCurrency(expense.amount, expense.currency)}
            </p>
          </div>
        </div>

        {expense.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {expense.notes}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Badge variant={expense.source === 'email' ? 'default' : 'secondary'} className="text-xs">
              {expense.source === 'email' ? (
                <>
                  <Mail className="w-3 h-3 mr-1" />
                  Auto
                </>
              ) : (
                'Manual'
              )}
            </Badge>
            {expense.category && (
              <Badge
                variant="outline"
                className={`text-xs ${categoryColors.bg} ${categoryColors.text} border-transparent`}
              >
                {expense.category}
              </Badge>
            )}
          </div>

          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                className="h-8 w-8"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
