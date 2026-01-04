# New Features Documentation

## Overview

This document explains the three new features added to the Expense Tracker app:

1. **Reusable LLM Service** - Centralized AI/LLM integration
2. **Smart Budget Recommendations** - AI-powered budget suggestions
3. **Offline Mode Enhancements** - Queue mutations when offline

---

## 1. Reusable LLM Service

### Purpose
Avoid repeating LLM API calls by creating a centralized service that can be reused across the codebase.

### Location
`lib/llm-service.ts`

### Usage

```typescript
import { llmService } from '@/lib/llm-service'

// Simple text prompt
const response = await llmService.ask(
  'Extract transaction amount from this text: $25.50',
  {
    temperature: 0.1,
    maxTokens: 100
  }
)

// Structured completion
const completion = await llmService.completion({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is 2+2?' }
  ],
  temperature: 0.7,
  maxTokens: 500,
  model: 'google/gemini-2.0-flash-001' // Optional, uses default if not specified
})

// Parse JSON response
const data = llmService.parseJSON<{ amount: number }>(completion.content)
```

### Configuration

Set the `OPENROUTER_API_KEY` environment variable in `.env`:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

### Example: Email Parser Integration

The email parser has been refactored to use the LLM service and now includes **automatic category detection**:

```typescript
// Before (old code - removed)
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    // ... repetitive setup
  },
  body: JSON.stringify({ /* config */ })
})

// After (new code)
const response = await llmService.completion({
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.1,
  maxTokens: 500,
})

const parsed = llmService.parseJSON(response.content)
```

**Benefits:**
- ✅ No code duplication
- ✅ Centralized error handling
- ✅ Consistent API across app
- ✅ Easy to add new LLM features
- ✅ **NEW:** Automatic category detection for email imports

### Auto-Category Detection

The email parser now automatically assigns categories to imported expenses:

**LLM-Powered:**
- AI analyzes merchant name and transaction type
- Returns one of: Food, Transport, Shopping, Entertainment, Bills, Health, Other
- Example: "GrabFood from Starbucks" → Category: "Food"

**Fallback Mapping:**
For regex-based parsers (VIB, Grab), a smart mapping function categorizes based on:
- Transaction type keywords (food, car, bike, shopping, etc.)
- Merchant name patterns (cafe, restaurant, taxi, etc.)

**No More Manual Categorization:**
```typescript
// Parsed expense now includes category
{
  merchant: "Starbucks",
  amount: 50000,
  category: "Food",  // ← Automatically detected!
  source: "email"
}
```

---

## 2. Smart Budget Recommendations

### Purpose
Analyze spending patterns and automatically suggest optimal budgets based on historical data.

### Components

#### Analytics Module
`lib/analytics/budget-recommendations.ts`

```typescript
import { generateBudgetRecommendations } from '@/lib/analytics/budget-recommendations'

const recommendations = generateBudgetRecommendations(expenses, existingBudgets)
// Returns: BudgetRecommendation[]
```

#### React Hooks
`lib/hooks/use-budget-recommendations.ts`

```typescript
import { useBudgetRecommendations } from '@/lib/hooks'

function BudgetPage() {
  const { data: expenses } = useExpenses()
  const { data: budgets } = useBudgets()

  const { data: recommendations, isLoading } = useBudgetRecommendations(
    expenses || [],
    budgets || []
  )

  return (
    <BudgetRecommendations
      recommendations={recommendations || []}
      onAcceptRecommendation={(category, amount) => {
        // Create budget with recommended amount
        createBudget({
          category,
          amount,
          month: new Date().toISOString().substring(0, 7)
        })
      }}
    />
  )
}
```

#### UI Component
`components/budget-recommendations.tsx`

```typescript
<BudgetRecommendations
  recommendations={recommendations}
  onAcceptRecommendation={(category, amount) => {
    console.log(`Applying budget: ${category} = ${amount}`)
  }}
  onDismiss={(category) => {
    console.log(`Dismissed: ${category}`)
  }}
/>
```

### Features

**Each recommendation includes:**
- `category` - Spending category
- `suggestedAmount` - Recommended budget amount
- `currentAmount` - Existing budget (if any)
- `reasoning` - AI-generated explanation
- `confidence` - High/Medium/Low based on data quality
- `trend` - Increasing/Stable/Decreasing
- `percentChange` - Trend percentage

**Algorithm:**
1. Analyzes last 3 months of spending
2. Calculates average per category
3. Detects trends (increasing/decreasing/stable)
4. Adds buffer (10-20%) for flexibility
5. Generates human-readable reasoning

**Example Output:**

```typescript
{
  category: "Food",
  suggestedAmount: 3300000, // VND
  currentAmount: 2500000,
  reasoning: "Based on your last 3 months, you spend an average of 3,000,000 VND on Food. Your spending is increasing by 15%, so we recommend a higher budget.",
  confidence: "high",
  trend: "increasing",
  percentChange: 15.2
}
```

### Additional Hooks

**Spending Patterns:**
```typescript
const { data: patterns } = useSpendingPatterns(expenses, budgets)

// Returns:
[
  {
    category: "Food",
    monthlyAverage: 2500000,
    last3MonthsAverage: 2800000,
    currentMonthSpending: 1200000,
    isOverBudget: false
  }
]
```

**Budget Adjustment Alerts:**
```typescript
const { data: alert } = useBudgetAdjustmentCheck(expenses, budgets)

// Returns:
{
  needsAdjustment: true,
  categories: ["Food", "Transport"],
  reason: "You're approaching or exceeding your budget in 2 categories."
}
```

---

## 3. Offline Mode Enhancements

### Purpose
Queue mutations when offline and automatically sync when back online, providing seamless offline functionality.

### Components

#### Offline Queue Hook
`lib/hooks/use-offline-queue.ts`

```typescript
import { useOfflineQueue } from '@/lib/hooks'

function ExpenseForm() {
  const { addToQueue, isOnline, queueLength } = useOfflineQueue()

  const handleSubmit = async (data) => {
    if (!isOnline) {
      // Queue for later
      addToQueue({
        type: 'create',
        entity: 'expense',
        data
      })
      toast.info('Saved offline. Will sync when online.')
    } else {
      // Normal API call
      await createExpense(data)
    }
  }
}
```

#### UI Components

**Banner Indicator:**
`components/offline-indicator.tsx`

```typescript
import { OfflineIndicator } from '@/components/offline-indicator'

function Layout() {
  return (
    <>
      <OfflineIndicator />
      {/* Shows banner at top when offline or syncing */}

      {/* Your app content */}
    </>
  )
}
```

**Compact Status:**
```typescript
import { OfflineStatus } from '@/components/offline-indicator'

function Navbar() {
  return (
    <nav>
      <Logo />
      <OfflineStatus />
      {/* Shows online/offline status with pending count */}
    </nav>
  )
}
```

### Features

**Automatic Queue Processing:**
- Detects when device goes offline
- Queues all mutations (create/update/delete)
- Auto-syncs when back online
- Retries failed requests (max 3 attempts)
- Persists queue in localStorage

**Mutation Types Supported:**
```typescript
addToQueue({
  type: 'create' | 'update' | 'delete',
  entity: 'expense' | 'budget' | 'goal' | 'meal',
  data: { /* your data */ }
})
```

**Queue Management:**
```typescript
const {
  queue,              // Current queue items
  isOnline,           // Online/offline status
  isProcessing,       // Currently syncing?
  queueLength,        // Number of pending items
  addToQueue,         // Add mutation to queue
  removeFromQueue,    // Remove specific item
  clearQueue,         // Clear entire queue
  retryQueue,         // Manually trigger sync
} = useOfflineQueue()
```

**UI States:**

1. **Online + Empty Queue** - No indicator shown
2. **Offline** - Red banner: "You're offline"
3. **Online + Pending** - Blue banner with "Sync Now" button
4. **Processing** - Blue banner with spinner

### Usage Example

```typescript
'use client'

import { useOfflineQueue } from '@/lib/hooks'
import { OfflineIndicator } from '@/components/offline-indicator'

export function ExpenseApp() {
  const { addToQueue, isOnline } = useOfflineQueue()
  const createExpense = useCreateExpense()

  const handleCreateExpense = async (data) => {
    if (isOnline) {
      // Normal flow
      await createExpense.mutateAsync(data)
    } else {
      // Queue for later
      addToQueue({
        type: 'create',
        entity: 'expense',
        data
      })
      toast.success('Saved offline. Will sync when online.')
    }
  }

  return (
    <>
      <OfflineIndicator />
      <ExpenseForm onSubmit={handleCreateExpense} />
    </>
  )
}
```

---

## Integration Guide

### Step 1: Add to Your Main Layout

```typescript
// app/layout.tsx or app/page.tsx
import { OfflineIndicator } from '@/components/offline-indicator'

export default function Layout({ children }) {
  return (
    <div>
      <OfflineIndicator />
      {children}
    </div>
  )
}
```

### Step 2: Add Budget Recommendations to Budget View

```typescript
// components/views/budget-view.tsx
import { useBudgetRecommendations } from '@/lib/hooks'
import { BudgetRecommendations } from '@/components/budget-recommendations'

export function BudgetView({ expenses, budgets }) {
  const { data: recommendations } = useBudgetRecommendations(expenses, budgets)
  const createBudget = useCreateBudget()

  return (
    <div>
      <BudgetRecommendations
        recommendations={recommendations || []}
        onAcceptRecommendation={(category, amount) => {
          createBudget.mutate({
            category,
            amount,
            month: new Date().toISOString().substring(0, 7)
          })
        }}
      />

      {/* Your existing budget UI */}
    </div>
  )
}
```

### Step 3: Use LLM Service for New Features

```typescript
// Example: AI-powered category suggestion
import { llmService } from '@/lib/llm-service'

async function suggestCategory(merchant: string) {
  const prompt = `Given the merchant "${merchant}", suggest the most appropriate spending category from: Food, Transport, Shopping, Entertainment, Bills, Other. Return only the category name.`

  const response = await llmService.ask(prompt, {
    temperature: 0.3,
    maxTokens: 50
  })

  return response?.trim() || 'Other'
}
```

---

## Testing

### Test Offline Mode

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Create/edit/delete an expense
4. Check that banner appears
5. Go back "Online"
6. Verify auto-sync works

### Test Budget Recommendations

1. Ensure you have 3+ months of expense data
2. Navigate to budget page
3. Check recommendations appear
4. Click "Apply Budget" to test integration

### Test LLM Service

```typescript
// In browser console or component
import { llmService } from '@/lib/llm-service'

const test = await llmService.ask('What is 2+2?')
console.log(test) // Should return "4"
```

---

## Performance Notes

**Budget Recommendations:**
- Cached for 5 minutes
- Only recalculates when expense/budget data changes
- Lightweight computation (< 50ms for 1000 expenses)

**Offline Queue:**
- Stored in localStorage (< 10 KB typical)
- Auto-cleans after successful sync
- Max 3 retry attempts to avoid infinite loops

**LLM Service:**
- Uses fast models (Gemini 2.0 Flash)
- Low temperature (0.1-0.3) for consistency
- Caches responses where applicable

---

## Future Enhancements

**Budget Recommendations:**
- [ ] Machine learning for seasonal patterns
- [ ] Income-based budget suggestions
- [ ] Category splitting recommendations

**Offline Mode:**
- [ ] IndexedDB for larger queue storage
- [ ] Conflict resolution for concurrent edits
- [ ] Background sync API integration

**LLM Service:**
- [ ] Streaming responses for long completions
- [ ] Multi-model support (fallback to cheaper models)
- [ ] Usage tracking and cost monitoring

---

## Troubleshooting

**Budget Recommendations not showing:**
- Ensure you have at least 3 expenses in different categories
- Check that expenses span 1+ months
- Verify TanStack Query is properly configured

**Offline sync not working:**
- Check localStorage is enabled
- Verify service worker is registered
- Ensure API endpoints match mutation format

**LLM Service errors:**
- Verify `OPENROUTER_API_KEY` is set
- Check API quota/credits
- Review console for error messages

---

## API Reference

See individual files for detailed TypeScript types:
- `lib/llm-service.ts` - LLMService, LLMOptions, LLMResponse
- `lib/analytics/budget-recommendations.ts` - BudgetRecommendation, SpendingPattern
- `lib/hooks/use-offline-queue.ts` - PendingMutation, useOfflineQueue
