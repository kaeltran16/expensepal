'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hapticFeedback } from '@/lib/utils';
import { Save, X } from 'lucide-react';
import type { GoalFormData } from '@/lib/hooks/use-goal-operations';
import { GOAL_ICONS } from '@/lib/hooks/use-goal-operations';

interface SavingsGoalFormProps {
  formData: GoalFormData;
  setFormData: (data: GoalFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
}

export function SavingsGoalForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing,
  isSubmitting,
}: SavingsGoalFormProps) {
  return (
    <div className="ios-card p-5">
      <h3 className="ios-headline mb-4">
        {isEditing ? 'Edit Goal' : 'New Goal'}
      </h3>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Icon Selector */}
        <div>
          <Label className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
            Goal Icon
          </Label>
          <div className="flex gap-2 flex-wrap">
            {GOAL_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => {
                  hapticFeedback('light');
                  setFormData({ ...formData, icon });
                }}
                className={`text-2xl w-12 h-12 rounded-xl ios-press transition-all ${
                  formData.icon === icon
                    ? 'bg-primary/20 scale-105 ring-2 ring-primary'
                    : 'bg-secondary'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Goal Name */}
        <div>
          <Label htmlFor="name" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
            Goal Name
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Vacation to Bali"
            className="ios-body min-h-touch"
            required
          />
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="targetAmount" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
              Target (₫)
            </Label>
            <Input
              id="targetAmount"
              type="number"
              inputMode="numeric"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              placeholder="10,000,000"
              className="ios-body min-h-touch"
              required
            />
          </div>

          <div>
            <Label htmlFor="currentAmount" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
              Current (₫)
            </Label>
            <Input
              id="currentAmount"
              type="number"
              inputMode="numeric"
              value={formData.currentAmount}
              onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
              placeholder="0"
              className="ios-body min-h-touch"
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <Label htmlFor="deadline" className="ios-caption text-muted-foreground uppercase tracking-wide mb-2 block">
            Deadline (Optional)
          </Label>
          <Input
            id="deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            className="ios-body min-h-touch"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            className="flex-1 ios-press min-h-touch gap-2"
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4" />
            {isEditing ? 'Update Goal' : 'Create Goal'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              hapticFeedback('light');
              onCancel();
            }}
            className="ios-press min-h-touch px-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
