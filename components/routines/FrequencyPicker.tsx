'use client'

import { cn } from '@/lib/utils'
import { Calendar, CalendarDays, Repeat } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { RoutineFrequency, DayOfWeek } from '@/lib/types/routines'

interface FrequencyPickerProps {
  value?: RoutineFrequency
  onChange: (frequency: RoutineFrequency) => void
  className?: string
}

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'M' },
  { key: 'tue', label: 'Tuesday', short: 'T' },
  { key: 'wed', label: 'Wednesday', short: 'W' },
  { key: 'thu', label: 'Thursday', short: 'T' },
  { key: 'fri', label: 'Friday', short: 'F' },
  { key: 'sat', label: 'Saturday', short: 'S' },
  { key: 'sun', label: 'Sunday', short: 'S' },
]

const FREQUENCY_OPTIONS = [
  { type: 'daily' as const, label: 'Daily', icon: CalendarDays },
  { type: 'specific_days' as const, label: 'Specific days', icon: Calendar },
  { type: 'interval' as const, label: 'Every X days', icon: Repeat },
]

export function FrequencyPicker({ value, onChange, className }: FrequencyPickerProps) {
  const currentType = value?.type || 'daily'

  const handleTypeChange = (type: RoutineFrequency['type']) => {
    if (type === 'daily') {
      onChange({ type: 'daily' })
    } else if (type === 'specific_days') {
      onChange({ type: 'specific_days', days: ['mon', 'wed', 'fri'] })
    } else {
      onChange({
        type: 'interval',
        every_x_days: 2,
        start_date: new Date().toISOString().split('T')[0],
      })
    }
  }

  const handleDayToggle = (day: DayOfWeek) => {
    if (value?.type !== 'specific_days') return

    const currentDays = value.days || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day]

    // Ensure at least one day is selected
    if (newDays.length === 0) return

    onChange({ type: 'specific_days', days: newDays })
  }

  const handleIntervalChange = (days: number) => {
    if (value?.type !== 'interval') return
    if (days < 1) days = 1
    if (days > 30) days = 30

    onChange({
      type: 'interval',
      every_x_days: days,
      start_date: value.start_date,
    })
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Frequency type selector */}
      <div className="grid grid-cols-3 gap-2">
        {FREQUENCY_OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = currentType === option.type

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => handleTypeChange(option.type)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg p-3 text-xs transition-colors',
                isActive
                  ? 'bg-teal-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      {/* Specific days picker */}
      {currentType === 'specific_days' && value?.type === 'specific_days' && (
        <div className="flex justify-between gap-1">
          {DAYS.map((day) => {
            const isSelected = value.days?.includes(day.key)

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => handleDayToggle(day.key)}
                title={day.label}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-teal-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {day.short}
              </button>
            )
          })}
        </div>
      )}

      {/* Interval picker */}
      {currentType === 'interval' && value?.type === 'interval' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Every</span>
          <Input
            type="number"
            min={1}
            max={30}
            value={value.every_x_days}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 2)}
            className="w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      )}
    </div>
  )
}
