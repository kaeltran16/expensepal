'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Expense } from '@/lib/supabase'

interface ExpenseFormProps {
  expense?: Expense
  onSubmit: (data: any) => Promise<void>
  onCancel?: () => void
}

export function ExpenseForm({ expense, onSubmit, onCancel }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cardNumber: expense?.card_number || '',
    cardholder: expense?.cardholder || '',
    transactionType: expense?.transaction_type || 'Payment for services and goods',
    amount: expense?.amount?.toString() || '',
    currency: expense?.currency || 'VND',
    transactionDate: expense?.transaction_date
      ? new Date(expense.transaction_date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    merchant: expense?.merchant || '',
    category: expense?.category || '',
    notes: expense?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        transactionDate: new Date(formData.transactionDate).toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant</Label>
                <Input
                  id="merchant"
                  name="merchant"
                  value={formData.merchant}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Date</Label>
                <Input
                  id="transactionDate"
                  name="transactionDate"
                  type="datetime-local"
                  value={formData.transactionDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholder">Cardholder</Label>
              <Input
                id="cardholder"
                name="cardholder"
                value={formData.cardholder}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type</Label>
              <Input
                id="transactionType"
                name="transactionType"
                value={formData.transactionType}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : expense ? 'Update' : 'Create'}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
