'use client'

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { hapticFeedback } from '@/lib/utils';
import { Plus, Target } from 'lucide-react';
import { useGoals } from '@/lib/hooks';
import { useGoalOperations } from '@/lib/hooks/use-goal-operations';
import {
  SavingsGoalForm,
  SavingsGoalCard,
  DeleteGoalDialog,
} from '@/components/goals';

export function SavingsGoals() {
  // Fetch goals using TanStack Query
  const { data: goals = [], isLoading: loading } = useGoals();

  // Use the custom hook for all operations
  const {
    showForm,
    editingGoal,
    deleteDialogOpen,
    setDeleteDialogOpen,
    goalToDelete,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDeleteClick,
    handleConfirmDelete,
    handleAddProgress,
    openNewGoalForm,
    resetForm,
    createGoalMutation,
    updateGoalMutation,
    deleteGoalMutation,
  } = useGoalOperations();

  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="ios-caption text-muted-foreground">Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Goal Button */}
      {!showForm && (
        <Button
          onClick={() => {
            hapticFeedback('light');
            openNewGoalForm();
          }}
          className="w-full ios-press min-h-touch gap-2"
        >
          <Plus className="h-5 w-5" />
          Add New Goal
        </Button>
      )}

      {/* Goal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <SavingsGoalForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              isEditing={!!editingGoal}
              isSubmitting={createGoalMutation.isPending || updateGoalMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-16 w-16 text-primary" />}
          title="No Goals Yet"
          description="Create your first savings goal to start tracking your progress"
          animationVariant="pulse"
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              index={index}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onAddProgress={handleAddProgress}
              isUpdating={updateGoalMutation.isPending}
              isDeleting={deleteGoalMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteGoalDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        goalToDelete={goalToDelete}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
