/**
 * Determine meal time based on transaction time (GMT+7 Vietnam time)
 *
 * Rules (based on local hour in Vietnam):
 * - 06:00 - 10:59: Breakfast
 * - 11:00 - 15:59: Lunch
 * - 16:00 - 21:59: Dinner
 * - Other times: Snack
 *
 * Note: The transaction date from frontend is in ISO format (UTC).
 * We convert it to GMT+7 (Vietnam) to determine the meal time.
 */
export function getMealTimeFromDate(date: Date | string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Convert UTC to Vietnam time (GMT+7)
  const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
  const vietnamTime = new Date(dateObj.getTime() + VIETNAM_OFFSET_MS)
  const hour = vietnamTime.getUTCHours() // Get the hour in Vietnam timezone

  console.log(`🕐 Meal time detection (GMT+7):`, {
    utcTime: dateObj.toISOString(),
    vietnamTime: vietnamTime.toISOString(),
    vietnamHour: hour,
    detectedMealTime: hour >= 6 && hour < 11 ? 'breakfast' :
                      hour >= 11 && hour < 16 ? 'lunch' :
                      hour >= 16 && hour < 22 ? 'dinner' : 'snack'
  })

  if (hour >= 6 && hour < 11) {
    return 'breakfast'
  } else if (hour >= 11 && hour < 16) {
    return 'lunch'
  } else if (hour >= 16 && hour < 22) {
    return 'dinner'
  } else {
    return 'snack'
  }
}
