import type { Expense } from './supabase'

export function exportToCSV(expenses: Expense[], filename: string = 'expenses.csv') {
  // CSV headers
  const headers = [
    'Date',
    'Merchant',
    'Category',
    'Amount',
    'Currency',
    'Card Number',
    'Cardholder',
    'Transaction Type',
    'Notes',
    'Source',
  ]

  // Convert expenses to CSV rows
  const rows = expenses.map((expense) => [
    new Date(expense.transaction_date).toLocaleDateString(),
    expense.merchant,
    expense.category || '',
    expense.amount.toString(),
    expense.currency,
    expense.card_number || '',
    expense.cardholder || '',
    expense.transaction_type || '',
    expense.notes || '',
    expense.source || '',
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = cell.replace(/"/g, '""')
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
          ? `"${escaped}"`
          : escaped
      }).join(',')
    ),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToJSON(expenses: Expense[], filename: string = 'expenses.json') {
  const jsonContent = JSON.stringify(expenses, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
