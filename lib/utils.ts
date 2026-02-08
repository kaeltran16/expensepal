import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string; decimals: number }> = {
  VND: { locale: 'vi-VN', symbol: '₫', decimals: 0 },
  USD: { locale: 'en-US', symbol: '$', decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 2 },
  GBP: { locale: 'en-GB', symbol: '£', decimals: 2 },
  JPY: { locale: 'ja-JP', symbol: '¥', decimals: 0 },
}

export function formatCurrency(amount: number, currency: string = 'VND'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.VND
  return new Intl.NumberFormat(config.locale, {
    style: 'decimal',
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount)
}

export function getCurrencySymbol(currency: string = 'VND'): string {
  return (CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.VND).symbol
}

export function getCurrencyLocale(currency: string = 'VND'): string {
  return (CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.VND).locale
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // Show "Today", "Yesterday", or relative time for recent dates
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes < 1 ? 'Just now' : `${minutes}m ago`
    }
    return hours < 3 ? `${hours}h ago` : `Today at ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return `${days} days ago`
  } else if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }

  // For older dates, show compact format
  return new Intl.DateTimeFormat('vi-VN', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// Re-export category colors from theme system
export {
  expenseCategoryColors as CATEGORY_COLORS,
  getCategoryColor,
  getCategoryEmoji,
} from './theme'

// Haptic feedback (works on mobile browsers that support it)
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
    }
    navigator.vibrate(patterns[type])
  }
}
