'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, History } from 'lucide-react'
import type { Expense } from '@/lib/supabase'

interface SearchBarProps {
  expenses: Expense[]
  onSearch: (query: string) => void
}

export function SearchBar({ expenses, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches once on mount
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]')
    setRecentSearches(recent.slice(0, 5))
  }, [])

  // Memoize suggestions calculation to prevent unnecessary recalculations
  const suggestions = useMemo(() => {
    if (query.length < 2) {
      return recentSearches
    }

    // Get unique merchants that match query
    const merchants = Array.from(new Set(
      expenses
        .filter((e) => e.merchant.toLowerCase().includes(query.toLowerCase()))
        .map((e) => e.merchant)
    )).slice(0, 5)

    return merchants
  }, [query, expenses, recentSearches])

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    onSearch(searchQuery)
    setShowSuggestions(false)

    // Add to recent searches
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      const updated = [searchQuery, ...recentSearches].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
  }, [onSearch, recentSearches])

  const clearSearch = useCallback(() => {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }, [onSearch])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onSearch(value)
  }, [onSearch])

  return (
    <div className="relative">
      <motion.div
        className="relative"
        whileTap={{ scale: 0.995 }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search transactions..."
          className="w-full pl-11 pr-11 py-3 rounded-2xl bg-muted/50 border border-transparent focus:border-primary/30 focus:bg-card transition-all text-sm min-h-touch placeholder:text-muted-foreground/60"
          style={{
            WebkitTapHighlightColor: 'transparent',
          }}
        />
        {query && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted/80 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}
      </motion.div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 right-0 mt-2 ios-card overflow-hidden z-50"
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSearch(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-muted/50 active:bg-muted transition-colors flex items-center gap-3 text-sm ios-touch border-b last:border-b-0"
                style={{ borderColor: 'rgba(var(--ios-separator))' }}
              >
                {recentSearches.includes(suggestion) && query.length < 2 ? (
                  <History className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Search className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span className="flex-1">{suggestion}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
