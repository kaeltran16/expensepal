/**
 * Timezone utility for GMT+7 (Southeast Asia timezone)
 * All dates in the app should use this timezone for consistency
 */

const GMT_PLUS_7_OFFSET = 7 * 60 // 7 hours in minutes

/**
 * Get current date/time in GMT+7
 */
export function getNowInGMT7(): Date {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (GMT_PLUS_7_OFFSET * 60000))
}

/**
 * Get today's date string in GMT+7 (YYYY-MM-DD format)
 */
export function getTodayInGMT7(): string {
  const now = getNowInGMT7()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get start of day in GMT+7 (00:00:00)
 */
export function getStartOfDayGMT7(date?: Date): string {
  const targetDate = date ? new Date(date) : getNowInGMT7()
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00:00`
}

/**
 * Get end of day in GMT+7 (23:59:59)
 */
export function getEndOfDayGMT7(date?: Date): string {
  const targetDate = date ? new Date(date) : getNowInGMT7()
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T23:59:59`
}

/**
 * Get current ISO string in GMT+7 format
 * Used for meal_date timestamps
 */
export function getCurrentISOInGMT7(): string {
  const now = getNowInGMT7()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * Get date range for today in GMT+7
 * Returns { startDate, endDate, todayDate }
 */
export function getTodayRangeGMT7() {
  const todayDate = getTodayInGMT7()
  return {
    startDate: getStartOfDayGMT7(),
    endDate: getEndOfDayGMT7(),
    todayDate,
  }
}

/**
 * Get milliseconds until next midnight in GMT+7
 * Used for scheduling midnight resets
 */
export function getMillisecondsUntilMidnightGMT7(): number {
  const now = getNowInGMT7()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.getTime() - now.getTime()
}

/**
 * Format date for display in GMT+7
 */
export function formatDateGMT7(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    timeZone: 'Asia/Bangkok', // GMT+7
    ...options,
  })
}

/**
 * Format time for display in GMT+7
 */
export function formatTimeGMT7(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Bangkok', // GMT+7
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

/**
 * Format date and time for display in GMT+7
 */
export function formatDateTimeGMT7(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok', // GMT+7
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
