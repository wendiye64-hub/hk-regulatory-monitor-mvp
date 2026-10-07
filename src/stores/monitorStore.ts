import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PriorityAlert, RegulatorInScope } from '@/types';
import { useDirectoryStore } from './directoryStore';

export const useMonitorStore = defineStore('monitor', () => {
  const directoryStore = useDirectoryStore();

  // Top navigation inside Frameworks & Monitor
  const currentTab = ref<'news-feed' | 'watchlist'>('news-feed');

  // News Feed visual layout mode: 'grid' (default 3 per row) or 'table'
  const feedLayoutMode = ref<'grid' | 'table'>('grid');

  // History modal / drawer state for dismissed or reviewed alerts
  const isHistoryDrawerOpen = ref<boolean>(false);

  // Watchlist configuration modal state
  const isWatchlistSearchModalOpen = ref<boolean>(false);

  // Acknowledged alert ids animating out
  const acknowledgingAlertIds = ref<Set<string>>(new Set());

  // Dismissed alert ids animating out
  const dismissingAlertIds = ref<Set<string>>(new Set());

  // Dismissed alerts tracking
  const dismissedAlerts = ref<PriorityAlert[]>([]);

  // Action: Acknowledge Alert (with synchronization into directoryStore.addBookmark)
  const acknowledgeAlert = (alert: PriorityAlert) => {
    acknowledgingAlertIds.value.add(alert.id);

    // Call directoryStore.addBookmark to sync bookmark directly
    directoryStore.addBookmark(alert);

    // Remove animation class after animation completes
    setTimeout(() => {
      acknowledgingAlertIds.value.delete(alert.id);
    }, 600);
  };

  // Action: Dismiss Alert
  const dismissAlert = (alert: PriorityAlert, reason?: string) => {
    dismissingAlertIds.value.add(alert.id);
    const existing = dismissedAlerts.value.find((a) => a.id === alert.id);
    if (!existing) {
      dismissedAlerts.value.unshift({
        ...alert,
        status: 'dismissed',
        actionDetails: reason || 'Dismissed from live News Feed view',
        actionDate: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      });
    }

    setTimeout(() => {
      dismissingAlertIds.value.delete(alert.id);
    }, 600);
  };

  // Action: Restore Alert from History
  const restoreAlert = (alertId: string) => {
    dismissedAlerts.value = dismissedAlerts.value.filter((a) => a.id !== alertId);
  };

  return {
    currentTab,
    feedLayoutMode,
    isHistoryDrawerOpen,
    isWatchlistSearchModalOpen,
    acknowledgingAlertIds,
    dismissingAlertIds,
    dismissedAlerts,
    acknowledgeAlert,
    dismissAlert,
    restoreAlert,
  };
});
