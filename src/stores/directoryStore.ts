import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RegulatoryDirectoryItem, RegulationItem, PriorityAlert } from '@/types';
import { GLOBAL_REGULATORY_DIRECTORY } from '@/data/directoryData';

const STORAGE_KEY = 'wizpresso_directory_acknowledged_bookmarks_v3';

function loadInitialBookmarks(): RegulatoryDirectoryItem[] {
  // Clear obsolete localStorage entries from previous versions
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('wizpresso_directory_bookmarks_v2');
      localStorage.removeItem('wizpresso_directory_bookmarks');
    } catch {
      // ignore
    }
  }

  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item: any) => item && item.isAcknowledged === true);
      }
    }
  } catch (e) {
    console.warn('Failed to load bookmarks from storage', e);
  }

  // Initial baseline bookmarks for immediate usability
  const sampleInitial = GLOBAL_REGULATORY_DIRECTORY.slice(0, 3).map((item) => ({
    ...item,
    status: 'Following' as const,
    diligenceStatus: 'Monitored' as const,
    isAcknowledged: true,
  }));

  return sampleInitial;
}

export const useDirectoryStore = defineStore('directory', () => {
  const initialBookmarks = loadInitialBookmarks();
  const bookmarkedItems = ref<RegulatoryDirectoryItem[]>(initialBookmarks);
  // Default to bookmarks active view
  const isBookmarksActive = ref<boolean>(true);

  const persist = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarkedItems.value));
      }
    } catch (e) {
      console.warn('Failed to save bookmarks to storage', e);
    }
  };

  const isBookmarked = (id: string, refNum?: string, title?: string): boolean => {
    const targetId = id.trim().toLowerCase();
    const targetRef = refNum ? refNum.trim().toLowerCase() : '';
    const targetTitle = title ? title.trim().toLowerCase() : '';

    return bookmarkedItems.value.some((b) => {
      if (b.id.toLowerCase() === targetId) return true;
      if (targetRef && b.referenceNumber && b.referenceNumber.trim().toLowerCase() === targetRef) return true;
      if (targetTitle && b.title && b.title.trim().toLowerCase() === targetTitle) return true;
      return false;
    });
  };

  const addBookmark = (item: RegulationItem | PriorityAlert | RegulatoryDirectoryItem) => {
    const targetId = 'regulationId' in item && item.regulationId ? item.regulationId : item.id;
    const targetRef = 'referenceNumber' in item && item.referenceNumber ? item.referenceNumber.trim().toLowerCase() : '';
    const targetTitle = item.title.trim().toLowerCase();

    const existingIndex = bookmarkedItems.value.findIndex(
      (b) =>
        b.id.toLowerCase() === targetId.toLowerCase() ||
        (targetRef && b.referenceNumber && b.referenceNumber.trim().toLowerCase() === targetRef) ||
        b.title.trim().toLowerCase() === targetTitle
    );

    const isAck = Boolean((item as any).isAcknowledged);

    if (existingIndex >= 0) {
      bookmarkedItems.value[existingIndex].status = 'Following';
      bookmarkedItems.value[existingIndex].diligenceStatus = 'Monitored';
      if ((item as any).isAcknowledged !== undefined) {
        bookmarkedItems.value[existingIndex].isAcknowledged = isAck;
      }
      isBookmarksActive.value = true;
      persist();
      return;
    }

    let newItem: RegulatoryDirectoryItem;
    if ('status' in item && 'referenceNumber' in item) {
      newItem = {
        ...(item as RegulatoryDirectoryItem),
        status: 'Following',
        diligenceStatus: 'Monitored',
        isAcknowledged: isAck,
      };
    } else if ('referenceNumber' in item) {
      newItem = {
        ...(item as RegulationItem),
        status: 'Following',
        diligenceStatus: 'Monitored',
        isAcknowledged: isAck,
        whyRelevantExplanation: (item as RegulationItem).executiveSummary,
      };
    } else {
      const alert = item as PriorityAlert;
      newItem = {
        id: alert.regulationId || alert.id,
        title: alert.title,
        referenceNumber: `REF-${alert.regulatorAcronym || 'REG'}-2026`,
        docType: 'Circular',
        regulator: alert.regulator,
        regulatorAcronym: alert.regulatorAcronym,
        jurisdiction: alert.jurisdiction,
        category: alert.category || 'Financial Services & Capital Markets',
        themes: alert.themes || ['Operational resilience and incident reporting'],
        publishDate: alert.publishDate,
        effectiveDate: alert.effectiveDate,
        aiRelevanceScore: 92,
        materiality: alert.materiality,
        diligenceStatus: 'Monitored',
        owner: 'Ivan Choy',
        officialUrl: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/',
        executiveSummary: alert.aiRelevanceSummary,
        operationalImpact: 'Acknowledged and added to in-scope surveillance bookmarks.',
        affectedBusinessUnits: ['Compliance', 'Risk Management', 'Legal'],
        authenticExcerpt: alert.aiRelevanceSummary,
        auditTimeline: [
          {
            id: `audit-bm-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
            action: 'Acknowledged & Bookmarked from Priority Alert Feed',
            performedBy: 'Ivan Choy (Lead)',
            details: 'Supervisory item acknowledged and marked in bookmarks.',
          },
        ],
        status: 'Following',
        whyRelevantExplanation: alert.aiRelevanceSummary,
        isAcknowledged: isAck,
      };
    }

    bookmarkedItems.value.unshift(newItem);
    isBookmarksActive.value = true;
    persist();
  };

  const removeBookmark = (id: string, refNum?: string, title?: string, alertId?: string) => {
    const targetId = id.trim().toLowerCase();
    const targetRef = refNum ? refNum.trim().toLowerCase() : '';
    const targetTitle = title ? title.trim().toLowerCase() : '';
    const targetAlertId = alertId ? alertId.trim().toLowerCase() : '';

    bookmarkedItems.value = bookmarkedItems.value.filter((b) => {
      if (b.id.toLowerCase() === targetId) return false;
      if (targetAlertId && b.id.toLowerCase() === targetAlertId) return false;
      if (targetRef && b.referenceNumber && b.referenceNumber.trim().toLowerCase() === targetRef) return false;
      if (targetTitle && b.title && b.title.trim().toLowerCase() === targetTitle) return false;
      return true;
    });
    persist();
  };

  const toggleBookmarksActive = () => {
    isBookmarksActive.value = !isBookmarksActive.value;
  };

  const setBookmarksActive = (val: boolean) => {
    isBookmarksActive.value = val;
  };

  const toggleBookmark = (item: RegulatoryDirectoryItem | RegulationItem | PriorityAlert): boolean => {
    if (isBookmarked(item.id, (item as any).referenceNumber, item.title)) {
      removeBookmark(item.id, (item as any).referenceNumber, item.title);
      return false;
    } else {
      addBookmark(item);
      return true;
    }
  };

  return {
    isBookmarksActive,
    bookmarkedItems,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    toggleBookmarksActive,
    setBookmarksActive,
  };
});
