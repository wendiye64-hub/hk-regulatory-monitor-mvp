<script setup lang="ts">
import { ref, computed } from 'vue';
import { Compass, CheckCircle2 } from 'lucide-vue-next';
import type {
  RegulatoryDirectoryItem,
  RegulatoryDirectoryStatus,
  DirectoryFilterState,
  RegulationItem,
  RegulatorInScope,
} from '@/types';
import DirectoryFilterPanel from '@/components/directory/DirectoryFilterPanel.vue';
import DirectoryResultsTable from '@/components/directory/DirectoryResultsTable.vue';
import { useDirectoryStore } from '@/stores/directoryStore';
import { useTaskStore } from '@/stores/taskStore';
import { GLOBAL_REGULATORY_DIRECTORY } from '@/data/directoryData';

const directoryStore = useDirectoryStore();
const taskStore = useTaskStore();

const props = defineProps<{
  followedRegulationIds?: string[];
  regulators?: RegulatorInScope[];
  regulations?: RegulationItem[];
}>();

const emit = defineEmits<{
  (e: 'selectRegulation', reg: RegulationItem): void;
  (e: 'importToDiligence', reg: RegulatoryDirectoryItem): void;
  (e: 'bulkImportToDiligence', regs: RegulatoryDirectoryItem[]): void;
  (e: 'toggleFollowRegulator', regulatorAcronym: string, targetFollow: boolean): void;
  (e: 'toggleFollowRegulation', reg: RegulatoryDirectoryItem, targetFollow: boolean): void;
  (e: 'bulkFollowRegulations', regs: RegulatoryDirectoryItem[], targetFollow: boolean): void;
  (e: 'showToast', title: string, message: string, type: 'success' | 'info' | 'warning' | 'error'): void;
}>();

// Track whether user clicked "Apply" when Bookmarks is disabled (defaults to false so unselected Bookmarks requires Apply)
const hasAppliedFilters = ref(false);

// Active Filter State (from panel, defaults to 'All' date preset)
const activeFilters = ref<DirectoryFilterState | null>({
  datePreset: 'All',
  startDate: '01/01/2020',
  endDate: '28/09/2026',
  jurisdiction: 'All',
  theme: 'All',
  category: 'All',
  regulatorCandidates: [],
  keywordCandidates: [],
  keywordMode: 'OR',
});

// Date Helpers
const parseDDMMYYYY = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
};

const parseISODate = (isoStr: string): Date | null => {
  if (!isoStr) return null;
  const parts = isoStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(isoStr);
};

// Global Directory Catalog from in-scope regulations and static directory catalog, deduplicated by referenceNumber and title
const rawAllDirectoryItems = computed<RegulatoryDirectoryItem[]>(() => {
  const map = new Map<string, RegulatoryDirectoryItem>();
  const seenKeys = new Map<string, string>(); // canonical key -> map item id

  const getCanonicalKey = (item: { referenceNumber?: string; title: string }) => {
    if (item.referenceNumber && item.referenceNumber.trim()) {
      return item.referenceNumber.trim().toLowerCase();
    }
    return item.title.trim().toLowerCase();
  };

  GLOBAL_REGULATORY_DIRECTORY.forEach((item) => {
    const key = getCanonicalKey(item);
    seenKeys.set(key, item.id);
    map.set(item.id, { ...item });
  });

  if (props.regulations && props.regulations.length > 0) {
    props.regulations.forEach((r) => {
      const key = getCanonicalKey(r);
      if (seenKeys.has(key)) {
        const existingId = seenKeys.get(key)!;
        const existing = map.get(existingId)!;
        map.set(existingId, {
          ...r,
          ...existing,
          status: existing.status === 'Following' || (r as any).status === 'Following' ? 'Following' : existing.status,
          diligenceStatus: existing.diligenceStatus === 'Monitored' || (r as any).diligenceStatus === 'Monitored' ? 'Monitored' : existing.diligenceStatus,
        });
      } else if (!map.has(r.id)) {
        seenKeys.set(key, r.id);
        map.set(r.id, {
          ...r,
          status: 'None' as RegulatoryDirectoryStatus,
          whyRelevantExplanation: r.whyRelevantExplanation || 'Live update detected from regulatory monitor feed.',
        });
      }
    });
  }

  return Array.from(map.values());
});

const synchedDirectory = computed<RegulatoryDirectoryItem[]>(() => {
  return rawAllDirectoryItems.value.map((item) => {
    // A regulation is "Following" if it is in bookmarkedItems
    const isBookmarked = directoryStore.isBookmarked(item.id, item.referenceNumber, item.title);
    const bookmarkedItem = directoryStore.bookmarkedItems.find(
      (b) =>
        b.id.toLowerCase() === item.id.toLowerCase() ||
        (item.referenceNumber && b.referenceNumber?.toLowerCase() === item.referenceNumber.toLowerCase()) ||
        b.title.toLowerCase() === item.title.toLowerCase()
    );

    return {
      ...item,
      status: (isBookmarked ? 'Following' : 'None') as RegulatoryDirectoryStatus,
      isAcknowledged: bookmarkedItem ? Boolean(bookmarkedItem.isAcknowledged) : false,
    };
  });
});

// Common filter routine for Date, Jurisdiction, Themes, Category
const applyDimensionFilters = (
  items: RegulatoryDirectoryItem[],
  filters: DirectoryFilterState | null
): RegulatoryDirectoryItem[] => {
  if (!filters) return items;
  let list = items;

  // 1. Date Range (strictly Publish Date)
  if (filters.datePreset !== 'All') {
    const start = parseDDMMYYYY(filters.startDate);
    const end = parseDDMMYYYY(filters.endDate);
    if (start && end) {
      end.setHours(23, 59, 59, 999);
      list = list.filter((r) => {
        const pDate = parseISODate(r.publishDate);
        if (!pDate) return true;
        return pDate >= start && pDate <= end;
      });
    }
  }

  // 2. Jurisdiction (Multi-Select Support)
  if (filters.selectedJurisdictions && filters.selectedJurisdictions.length > 0) {
    list = list.filter((r) => filters.selectedJurisdictions!.includes(r.jurisdiction));
  } else if (filters.jurisdiction && filters.jurisdiction !== 'All') {
    list = list.filter((r) => r.jurisdiction === filters.jurisdiction);
  }

  // 3. Theme (Multi-Select Support)
  if (filters.selectedThemes && filters.selectedThemes.length > 0) {
    list = list.filter((r) =>
      r.themes.some((t) =>
        filters.selectedThemes!.some(
          (sel) => t.toLowerCase().includes(sel.toLowerCase()) || sel.toLowerCase().includes(t.toLowerCase())
        )
      )
    );
  } else if (filters.theme && filters.theme !== 'All') {
    const tLower = filters.theme.toLowerCase();
    list = list.filter((r) =>
      r.themes.some((t) => t.toLowerCase().includes(tLower) || tLower.includes(t.toLowerCase()))
    );
  }

  // 4. Category (Multi-Select Support)
  if (filters.selectedCategories && filters.selectedCategories.length > 0) {
    list = list.filter((r) =>
      filters.selectedCategories!.some(
        (cat) =>
          r.category === cat ||
          (r.docType && r.docType.toLowerCase().includes(cat.toLowerCase())) ||
          (cat && cat.toLowerCase().includes(r.docType?.toLowerCase() || ''))
      )
    );
  } else if (filters.category && filters.category !== 'All') {
    list = list.filter(
      (r) =>
        r.category === filters.category ||
        r.docType.toLowerCase().includes(filters.category.toLowerCase())
    );
  }

  // 5. Linkage (Multi-Select Support)
  if (filters.selectedLinkages && filters.selectedLinkages.length > 0) {
    list = list.filter((r) => {
      const count = taskStore.getNewsLinkageCount(r.id, r.title, r.referenceNumber);
      const isLinked = count > 0;
      const matchLinked = filters.selectedLinkages!.includes('Linked to Tasks') && isLinked;
      const matchUnlinked = filters.selectedLinkages!.includes('Unlinked') && !isLinked;
      return matchLinked || matchUnlinked;
    });
  }

  return list;
};

// Core Computed Display Items:
// 1. If Bookmarks Active: Table displays acknowledged regulations filtered by Date, Jurisdiction, Themes, Category
// 2. If Bookmarks Disabled: Table is empty until user clicks Apply to query global catalog
const displayedRegulations = computed<RegulatoryDirectoryItem[]>(() => {
  if (directoryStore.isBookmarksActive) {
    return applyDimensionFilters(directoryStore.bookmarkedItems, activeFilters.value);
  }

  // Bookmarks is disabled: require user to explicitly apply filters
  if (!hasAppliedFilters.value) {
    return [];
  }

  let list = synchedDirectory.value;
  if (!activeFilters.value) return list;

  // Apply common dimension filters
  list = applyDimensionFilters(list, activeFilters.value);

  // 5. Regulators Candidate Pool
  if (activeFilters.value.regulatorCandidates.length > 0) {
    const allowedRegs = new Set(
      activeFilters.value.regulatorCandidates.map((acronym) => acronym.toUpperCase())
    );
    list = list.filter((r) => allowedRegs.has(r.regulatorAcronym.toUpperCase()));
  }

  // 6. Keywords Candidate Pool (OR vs AND)
  if (activeFilters.value.keywordCandidates.length > 0) {
    const kws = activeFilters.value.keywordCandidates.map((k) => k.toLowerCase().trim());
    list = list.filter((r) => {
      const fullCorpus = [
        r.title,
        r.referenceNumber,
        r.executiveSummary,
        r.operationalImpact,
        r.authenticExcerpt,
        ...r.themes,
      ]
        .join(' ')
        .toLowerCase();

      if (activeFilters.value?.keywordMode === 'AND') {
        return kws.every((kw) => fullCorpus.includes(kw));
      } else {
        return kws.some((kw) => fullCorpus.includes(kw));
      }
    });
  }

  return list;
});

// Handlers
const handleApplyFilters = (filters: DirectoryFilterState) => {
  hasAppliedFilters.value = true;
  activeFilters.value = filters;
};

const handleResetFilters = () => {
  hasAppliedFilters.value = false;
  activeFilters.value = {
    datePreset: 'All',
    startDate: '01/01/2020',
    endDate: '28/09/2026',
    jurisdiction: 'All',
    theme: 'All',
    category: 'All',
    regulatorCandidates: [],
    keywordCandidates: [],
    keywordMode: 'OR',
  };
};

const handleFilterChange = (partialFilters: Partial<DirectoryFilterState>) => {
  activeFilters.value = {
    datePreset: partialFilters.datePreset || 'All',
    startDate: partialFilters.startDate || '',
    endDate: partialFilters.endDate || '',
    jurisdiction: partialFilters.jurisdiction || 'All',
    theme: partialFilters.theme || 'All',
    category: partialFilters.category || 'All',
    regulatorCandidates: activeFilters.value?.regulatorCandidates || [],
    keywordCandidates: activeFilters.value?.keywordCandidates || [],
    keywordMode: activeFilters.value?.keywordMode || 'OR',
  };
};

const handleToggleBookmarks = (active: boolean) => {
  if (!active) {
    hasAppliedFilters.value = false;
  }
};

const handleSelectRegulation = (reg: RegulatoryDirectoryItem) => {
  emit('selectRegulation', reg);
};

const acknowledgedCount = computed(
  () => directoryStore.bookmarkedItems.filter((b) => b.isAcknowledged).length
);

const handleOpenImportDiligence = (reg: RegulatoryDirectoryItem) => {
  emit('importToDiligence', reg);
};

const handleOpenBulkImportDiligence = (regs: RegulatoryDirectoryItem[]) => {
  emit('bulkImportToDiligence', regs);
};

const handleToggleFrameworkFollow = (reg: RegulatoryDirectoryItem) => {
  const isCurrentlyBookmarked = directoryStore.isBookmarked(reg.id, reg.referenceNumber, reg.title);
  const willFollow = !isCurrentlyBookmarked;
  if (willFollow) {
    directoryStore.addBookmark(reg);
  } else {
    directoryStore.removeBookmark(reg.id, reg.referenceNumber, reg.title);
  }
  emit('toggleFollowRegulation', reg, willFollow);
};

const handleBulkToggleFrameworkFollow = (regs: RegulatoryDirectoryItem[]) => {
  regs.forEach((r) => {
    directoryStore.addBookmark(r);
  });
  emit('bulkFollowRegulations', regs, true);
};

const handleCopyCitation = (reg: RegulatoryDirectoryItem) => {
  const dateStr = reg.publishDate || reg.effectiveDate || '';
  const citation = `${reg.regulatorAcronym}, "${reg.title}" (${reg.referenceNumber}${dateStr ? `, ${dateStr}` : ''}). ${reg.officialUrl}`;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(citation);
  }
  emit(
    'showToast',
    'Citation Copied',
    `${reg.referenceNumber} copied to clipboard.`,
    'info'
  );
};
</script>

<template>
  <div id="regulatory-directory-view" class="p-4 sm:p-6 lg:p-8 space-y-6 w-full animate-in fade-in">
    <!-- View Header: Title with Acknowledged badge indicator -->
    <div class="flex items-center justify-between flex-wrap gap-4 pb-1">
      <div>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Compass class="w-6 h-6 text-blue-600" />
            <span>Regulatory Directory</span>
          </h1>
          <span
            v-if="acknowledgedCount > 0"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
            title="Acknowledged regulations currently monitored in Bookmarks"
          >
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
            <span>Acknowledged: {{ acknowledgedCount }}</span>
          </span>
        </div>
        <p class="text-xs text-neutral-500 mt-1">
          Global repository of regulatory standards, circulars, and supervisory rules.
        </p>
      </div>
    </div>

    <!-- Top Filter Panel with Bookmarks active state -->
    <DirectoryFilterPanel
      :isBookmarksActive="directoryStore.isBookmarksActive"
      @apply="handleApplyFilters"
      @reset="handleResetFilters"
      @toggleBookmarks="handleToggleBookmarks"
      @filterChange="handleFilterChange"
    />

    <!-- Results Data Table with Action: Import preserved -->
    <DirectoryResultsTable
      :regulations="displayedRegulations"
      :hasApplied="directoryStore.isBookmarksActive ? true : hasAppliedFilters"
      :total-source-count="directoryStore.isBookmarksActive ? directoryStore.bookmarkedItems.length : synchedDirectory.length"
      @selectRegulation="handleSelectRegulation"
      @importToDiligence="handleOpenImportDiligence"
      @bulkImportToDiligence="handleOpenBulkImportDiligence"
      @toggleFrameworkFollow="handleToggleFrameworkFollow"
      @bulkToggleFrameworkFollow="handleBulkToggleFrameworkFollow"
      @copyCitation="handleCopyCitation"
      @resetFilters="handleResetFilters"
    />
  </div>
</template>
