import type { RoutineFrequency, DayOfWeek, RoutineTemplate } from '@/lib/types/routines'

const DAY_INDEX_MAP: Record<DayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

const INDEX_TO_DAY: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Check if a routine is scheduled for a given date
 */
export function isScheduledForDate(
  frequency: RoutineFrequency | null | undefined,
  date: Date
): boolean {
  // Default to daily if no frequency is set
  if (!frequency || frequency.type === 'daily') {
    return true
  }

  if (frequency.type === 'specific_days') {
    const dayOfWeek = INDEX_TO_DAY[date.getDay()]
    return frequency.days.includes(dayOfWeek)
  }

  if (frequency.type === 'interval') {
    const startDate = new Date(frequency.start_date)
    startDate.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    const diffTime = checkDate.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // If the date is before the start date, not scheduled
    if (diffDays < 0) return false

    return diffDays % frequency.every_x_days === 0
  }

  return true
}

/**
 * Check if a routine is scheduled for today
 */
export function isScheduledForToday(frequency: RoutineFrequency | null | undefined): boolean {
  return isScheduledForDate(frequency, new Date())
}

/**
 * Get the next scheduled date for a routine
 */
export function getNextScheduledDate(
  frequency: RoutineFrequency | null | undefined,
  fromDate: Date = new Date()
): Date {
  // Default to daily - next day is tomorrow
  if (!frequency || frequency.type === 'daily') {
    const tomorrow = new Date(fromDate)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  if (frequency.type === 'specific_days') {
    const currentDay = fromDate.getDay()
    const days = frequency.days.map((d) => DAY_INDEX_MAP[d]).sort((a, b) => a - b)

    // Find the next scheduled day
    for (const day of days) {
      if (day > currentDay) {
        const nextDate = new Date(fromDate)
        nextDate.setDate(nextDate.getDate() + (day - currentDay))
        return nextDate
      }
    }

    // Wrap to next week
    const daysUntilNext = 7 - currentDay + days[0]
    const nextDate = new Date(fromDate)
    nextDate.setDate(nextDate.getDate() + daysUntilNext)
    return nextDate
  }

  if (frequency.type === 'interval') {
    const startDate = new Date(frequency.start_date)
    startDate.setHours(0, 0, 0, 0)
    const checkDate = new Date(fromDate)
    checkDate.setHours(0, 0, 0, 0)

    const diffTime = checkDate.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      // Before start date, return start date
      return startDate
    }

    const daysSinceLastScheduled = diffDays % frequency.every_x_days
    const daysUntilNext = frequency.every_x_days - daysSinceLastScheduled

    const nextDate = new Date(fromDate)
    nextDate.setDate(nextDate.getDate() + daysUntilNext)
    return nextDate
  }

  // Fallback to tomorrow
  const tomorrow = new Date(fromDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
}

/**
 * Format a date as a day name (e.g., "Mon", "Tue")
 */
export function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Get a human-readable description of the frequency
 */
export function getFrequencyDescription(frequency: RoutineFrequency | null | undefined): string {
  if (!frequency || frequency.type === 'daily') {
    return 'Daily'
  }

  if (frequency.type === 'specific_days') {
    const dayLabels = frequency.days
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
      .join(', ')
    return dayLabels
  }

  if (frequency.type === 'interval') {
    if (frequency.every_x_days === 2) {
      return 'Every other day'
    }
    return `Every ${frequency.every_x_days} days`
  }

  return 'Daily'
}

/**
 * Check if a template is scheduled for today
 */
export function isTemplateScheduledForToday(template: RoutineTemplate): boolean {
  return isScheduledForToday(template.frequency)
}

/**
 * Get the next scheduled day label for a template (e.g., "Next: Wed")
 */
export function getNextScheduledLabel(template: RoutineTemplate): string | null {
  if (isScheduledForToday(template.frequency)) {
    return null
  }

  const nextDate = getNextScheduledDate(template.frequency)
  return `Next: ${formatDayShort(nextDate)}`
}
