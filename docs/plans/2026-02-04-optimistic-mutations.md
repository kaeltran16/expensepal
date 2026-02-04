# Optimistic Mutations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optimistic mutations to all CRUD hooks that currently wait for server responses, providing instant UI feedback.

**Architecture:** Follow the established pattern in `useCreateExpenseOptimistic` - cancel queries, snapshot previous state, apply optimistic update, rollback on error, invalidate on settled.

**Tech Stack:** TanStack React Query, TypeScript, Sonner toast notifications

---

## Established Pattern Reference

All optimistic mutations follow this structure (from `use-expenses.ts`):

```typescript
export function useXxxOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiFunction,
    onMutate: async (input) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.xxx.all })

      // 2. Snapshot previous value
      const previousData = queryClient.getQueryData(queryKeys.xxx.lists())

      // 3. Optimistically update cache
      queryClient.setQueriesData({ queryKey: queryKeys.xxx.lists() }, (old) => {
        // Transform data...
      })

      // 4. Return context for rollback
      return { previousData }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.xxx.lists(), context.previousData)
      }
      toast.error('Failed to xxx')
    },
    onSuccess: () => {
      toast.success('Xxx completed')
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.xxx.all })
    },
  })
}
```

---

## Task 1: Expenses - Add useUpdateExpenseOptimistic

**Files:**
- Modify: `lib/hooks/use-expenses.ts:226-240`

**Step 1: Add the optimistic update hook after useUpdateExpense**

Add this code after line 240 in `use-expenses.ts`:

```typescript
/**
 * Hook with optimistic update for updating expenses
 * Provides better UX by immediately updating the UI
 */
export function useUpdateExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExpense,
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      // Snapshot previous value
      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.lists())

      // Optimistically update all expense lists
      queryClient.setQueriesData({ queryKey: queryKeys.expenses.lists() }, (old: Expense[] | undefined) => {
        if (!old) return []
        return old.map((expense) =>
          expense.id === id ? { ...expense, ...updates, updated_at: new Date().toISOString() } : expense
        )
      })

      return { previousExpenses }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.lists(), context.previousExpenses)
      }
      toast.error('Failed to update expense')
    },
    onSuccess: () => {
      toast.success('Expense updated')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all })
    },
  })
}
```

**Step 2: Commit**

```bash
git add lib/hooks/use-expenses.ts
git commit -m "feat(expenses): add useUpdateExpenseOptimistic hook

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Goals - Add useCreateGoalOptimistic

**Files:**
- Modify: `lib/hooks/use-goals.ts:91-104`

**Step 1: Add the optimistic create hook after useCreateGoal**

Add this code after line 104 in `use-goals.ts`:

```typescript
/**
 * Hook with optimistic update for creating goals
 * Provides better UX by immediately updating the UI
 */
export function useCreateGoalOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGoal,
    onMutate: async (newGoal) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      // Snapshot previous value
      const previousGoals = queryClient.getQueryData(queryKeys.goals.lists())

      // Create optimistic goal with temporary ID
      const optimisticGoal: Goal = {
        id: `temp-${Date.now()}`,
        name: newGoal.name,
        target_amount: newGoal.target_amount,
        current_amount: newGoal.current_amount || 0,
        deadline: newGoal.deadline || null,
        icon: newGoal.icon || null,
        color: newGoal.color || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Goal

      // Optimistically update all goal lists
      queryClient.setQueriesData({ queryKey: queryKeys.goals.lists() }, (old: Goal[] | undefined) => {
        if (!old) return [optimisticGoal]
        return [optimisticGoal, ...old]
      })

      return { previousGoals }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.lists(), context.previousGoals)
      }
      toast.error(error.message || 'Failed to create goal')
    },
    onSuccess: () => {
      toast.success('Goal created!')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
```

**Step 2: Commit**

```bash
git add lib/hooks/use-goals.ts
git commit -m "feat(goals): add useCreateGoalOptimistic hook

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Budgets - Add useCreateBudgetOptimistic and useDeleteBudgetOptimistic

**Files:**
- Modify: `lib/hooks/use-budgets.ts:91-191`

**Step 1: Add useCreateBudgetOptimistic after useCreateBudget (line 104)**

```typescript
/**
 * Hook with optimistic update for creating budgets
 */
export function useCreateBudgetOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBudget,
    onMutate: async (newBudget) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.budgets.all })

      const previousBudgets = queryClient.getQueryData(queryKeys.budgets.lists())

      const optimisticBudget: Budget = {
        id: `temp-${Date.now()}`,
        category: newBudget.category,
        amount: newBudget.amount,
        month: newBudget.month,
        spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Budget

      queryClient.setQueriesData({ queryKey: queryKeys.budgets.lists() }, (old: Budget[] | undefined) => {
        if (!old) return [optimisticBudget]
        return [optimisticBudget, ...old]
      })

      return { previousBudgets }
    },
    onError: (error, _, context) => {
      if (context?.previousBudgets) {
        queryClient.setQueryData(queryKeys.budgets.lists(), context.previousBudgets)
      }
      toast.error(error.message || 'Failed to create budget')
    },
    onSuccess: () => {
      toast.success('Budget created!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}
```

**Step 2: Add useDeleteBudgetOptimistic after useDeleteBudget (line 191)**

```typescript
/**
 * Hook with optimistic delete for budgets
 */
export function useDeleteBudgetOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBudget,
    onMutate: async (budgetId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.budgets.all })

      const previousBudgets = queryClient.getQueryData(queryKeys.budgets.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.budgets.lists() }, (old: Budget[] | undefined) => {
        if (!old) return []
        return old.filter((budget) => budget.id !== budgetId)
      })

      return { previousBudgets }
    },
    onError: (error, _, context) => {
      if (context?.previousBudgets) {
        queryClient.setQueryData(queryKeys.budgets.lists(), context.previousBudgets)
      }
      toast.error('Failed to delete budget')
    },
    onSuccess: () => {
      toast.success('Budget deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}
```

**Step 3: Commit**

```bash
git add lib/hooks/use-budgets.ts
git commit -m "feat(budgets): add optimistic create and delete hooks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Recurring Expenses - Add All Optimistic Hooks

**Files:**
- Modify: `lib/hooks/use-recurring-expenses.ts`

**Step 1: Add useCreateRecurringExpenseOptimistic after line 157**

```typescript
/**
 * Hook with optimistic create for recurring expenses
 */
export function useCreateRecurringExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecurringExpense,
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      const optimisticExpense: RecurringExpense = {
        id: `temp-${Date.now()}`,
        merchant: newExpense.merchant,
        category: newExpense.category || null,
        amount: newExpense.amount,
        frequency: newExpense.frequency,
        next_due_date: newExpense.next_due_date,
        is_active: true,
        source: newExpense.source || 'manual',
        skipped_dates: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as RecurringExpense

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return [optimisticExpense]
        return [optimisticExpense, ...old]
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to create recurring expense')
    },
    onSuccess: () => {
      toast.success('Recurring expense created')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}
```

**Step 2: Add useUpdateRecurringExpenseOptimistic after line 199**

```typescript
/**
 * Hook with optimistic update for recurring expenses
 */
export function useUpdateRecurringExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecurringExpense,
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return []
        return old.map((expense) =>
          expense.id === id ? { ...expense, ...updates, updated_at: new Date().toISOString() } : expense
        )
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to update recurring expense')
    },
    onSuccess: () => {
      toast.success('Recurring expense updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}
```

**Step 3: Add useDeleteRecurringExpenseOptimistic after line 231**

```typescript
/**
 * Hook with optimistic delete for recurring expenses
 */
export function useDeleteRecurringExpenseOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecurringExpense,
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return []
        return old.filter((expense) => expense.id !== expenseId)
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error('Failed to delete recurring expense')
    },
    onSuccess: () => {
      toast.success('Recurring expense deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}
```

**Step 4: Add useSkipRecurringExpenseDateOptimistic after line 273**

```typescript
/**
 * Hook with optimistic skip date for recurring expenses
 */
export function useSkipRecurringExpenseDateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: skipRecurringExpenseDate,
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.all })

      const previousData = queryClient.getQueryData(queryKeys.recurringExpenses.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.recurringExpenses.lists() }, (old: RecurringExpense[] | undefined) => {
        if (!old) return []
        return old.map((expense) => {
          if (expense.id !== id) return expense
          const skippedDates = expense.skipped_dates || []
          return { ...expense, skipped_dates: [...skippedDates, date] }
        })
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.recurringExpenses.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to skip date')
    },
    onSuccess: () => {
      toast.success('Date skipped')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all })
    },
  })
}
```

**Step 5: Commit**

```bash
git add lib/hooks/use-recurring-expenses.ts
git commit -m "feat(recurring-expenses): add optimistic CRUD hooks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Workouts - Add Optimistic Hooks

**Files:**
- Modify: `lib/hooks/use-workouts.ts`

**Step 1: Add useCreateTemplateOptimistic after line 164**

```typescript
/**
 * Hook with optimistic create for workout templates
 */
export function useCreateTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateData: Parameters<ReturnType<typeof useCreateTemplate>['mutate']>[0]) => {
      const res = await fetch('/api/workout-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to create template')
      }
      return res.json()
    },
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: workoutKeys.templates })

      const previousTemplates = queryClient.getQueryData<WorkoutTemplate[]>(workoutKeys.templates)

      const optimisticTemplate: WorkoutTemplate = {
        id: `temp-${Date.now()}`,
        name: newTemplate.name,
        description: newTemplate.description || null,
        difficulty: newTemplate.difficulty || null,
        duration_minutes: newTemplate.duration_minutes || null,
        tags: newTemplate.tags || [],
        target_goal: newTemplate.target_goal || null,
        exercises: [],
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as WorkoutTemplate

      queryClient.setQueryData<WorkoutTemplate[]>(workoutKeys.templates, (old) => {
        if (!old) return [optimisticTemplate]
        return [optimisticTemplate, ...old]
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(workoutKeys.templates, context.previousTemplates)
      }
      toast.error(error.message || 'failed to create template')
    },
    onSuccess: () => {
      toast.success('template created!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.templates })
    },
  })
}
```

**Step 2: Add useUpdateTemplateOptimistic after line 210**

```typescript
/**
 * Hook with optimistic update for workout templates
 */
export function useUpdateTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; [key: string]: any }) => {
      const { id, ...templateData } = params
      const res = await fetch(`/api/workout-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to update template')
      }
      return res.json()
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: workoutKeys.templates })

      const previousTemplates = queryClient.getQueryData<WorkoutTemplate[]>(workoutKeys.templates)

      queryClient.setQueryData<WorkoutTemplate[]>(workoutKeys.templates, (old) => {
        if (!old) return []
        return old.map((template) =>
          template.id === id ? { ...template, ...updates, updated_at: new Date().toISOString() } : template
        )
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(workoutKeys.templates, context.previousTemplates)
      }
      toast.error(error.message || 'failed to update template')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.templates })
    },
  })
}
```

**Step 3: Add useDeleteTemplateOptimistic after line 237**

```typescript
/**
 * Hook with optimistic delete for workout templates
 */
export function useDeleteTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/workout-templates/${templateId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'failed to delete template')
      }
      return res.json()
    },
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: workoutKeys.templates })

      const previousTemplates = queryClient.getQueryData<WorkoutTemplate[]>(workoutKeys.templates)

      queryClient.setQueryData<WorkoutTemplate[]>(workoutKeys.templates, (old) => {
        if (!old) return []
        return old.filter((template) => template.id !== templateId)
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(workoutKeys.templates, context.previousTemplates)
      }
      toast.error(error.message || 'failed to delete template')
    },
    onSuccess: () => {
      toast.success('template deleted!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.templates })
    },
  })
}
```

**Step 4: Commit**

```bash
git add lib/hooks/use-workouts.ts
git commit -m "feat(workouts): add optimistic template CRUD hooks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Workout Schedule - Add Optimistic Hooks

**Files:**
- Modify: `lib/hooks/use-workout-schedule.ts`

**Step 1: Add useCreateScheduledWorkoutOptimistic after line 95**

```typescript
/**
 * Hook with optimistic create for scheduled workouts
 */
export function useCreateScheduledWorkoutOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      template_id: string | null
      scheduled_date: string
      notes?: string
    }) => {
      const response = await fetch('/api/scheduled-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule workout')
      }
      const result = await response.json()
      return result.scheduledWorkout as ScheduledWorkout
    },
    onMutate: async (newSchedule) => {
      await queryClient.cancelQueries({ queryKey: ['scheduled-workouts'] })
      await queryClient.cancelQueries({ queryKey: ['scheduled-workout'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['scheduled-workouts'] })

      const optimisticSchedule: ScheduledWorkout = {
        id: `temp-${Date.now()}`,
        user_id: '',
        template_id: newSchedule.template_id,
        scheduled_date: newSchedule.scheduled_date,
        status: 'scheduled',
        completed_workout_id: null,
        notes: newSchedule.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueriesData({ queryKey: ['scheduled-workouts'] }, (old: ScheduledWorkout[] | undefined) => {
        if (!old) return [optimisticSchedule]
        return [...old, optimisticSchedule]
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}
```

**Step 2: Add useUpdateScheduledWorkoutOptimistic after line 132**

```typescript
/**
 * Hook with optimistic update for scheduled workouts
 */
export function useUpdateScheduledWorkoutOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string
      template_id?: string | null
      scheduled_date?: string
      status?: 'scheduled' | 'completed' | 'skipped'
      notes?: string
      completed_workout_id?: string | null
    }) => {
      const response = await fetch(`/api/scheduled-workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update scheduled workout')
      }
      const result = await response.json()
      return result.scheduledWorkout as ScheduledWorkout
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['scheduled-workouts'] })
      await queryClient.cancelQueries({ queryKey: ['scheduled-workout'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['scheduled-workouts'] })

      queryClient.setQueriesData({ queryKey: ['scheduled-workouts'] }, (old: ScheduledWorkout[] | undefined) => {
        if (!old) return []
        return old.map((workout) =>
          workout.id === id ? { ...workout, ...updates, updated_at: new Date().toISOString() } : workout
        )
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}
```

**Step 3: Add useDeleteScheduledWorkoutOptimistic after line 156**

```typescript
/**
 * Hook with optimistic delete for scheduled workouts
 */
export function useDeleteScheduledWorkoutOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scheduled-workouts/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete scheduled workout')
      }
      return { id }
    },
    onMutate: async (workoutId) => {
      await queryClient.cancelQueries({ queryKey: ['scheduled-workouts'] })
      await queryClient.cancelQueries({ queryKey: ['scheduled-workout'] })

      const previousData = queryClient.getQueriesData({ queryKey: ['scheduled-workouts'] })

      queryClient.setQueriesData({ queryKey: ['scheduled-workouts'] }, (old: ScheduledWorkout[] | undefined) => {
        if (!old) return []
        return old.filter((workout) => workout.id !== workoutId)
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-workout'] })
    },
  })
}
```

**Step 4: Commit**

```bash
git add lib/hooks/use-workout-schedule.ts
git commit -m "feat(workout-schedule): add optimistic CRUD hooks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Routines - Add Optimistic Hooks

**Files:**
- Modify: `lib/hooks/use-routines.ts`

**Step 1: Add useCreateRoutineTemplateOptimistic after line 342**

```typescript
/**
 * Hook with optimistic create for routine templates
 */
export function useCreateRoutineTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRoutineTemplate,
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineTemplates.all })

      const previousTemplates = queryClient.getQueryData<{ templates: RoutineTemplate[] }>(
        queryKeys.routineTemplates.lists()
      )

      const optimisticTemplate: RoutineTemplate = {
        id: `temp-${Date.now()}`,
        name: newTemplate.name,
        description: newTemplate.description || null,
        time_of_day: newTemplate.time_of_day,
        duration_minutes: newTemplate.duration_minutes || null,
        icon: newTemplate.icon || null,
        color: newTemplate.color || null,
        is_default: false,
        steps: newTemplate.steps || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as RoutineTemplate

      queryClient.setQueriesData({ queryKey: queryKeys.routineTemplates.lists() }, (old: { templates: RoutineTemplate[] } | undefined) => {
        if (!old) return { templates: [optimisticTemplate] }
        return { templates: [optimisticTemplate, ...old.templates] }
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.routineTemplates.lists(), context.previousTemplates)
      }
      toast.error(error.message || 'Failed to create routine')
    },
    onSuccess: () => {
      toast.success('Routine created')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
    },
  })
}
```

**Step 2: Add useUpdateRoutineTemplateOptimistic after line 362**

```typescript
/**
 * Hook with optimistic update for routine templates
 */
export function useUpdateRoutineTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoutineTemplateInput }) =>
      updateRoutineTemplate(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineTemplates.all })

      const previousTemplates = queryClient.getQueryData<{ templates: RoutineTemplate[] }>(
        queryKeys.routineTemplates.lists()
      )

      queryClient.setQueriesData({ queryKey: queryKeys.routineTemplates.lists() }, (old: { templates: RoutineTemplate[] } | undefined) => {
        if (!old) return { templates: [] }
        return {
          templates: old.templates.map((template) =>
            template.id === id ? { ...template, ...data, updated_at: new Date().toISOString() } : template
          )
        }
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.routineTemplates.lists(), context.previousTemplates)
      }
      toast.error(error.message || 'Failed to update routine')
    },
    onSuccess: () => {
      toast.success('Routine updated')
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.detail(variables.id) })
    },
  })
}
```

**Step 3: Add useDeleteRoutineTemplateOptimistic after line 380**

```typescript
/**
 * Hook with optimistic delete for routine templates
 */
export function useDeleteRoutineTemplateOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRoutineTemplate,
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineTemplates.all })

      const previousTemplates = queryClient.getQueryData<{ templates: RoutineTemplate[] }>(
        queryKeys.routineTemplates.lists()
      )

      queryClient.setQueriesData({ queryKey: queryKeys.routineTemplates.lists() }, (old: { templates: RoutineTemplate[] } | undefined) => {
        if (!old) return { templates: [] }
        return { templates: old.templates.filter((template) => template.id !== templateId) }
      })

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(queryKeys.routineTemplates.lists(), context.previousTemplates)
      }
      toast.error(error.message || 'Failed to delete routine')
    },
    onSuccess: () => {
      toast.success('Routine deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routineTemplates.all })
    },
  })
}
```

**Step 4: Add useCompleteRoutineOptimistic after line 404**

```typescript
/**
 * Hook with optimistic complete for routines
 */
export function useCompleteRoutineOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: completeRoutine,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routines.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.routineStreaks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.routineStats.all })

      const previousRoutines = queryClient.getQueryData<{ completions: RoutineCompletion[] }>(
        queryKeys.routines.lists()
      )
      const previousStreak = queryClient.getQueryData<{ streak: UserRoutineStreak }>(
        queryKeys.routineStreaks.current()
      )
      const previousStats = queryClient.getQueryData<{ stats: UserRoutineStats }>(
        queryKeys.routineStats.current()
      )

      // Optimistically add completion
      const optimisticCompletion: RoutineCompletion = {
        id: `temp-${Date.now()}`,
        template_id: data.template_id,
        completed_at: new Date().toISOString(),
        duration_minutes: data.duration_minutes || null,
        steps_completed: data.steps_completed,
        xp_earned: data.steps_completed.length * 10,
        notes: data.notes || null,
        mood: data.mood || null,
        created_at: new Date().toISOString(),
      } as RoutineCompletion

      queryClient.setQueriesData({ queryKey: queryKeys.routines.lists() }, (old: { completions: RoutineCompletion[] } | undefined) => {
        if (!old) return { completions: [optimisticCompletion] }
        return { completions: [optimisticCompletion, ...old.completions] }
      })

      // Optimistically update streak
      if (previousStreak?.streak) {
        queryClient.setQueryData(queryKeys.routineStreaks.current(), {
          streak: {
            ...previousStreak.streak,
            current_streak: previousStreak.streak.current_streak + 1,
          }
        })
      }

      // Optimistically update stats
      if (previousStats?.stats) {
        const xpEarned = data.steps_completed.length * 10
        queryClient.setQueryData(queryKeys.routineStats.current(), {
          stats: {
            ...previousStats.stats,
            total_xp: previousStats.stats.total_xp + xpEarned,
            routines_completed: previousStats.stats.routines_completed + 1,
          }
        })
      }

      return { previousRoutines, previousStreak, previousStats }
    },
    onError: (error, _, context) => {
      if (context?.previousRoutines) {
        queryClient.setQueryData(queryKeys.routines.lists(), context.previousRoutines)
      }
      if (context?.previousStreak) {
        queryClient.setQueryData(queryKeys.routineStreaks.current(), context.previousStreak)
      }
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.routineStats.current(), context.previousStats)
      }
      toast.error(error.message || 'Failed to complete routine')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routines.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStreaks.current() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineStats.current() })
      queryClient.invalidateQueries({ queryKey: queryKeys.routineChallenges.list() })
    },
  })
}
```

**Step 5: Commit**

```bash
git add lib/hooks/use-routines.ts
git commit -m "feat(routines): add optimistic CRUD and complete hooks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Health Tracking - Add Optimistic Hooks

**Files:**
- Modify: `lib/hooks/use-health-tracking.ts`

**Step 1: Add useLogWeightOptimistic after line 119**

```typescript
/**
 * Hook with optimistic update for logging weight
 */
export function useLogWeightOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logWeight,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.weightLogs.all })

      const previousData = queryClient.getQueryData<WeightLog[]>(queryKeys.weightLogs.lists())

      const optimisticLog: WeightLog = {
        id: `temp-${Date.now()}`,
        user_id: '',
        weight: data.weight,
        date: data.date,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueriesData({ queryKey: queryKeys.weightLogs.lists() }, (old: WeightLog[] | undefined) => {
        if (!old) return [optimisticLog]
        return [optimisticLog, ...old]
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.weightLogs.lists(), context.previousData)
      }
      toast.error(error.message || 'Failed to log weight')
    },
    onSuccess: (data) => {
      toast.success('Weight logged!', {
        description: `${data.weight} kg on ${data.date}`,
      })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.weightLogs.all,
        refetchType: 'all',
      })
    },
  })
}
```

**Step 2: Add useDeleteWeightLogOptimistic after line 149**

```typescript
/**
 * Hook with optimistic delete for weight logs
 */
export function useDeleteWeightLogOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWeightLog,
    onMutate: async (logId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.weightLogs.all })

      const previousData = queryClient.getQueryData<WeightLog[]>(queryKeys.weightLogs.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.weightLogs.lists() }, (old: WeightLog[] | undefined) => {
        if (!old) return []
        return old.filter((log) => log.id !== logId)
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.weightLogs.lists(), context.previousData)
      }
      toast.error('Failed to delete weight entry')
    },
    onSuccess: () => {
      toast.success('Weight entry deleted')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.weightLogs.all,
        refetchType: 'all',
      })
    },
  })
}
```

**Step 3: Add useSetWaterOptimistic after line 283**

```typescript
/**
 * Hook with optimistic set for water log
 */
export function useSetWaterOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setWater,
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.waterLogs.all })

      const todayDate = data.date || new Date().toISOString().split('T')[0]
      const previousData = queryClient.getQueryData<WaterLogResponse>(
        queryKeys.waterLogs.today(todayDate)
      )

      if (previousData) {
        queryClient.setQueryData<WaterLogResponse>(
          queryKeys.waterLogs.today(todayDate),
          {
            ...previousData,
            waterLog: {
              ...previousData.waterLog,
              amount_ml: data.amount_ml,
            },
          }
        )
      }

      return { previousData, todayDate }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.waterLogs.today(context.todayDate),
          context.previousData
        )
      }
      toast.error('Failed to set water')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.waterLogs.all,
        refetchType: 'all',
      })
    },
  })
}
```

**Step 4: Add useToggleFavoriteOptimistic after line 377**

```typescript
/**
 * Hook with optimistic toggle for favorites
 */
export function useToggleFavoriteOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedFoods.all })

      const previousData = queryClient.getQueryData<SavedFood[]>(queryKeys.savedFoods.lists())

      queryClient.setQueriesData({ queryKey: queryKeys.savedFoods.lists() }, (old: SavedFood[] | undefined) => {
        if (!old) return []
        return old.map((food) =>
          food.id === id ? { ...food, is_favorite } : food
        )
      })

      return { previousData }
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.savedFoods.lists(), context.previousData)
      }
      toast.error('Failed to update favorite')
    },
    onSuccess: (data) => {
      toast.success(data.is_favorite ? 'Added to favorites' : 'Removed from favorites')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savedFoods.all,
        refetchType: 'all',
      })
    },
  })
}
```

**Step 5: Commit**

```bash
git add lib/hooks/use-health-tracking.ts
git commit -m "feat(health-tracking): add optimistic hooks for weight, water, favorites

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Meals - Add useUpdateCalorieGoalOptimistic

**Files:**
- Modify: `lib/hooks/use-meals.ts:371-390`

**Step 1: Add useUpdateCalorieGoalOptimistic after line 390**

```typescript
/**
 * Hook with optimistic update for calorie goal
 */
export function useUpdateCalorieGoalOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCalorieGoal,
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calorieGoal.all })

      const previousGoal = queryClient.getQueryData<CalorieGoal | null>(
        queryKeys.calorieGoal.detail()
      )

      if (previousGoal) {
        queryClient.setQueryData<CalorieGoal>(
          queryKeys.calorieGoal.detail(),
          { ...previousGoal, ...updates }
        )
      } else {
        queryClient.setQueryData<CalorieGoal>(
          queryKeys.calorieGoal.detail(),
          {
            daily_calories: updates.daily_calories || 2000,
            protein_target: updates.protein_target,
            carbs_target: updates.carbs_target,
            fat_target: updates.fat_target,
          }
        )
      }

      return { previousGoal }
    },
    onError: (error, _, context) => {
      if (context?.previousGoal !== undefined) {
        queryClient.setQueryData(queryKeys.calorieGoal.detail(), context.previousGoal)
      }
      toast.error(error.message || 'Failed to update goals')
    },
    onSuccess: () => {
      toast.success('Goals updated successfully!')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieGoal.all,
        refetchType: 'all',
      })
    },
  })
}
```

**Step 2: Commit**

```bash
git add lib/hooks/use-meals.ts
git commit -m "feat(meals): add useUpdateCalorieGoalOptimistic hook

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Export New Hooks from Index

**Files:**
- Modify: `lib/hooks/index.ts`

**Step 1: Verify and update exports**

Check if index.ts exists and add exports for all new optimistic hooks. If the file re-exports from individual hook files, the new exports should be automatic.

**Step 2: Commit**

```bash
git add lib/hooks/index.ts
git commit -m "chore(hooks): export new optimistic mutation hooks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Final Verification

**Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No linting errors (or only pre-existing ones)

**Step 3: Create final commit if needed**

```bash
git add .
git commit -m "fix: resolve any remaining type or lint issues

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan adds **23 new optimistic mutation hooks** across 9 files:

| File | New Hooks |
|------|-----------|
| `use-expenses.ts` | `useUpdateExpenseOptimistic` |
| `use-goals.ts` | `useCreateGoalOptimistic` |
| `use-budgets.ts` | `useCreateBudgetOptimistic`, `useDeleteBudgetOptimistic` |
| `use-recurring-expenses.ts` | `useCreateRecurringExpenseOptimistic`, `useUpdateRecurringExpenseOptimistic`, `useDeleteRecurringExpenseOptimistic`, `useSkipRecurringExpenseDateOptimistic` |
| `use-workouts.ts` | `useCreateTemplateOptimistic`, `useUpdateTemplateOptimistic`, `useDeleteTemplateOptimistic` |
| `use-workout-schedule.ts` | `useCreateScheduledWorkoutOptimistic`, `useUpdateScheduledWorkoutOptimistic`, `useDeleteScheduledWorkoutOptimistic` |
| `use-routines.ts` | `useCreateRoutineTemplateOptimistic`, `useUpdateRoutineTemplateOptimistic`, `useDeleteRoutineTemplateOptimistic`, `useCompleteRoutineOptimistic` |
| `use-health-tracking.ts` | `useLogWeightOptimistic`, `useDeleteWeightLogOptimistic`, `useSetWaterOptimistic`, `useToggleFavoriteOptimistic` |
| `use-meals.ts` | `useUpdateCalorieGoalOptimistic` |
