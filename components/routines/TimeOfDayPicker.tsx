'use client'

import { cn } from '@/lib/utils'
import type { TimeOfDay } from '@/lib/types/routines'
import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'

interface TimeOfDayPickerProps {
  value?: TimeOfDay | null
  onChange: (value: TimeOfDay) => void
  className?: string
}

const TIME_OPTIONS: Array<{ value: TimeOfDay; label: string; icon: typeof Sun; color: string }> = [
  { value: 'morning', label: 'Morning', icon: Sunrise, color: 'text-amber-500' },
  { value: 'afternoon', label: 'Afternoon', icon: Sun, color: 'text-yellow-500' },
  { value: 'evening', label: 'Evening', icon: Sunset, color: 'text-orange-500' },
  { value: 'night', label: 'Night', icon: Moon, color: 'text-indigo-500' },
]

export function TimeOfDayPicker({ value, onChange, className }: TimeOfDayPickerProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {TIME_OPTIONS.map((option) => {
        const Icon = option.icon
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-xl p-3 transition-all',
              isSelected
                ? 'bg-teal-500 text-white shadow-md'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <Icon className={cn('h-5 w-5', isSelected ? 'text-white' : option.color)} />
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
