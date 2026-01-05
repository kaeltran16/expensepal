'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
} from '@/lib/hooks/use-recurring-expenses'
import type { RecurringExpense } from '@/lib/supabase'

interface RecurringExpenseFormProps {
  initialData?: RecurringExpense
  onSuccess?: () => void
}

const CATEGORIES = [
  'Subscriptions',
  'Bills',
  'Food',
  'Transport',
  'Entertainment',
  'Health',
  'Insurance',
  'Utilities',
  'Other',
]

export function RecurringExpenseForm({ initialData, onSuccess }: RecurringExpenseFormProps) {
  const isEditing = !!initialData
  const createMutation = useCreateRecurringExpense()
  const updateMutation = useUpdateRecurringExpense()

  const [frequency, setFrequency] = useState(initialData?.frequency || 'monthly')
  const [showCustomInterval, setShowCustomInterval] = useState(frequency === 'custom')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      merchant: initialData?.merchant || '',
      category: initialData?.category || 'Subscriptions',
      amount: initialData?.amount || 0,
      currency: initialData?.currency || 'VND',
      frequency: initialData?.frequency || 'monthly',
      intervalDays: initialData?.interval_days || null,
      startDate: initialData?.start_date || new Date().toISOString().split('T')[0],
      nextDueDate:
        initialData?.next_due_date || new Date().toISOString().split('T')[0],
      autoCreate: initialData?.auto_create || false,
      notifyBeforeDays: initialData?.notify_before_days || 1,
      notes: initialData?.notes || '',
    },
  })

  useEffect(() => {
    setShowCustomInterval(frequency === 'custom')
  }, [frequency])

  const onSubmit = async (data: any) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          updates: {
            name: data.name,
            merchant: data.merchant,
            category: data.category,
            amount: parseFloat(data.amount),
            currency: data.currency,
            frequency: data.frequency,
            interval_days: data.frequency === 'custom' ? parseInt(data.intervalDays) : null,
            start_date: data.startDate,
            next_due_date: data.nextDueDate,
            auto_create: data.autoCreate,
            notify_before_days: parseInt(data.notifyBeforeDays),
            notes: data.notes || null,
          },
        })
      } else {
        await createMutation.mutateAsync({
          user_id: '', // Will be set by the API
          name: data.name,
          merchant: data.merchant,
          category: data.category,
          amount: parseFloat(data.amount),
          currency: data.currency,
          frequency: data.frequency,
          interval_days: data.frequency === 'custom' ? parseInt(data.intervalDays) : null,
          start_date: data.startDate,
          next_due_date: data.nextDueDate,
          is_active: true,
          auto_create: data.autoCreate,
          notify_before_days: parseInt(data.notifyBeforeDays),
          source: 'manual',
          notes: data.notes || null,
        })
      }
      onSuccess?.()
    } catch (error) {
      console.error('Failed to save recurring expense:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register('name', { required: 'Name is required' })}
          placeholder="e.g., Netflix Premium"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message as string}</p>
        )}
      </div>

      {/* Merchant */}
      <div className="space-y-2">
        <Label htmlFor="merchant">Merchant *</Label>
        <Input
          id="merchant"
          {...register('merchant', { required: 'Merchant is required' })}
          placeholder="e.g., Netflix"
        />
        {errors.merchant && (
          <p className="text-sm text-destructive">{errors.merchant.message as string}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          defaultValue={initialData?.category || 'Subscriptions'}
          onValueChange={(value) => setValue('category', value)}
        >
          <SelectTrigger>
            <SelectValue />
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

      {/* Amount & Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 0, message: 'Amount must be positive' },
            })}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            defaultValue={initialData?.currency || 'VND'}
            onValueChange={(value) => setValue('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VND">VND</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency *</Label>
        <Select
          defaultValue={initialData?.frequency || 'monthly'}
          onValueChange={(value) => {
            setValue('frequency', value)
            setFrequency(value)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Interval */}
      {showCustomInterval && (
        <div className="space-y-2">
          <Label htmlFor="intervalDays">Interval (Days) *</Label>
          <Input
            id="intervalDays"
            type="number"
            {...register('intervalDays', {
              required: showCustomInterval ? 'Interval is required for custom frequency' : false,
              min: { value: 1, message: 'Interval must be at least 1 day' },
            })}
            placeholder="e.g., 30"
          />
          {errors.intervalDays && (
            <p className="text-sm text-destructive">
              {errors.intervalDays.message as string}
            </p>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input id="startDate" type="date" {...register('startDate', { required: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextDueDate">Next Due Date *</Label>
          <Input
            id="nextDueDate"
            type="date"
            {...register('nextDueDate', { required: true })}
          />
        </div>
      </div>

      {/* Auto-create */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="autoCreate" className="text-base">
            Auto-create expenses
          </Label>
          <p className="text-sm text-muted-foreground">
            Automatically create expense when due
          </p>
        </div>
        <Switch
          id="autoCreate"
          {...register('autoCreate')}
          defaultChecked={initialData?.auto_create ?? undefined}
        />
      </div>

      {/* Notify before days */}
      <div className="space-y-2">
        <Label htmlFor="notifyBeforeDays">Notify me (days before)</Label>
        <Input
          id="notifyBeforeDays"
          type="number"
          min="0"
          {...register('notifyBeforeDays')}
          placeholder="1"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
