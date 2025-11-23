'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORIES = ['All', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Other']

interface ExpenseFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  category: string
  dateRange: string
  startDate: string
  endDate: string
}

export function ExpenseFilters({ onFilterChange }: ExpenseFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'All',
    dateRange: 'all',
    startDate: '',
    endDate: '',
  })

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      category: 'All',
      dateRange: 'all',
      startDate: '',
      endDate: '',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters = filters.search || filters.category !== 'All' || filters.dateRange !== 'all'

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by merchant..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-10 pr-10 h-12"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFilters({ search: '' })}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex gap-2">
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              •
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => updateFilters({ category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) => updateFilters({ dateRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {filters.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => updateFilters({ startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => updateFilters({ endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
