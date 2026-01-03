import { useState } from 'react';
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/lib/hooks';
import type { Tables } from '@/lib/supabase/database.types';
import { getNowInGMT7 } from '@/lib/timezone';

type SavingsGoal = Tables<'savings_goals'>;

export interface GoalFormData {
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  icon: string;
}

export const GOAL_ICONS = ['🎯', '🏠', '✈️', '🚗', '💰', '🎓', '💍', '🎉'];

export function useGoalOperations() {
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    icon: '🎯',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      icon: '🎯',
    });
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          updates: {
            name: formData.name,
            target_amount: parseFloat(formData.targetAmount),
            current_amount: parseFloat(formData.currentAmount || '0'),
            deadline: formData.deadline || null,
            icon: formData.icon,
          },
        });
      } else {
        await createGoalMutation.mutateAsync({
          name: formData.name,
          target_amount: parseFloat(formData.targetAmount),
          current_amount: parseFloat(formData.currentAmount || '0'),
          deadline: formData.deadline || null,
          icon: formData.icon,
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.target_amount.toString(),
      currentAmount: (goal.current_amount || 0).toString(),
      deadline: goal.deadline || '',
      icon: goal.icon || '🎯',
    });
    setShowForm(true);
  };

  const handleDeleteClick = (goal: SavingsGoal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;

    try {
      await deleteGoalMutation.mutateAsync(goalToDelete.id);
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleAddProgress = async (goal: SavingsGoal, amount: number) => {
    try {
      await updateGoalMutation.mutateAsync({
        id: goal.id,
        updates: {
          current_amount: (goal.current_amount || 0) + amount,
        },
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const openNewGoalForm = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      icon: '🎯',
    });
    setShowForm(true);
  };

  return {
    // State
    showForm,
    setShowForm,
    editingGoal,
    deleteDialogOpen,
    setDeleteDialogOpen,
    goalToDelete,
    formData,
    setFormData,

    // Actions
    handleSubmit,
    handleEdit,
    handleDeleteClick,
    handleConfirmDelete,
    handleAddProgress,
    openNewGoalForm,
    resetForm,

    // Mutations
    createGoalMutation,
    updateGoalMutation,
    deleteGoalMutation,
  };
}

// Helper functions for calculations
export function calculateGoalProgress(goal: SavingsGoal) {
  const progress = ((goal.current_amount || 0) / goal.target_amount) * 100;
  const remaining = goal.target_amount - (goal.current_amount || 0);
  const isCompleted = progress >= 100;

  return { progress, remaining, isCompleted };
}

export function calculateDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;

  return Math.ceil(
    (new Date(deadline).getTime() - getNowInGMT7().getTime()) / (1000 * 60 * 60 * 24)
  );
}
