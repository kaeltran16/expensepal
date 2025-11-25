/**
 * Determine meal time based on transaction time (GMT+7)
 * 
 * Rules:
 * - 06:00 - 10:59: Breakfast
 * - 11:00 - 15:59: Lunch
 * - 16:00 - 21:59: Dinner
 * - Other times: Snack
 */
export function getMealTimeFromDate(date: Date | string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Adjust to GMT+7
  // getUTCHours() returns 0-23. We add 7 for Vietnam time.
  // We use modulo 24 to handle wrap-around (e.g. 20:00 UTC + 7 = 27 -> 03:00 GMT+7)
  const hour = (dateObj.getUTCHours() + 7) % 24

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
