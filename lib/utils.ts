import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
  }).format(amount)
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

// Category color system
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Food: { bg: 'bg-orange-100 dark:bg-orange-950', border: 'border-l-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  Transport: { bg: 'bg-blue-100 dark:bg-blue-950', border: 'border-l-blue-500', text: 'text-blue-700 dark:text-blue-400' },
  Shopping: { bg: 'bg-pink-100 dark:bg-pink-950', border: 'border-l-pink-500', text: 'text-pink-700 dark:text-pink-400' },
  Entertainment: { bg: 'bg-purple-100 dark:bg-purple-950', border: 'border-l-purple-500', text: 'text-purple-700 dark:text-purple-400' },
  Bills: { bg: 'bg-yellow-100 dark:bg-yellow-950', border: 'border-l-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
  Health: { bg: 'bg-red-100 dark:bg-red-950', border: 'border-l-red-500', text: 'text-red-700 dark:text-red-400' },
  Other: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-l-gray-500', text: 'text-gray-700 dark:text-gray-400' },
}

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
}

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
