'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCategory } from '@/lib/hooks'
import { hapticFeedback } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { useState } from 'react'

const EMOJI_OPTIONS = [
  '🏠', '🚗', '🍔', '🎬', '🛍️', '💡', '🏥', '✈️',
  '💰', '📱', '🎓', '🎮', '🐕', '🌳', '⚽', '🎵',
  '📚', '💼', '🔧', '🎨', '☕', '🍕', '🏃', '💻'
]

const COLOR_OPTIONS = [
  { name: 'Red', value: '#FF6B6B' },
  { name: 'Orange', value: '#FF8C42' },
  { name: 'Yellow', value: '#FFC93C' },
  { name: 'Green', value: '#4ECDC4' },
  { name: 'Blue', value: '#45B7D1' },
  { name: 'Purple', value: '#AA96DA' },
  { name: 'Pink', value: '#F38181' },
  { name: 'Gray', value: '#95A3B3' },
]

export function AddCategoryDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [color, setColor] = useState('#95A3B3')

  const createMutation = useCreateCategory()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    hapticFeedback('medium')

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        icon,
        color,
      })

      // Reset form
      setName('')
      setIcon('📁')
      setColor('#95A3B3')
      setOpen(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 ios-touch">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Custom Category</DialogTitle>
          <DialogDescription>
            Add a new category to organize your expenses
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Subscriptions, Gifts, Pet Care"
              className="ios-body"
              autoComplete="off"
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setIcon(emoji)
                    hapticFeedback('light')
                  }}
                  className={`
                    h-10 w-10 rounded-lg flex items-center justify-center text-xl
                    transition-all ios-touch
                    ${
                      icon === emoji
                        ? 'bg-primary text-primary-foreground scale-110'
                        : 'bg-secondary hover:bg-secondary/80'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => {
                    setColor(colorOption.value)
                    hapticFeedback('light')
                  }}
                  className={`
                    h-12 rounded-lg flex items-center justify-center gap-2
                    transition-all ios-touch border-2
                    ${
                      color === colorOption.value
                        ? 'border-foreground scale-105'
                        : 'border-transparent'
                    }
                  `}
                  style={{ backgroundColor: colorOption.value }}
                >
                  {color === colorOption.value && (
                    <span className="text-white font-semibold text-sm">
                      {colorOption.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="ios-card p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Preview
            </Label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {icon}
              </div>
              <span className="ios-headline">
                {name.trim() || 'New Category'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 ios-touch"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="flex-1 ios-touch"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
