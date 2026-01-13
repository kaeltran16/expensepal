/**
 * Centralized thresholds for insight detection
 * All magic numbers in one place for easy tuning
 */
export const INSIGHT_THRESHOLDS = {
  // Trend detection
  SIGNIFICANT_MOM_CHANGE: 25, // % month-over-month change to report
  NEW_CATEGORY_MIN_AMOUNT: 100000, // VND - minimum to report new category

  // Pattern detection
  WEEKEND_WEEKDAY_DIFF: 30, // % difference to report
  TOP_CATEGORY_CONCENTRATION: 40, // % of total spending to flag
  DAY_MULTIPLIER_THRESHOLD: 1.5, // x difference between max/min day

  // Alert detection
  SPENDING_SPIKE_MULTIPLIER: 2.5, // x daily average
  VELOCITY_CHANGE_THRESHOLD: 30, // % week-over-week
  MIN_DAYS_FOR_SPIKE: 7, // minimum days of data for spike detection

  // Streak detection
  MIN_STREAK_DAYS: 7, // minimum days to report a streak

  // Unusual spending
  UNUSUAL_SPENDING_MULTIPLIER: 2, // x average expense

  // Recurring detection
  MERCHANT_SIMILARITY: 0.8, // 80% string similarity
  MIN_TRANSACTIONS: 4, // minimum transactions for pattern
  MIN_CONFIDENCE: 65, // minimum confidence score

  // Category trend thresholds
  STABLE_THRESHOLD: 10, // % change considered stable
} as const

export type InsightThresholds = typeof INSIGHT_THRESHOLDS
