import { celebrateSuccess } from '@/components/confetti';
import { hapticFeedback } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { useEmailSync } from './index';

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export function useSyncOperations() {
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncDetail, setSyncDetail] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const emailSyncMutation = useEmailSync();

  const handleSync = async () => {
    setSyncStatus('loading');
    setSyncProgress('Connecting to email...');
    setSyncDetail('This may take a few moments');
    hapticFeedback('light');

    try {
      const data = await emailSyncMutation.mutateAsync(7, {
        onSuccess: () => {
          // Suppress default toast - we'll show custom ones
        },
        onError: () => {
          // Suppress default toast
        },
      });

      setSyncProgress('Processing emails...');
      setSyncDetail(`Found ${data.newExpenses || 0} new expense(s)`);

      setLastSynced(new Date());
      setSyncStatus('success');
      setSyncProgress('Sync complete!');

      const mealsCount = (data as any).mealsCreated || 0;
      const detailMessage =
        mealsCount > 0
          ? `Added ${data.newExpenses || 0} expense(s) & ${mealsCount} meal(s)`
          : `Added ${data.newExpenses || 0} new expense(s)`;
      setSyncDetail(detailMessage);

      hapticFeedback('medium');

      const toastMessage =
        mealsCount > 0
          ? `Synced ${data.newExpenses || 0} expenses + ${mealsCount} meals 🍔`
          : `Synced ${data.newExpenses || 0} new expenses`;
      toast.success(toastMessage);

      if (data.newExpenses > 0) {
        celebrateSuccess();
      }

      // Note: Meals will auto-refresh via TanStack Query invalidation
      // (handled in useEmailSync hook)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress('');
        setSyncDetail('');
      }, 3000);
    } catch (error) {
      console.error('Error syncing:', error);
      setSyncStatus('error');
      setSyncProgress('Sync failed');
      setSyncDetail('Please check your connection and try again');
      toast.error('Failed to sync emails');

      // Hide error message after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncProgress('');
        setSyncDetail('');
      }, 5000);
    }
  };

  return {
    syncProgress,
    syncStatus,
    syncDetail,
    lastSynced,
    handleSync,
    isSyncing: emailSyncMutation.isPending,
  };
}
