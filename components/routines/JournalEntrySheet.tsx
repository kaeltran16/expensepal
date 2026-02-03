'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { RoutineMood, CreateJournalEntryInput } from '@/lib/types/routines'

interface JournalEntrySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (entry: CreateJournalEntryInput) => void
  routineCompletionId?: string
  isLoading?: boolean
}

const MOODS: Array<{ value: RoutineMood; label: string; icon: typeof Smile; color: string }> = [
  { value: 'great', label: 'Great', icon: SmilePlus, color: 'text-emerald-500' },
  { value: 'good', label: 'Good', icon: Smile, color: 'text-green-500' },
  { value: 'okay', label: 'Okay', icon: Meh, color: 'text-amber-500' },
  { value: 'tired', label: 'Tired', icon: Frown, color: 'text-orange-500' },
  { value: 'stressed', label: 'Stressed', icon: Zap, color: 'text-red-500' },
]

const ENERGY_LEVELS = [
  { value: 1, icon: BatteryLow, label: 'Very Low' },
  { value: 2, icon: BatteryLow, label: 'Low' },
  { value: 3, icon: BatteryMedium, label: 'Medium' },
  { value: 4, icon: Battery, label: 'High' },
  { value: 5, icon: BatteryFull, label: 'Full' },
]

export function JournalEntrySheet({
  open,
  onOpenChange,
  onSave,
  routineCompletionId,
  isLoading,
}: JournalEntrySheetProps) {
  const [mood, setMood] = useState<RoutineMood | undefined>()
  const [energyLevel, setEnergyLevel] = useState<number | undefined>()
  const [notes, setNotes] = useState('')

  const handleSave = () => {
    onSave({
      routine_completion_id: routineCompletionId,
      mood,
      energy_level: energyLevel,
      notes: notes || undefined,
    })
    // Reset form
    setMood(undefined)
    setEnergyLevel(undefined)
    setNotes('')
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form
    setMood(undefined)
    setEnergyLevel(undefined)
    setNotes('')
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>How are you feeling?</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Mood selection */}
          <div>
            <label className="text-sm font-medium">Mood</label>
            <div className="mt-2 flex justify-between">
              {MOODS.map((moodOption) => {
                const Icon = moodOption.icon
                const isSelected = mood === moodOption.value

                return (
                  <button
                    key={moodOption.value}
                    onClick={() => setMood(moodOption.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl p-3 transition-all',
                      isSelected
                        ? 'bg-teal-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <Icon
                      className={cn('h-6 w-6', isSelected ? 'text-white' : moodOption.color)}
                    />
                    <span className="text-xs">{moodOption.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Energy level */}
          <div>
            <label className="text-sm font-medium">Energy Level</label>
            <div className="mt-2 flex justify-between">
              {ENERGY_LEVELS.map((level) => {
                const Icon = level.icon
                const isSelected = energyLevel === level.value

                return (
                  <motion.button
                    key={level.value}
                    onClick={() => setEnergyLevel(level.value)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl p-3 transition-all',
                      isSelected
                        ? 'bg-teal-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{level.value}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did your routine go? Any thoughts..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-safe">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Skip
            </Button>
            <Button
              className="flex-1 bg-teal-500 hover:bg-teal-600"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
