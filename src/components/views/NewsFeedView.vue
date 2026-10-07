<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Radio,
  Search,
  Bookmark,
  CheckCircle2,
  BookmarkCheck,
  Plus,
  ExternalLink,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  FileText,
  Clock,
  Check,
  Layers,
  Sparkles,
  Share2,
  Trash2,
  RotateCcw,
  X,
  Compass,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  Tag,
} from 'lucide-vue-next';
import type {
  PriorityAlert,
  RegulationItem,
  RegulatoryDirectoryItem,
  DirectoryFilterState,
} from '@/types';
import { normalizeRelevance, ALL_JURISDICTIONS, SECTOR_GROUPS } from '@/types';
import { useDirectoryStore } from '@/stores/directoryStore';
import { useTaskStore } from '@/stores/taskStore';
import ComboboxFilter from '@/components/common/ComboboxFilter.vue';
import DirectoryFilterPanel from '@/components/directory/DirectoryFilterPanel.vue';
import PaginationController from '@/components/common/PaginationController.vue';

const props = defineProps<{
  alerts: PriorityAlert[];
  directoryItems: RegulatoryDirectoryItem[];
}>();

const emit = defineEmits<{
  (e: 'selectItem', item: PriorityAlert | RegulatoryDirectoryItem | RegulationItem): void;
  (e: 'createTaskForItems', items: Array<{ id: string; title: string; regulator?: string; regulatorAcronym?: string }>): void;
  (e: 'readAlert', alertId: string): void;
  (e: 'bookmarkAlert', alert: PriorityAlert): void;
  (e: 'toggleBookmarkDirectory', item: RegulatoryDirectoryItem): void;
  (e: 'restoreReadAlert', alertId: string): void;
  (e: 'openDetail', item: any): void;
}>();

const directoryStore = useDirectoryStore();
const taskStore = useTaskStore();

// Top Sub-segment: 'latest' vs 'directory'
const subView = ref<'latest' | 'directory'>('latest');

// Visual Layout mode: 'card' vs 'list'
const layoutMode = ref<'card' | 'list'>('card');

// Selection for batch Task Creation
const selectedItemIds = ref<string[]>([]);

const toggleSelectAll = (items: Array<{ id: string }>) => {
  if (selectedItemIds.value.length === items.length) {
    selectedItemIds.value = [];
  } else {
    selectedItemIds.value = items.map((i) => i.id);
  }
};

const toggleSelectItem = (id: string) => {
  if (selectedItemIds.value.includes(id)) {
    selectedItemIds.value = selectedItemIds.value.filter((i) => i !== id);
  } else {
    selectedItemIds.value.push(id);
  }
};

// -------------------------------------------------------------
// TAB 1 - SEGMENT A: LATEST NEWS FEED
// -------------------------------------------------------------
const searchQuery = ref('');
const selectedJurisdictions = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedRelevances = ref<string[]>([]);
const selectedLinkages = ref<string[]>([]);
const sortBy = ref<'date' | 'relevance' | 'linkage'>('date');

const hasActiveLatestFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    selectedJurisdictions.value.length > 0 ||
    selectedCategories.value.length > 0 ||
    selectedRelevances.value.length > 0 ||
    selectedLinkages.value.length > 0
  );
});

const handleClearAllLatestFilters = () => {
  searchQuery.value = '';
  selectedJurisdictions.value = [];
  selectedCategories.value = [];
  selectedRelevances.value = [];
  selectedLinkages.value = [];
};

const activeAlerts = computed(() => {
  return props.alerts.filter((a) => a.status === 'pending');
});

const dismissedAlerts = computed(() => {
  return props.alerts.filter((a) => a.status === 'dismissed');
});

const filteredLatestAlerts = computed(() => {
  return activeAlerts.value
    .filter((alert) => {
      // Search
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim();
        const match =
          alert.title.toLowerCase().includes(q) ||
          (alert.regulator && alert.regulator.toLowerCase().includes(q)) ||
          (alert.regulatorAcronym && alert.regulatorAcronym.toLowerCase().includes(q)) ||
          (alert.aiRelevanceSummary && alert.aiRelevanceSummary.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Jurisdiction multi-select
      if (
        selectedJurisdictions.value.length > 0 &&
        !selectedJurisdictions.value.includes(alert.jurisdiction)
      ) {
        return false;
      }

      // Category multi-select
      if (
        selectedCategories.value.length > 0 &&
        (!alert.category || !selectedCategories.value.includes(alert.category))
      ) {
        return false;
      }

      // Relevance multi-select
      if (selectedRelevances.value.length > 0) {
        const norm = normalizeRelevance(alert.materiality);
        if (!selectedRelevances.value.includes(norm)) {
          return false;
        }
      }

      // Linkage multi-select
      if (selectedLinkages.value.length > 0) {
        const count = taskStore.getNewsLinkageCount(alert.regulationId || alert.id, alert.title);
        const isLinked = count > 0;
        const matchLinked = selectedLinkages.value.includes('Linked to Tasks') && isLinked;
        const matchUnlinked = selectedLinkages.value.includes('Unlinked') && !isLinked;
        if (!matchLinked && !matchUnlinked) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy.value === 'linkage') {
        const countA = taskStore.getNewsLinkageCount(a.regulationId || a.id, a.title);
        const countB = taskStore.getNewsLinkageCount(b.regulationId || b.id, b.title);
        return countB - countA;
      }
      if (sortBy.value === 'relevance') {
        const rank = (lvl: string) => {
          if (lvl.includes('Direct') || lvl.includes('Critical')) return 3;
          if (lvl.includes('Relevant')) return 2;
          return 1;
        };
        return rank(b.materiality) - rank(a.materiality);
      }
      // Default: date
      return (b.publishDate || '').localeCompare(a.publishDate || '');
    });
});

// Pagination for Latest News Feed (Default 20, options 40, 60, 100)
const latestPageSize = ref<number>(20);
const latestCurrentPage = ref<number>(1);

const paginatedLatestAlerts = computed(() => {
  const start = (latestCurrentPage.value - 1) * latestPageSize.value;
  return filteredLatestAlerts.value.slice(start, start + latestPageSize.value);
});

watch(
  [searchQuery, selectedJurisdictions, selectedCategories, selectedRelevances, selectedLinkages, sortBy],
  () => {
    latestCurrentPage.value = 1;
  }
);

// When switching to Directory, enforce List View only
watch(subView, (newVal) => {
  if (newVal === 'directory') {
    layoutMode.value = 'list';
  }
  selectedItemIds.value = [];
});

// -------------------------------------------------------------
// TAB 1 - SEGMENT B: DIRECTORY 4-LAYER PIPELINE
// -------------------------------------------------------------
// Conditional trigger: When Bookmarks is toggled off and global search is accessed, shows "Ready to Search Directory" prompt before Apply is clicked
const hasAppliedDirectoryFilters = ref(false);

const activeDirectoryFilters = ref<DirectoryFilterState | null>({
  datePreset: 'All',
  startDate: '01/01/2020',
  endDate: '28/09/2026',
  dateType: 'publishDate',
  jurisdiction: 'All',
  theme: 'All',
  category: 'All',
  selectedJurisdictions: [],
  selectedThemes: [],
  selectedCategories: [],
  selectedLinkages: [],
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

// Common 4-layer filter function for Directory
const applyDirectoryPipeline = (
  items: RegulatoryDirectoryItem[],
  filters: DirectoryFilterState | null
): RegulatoryDirectoryItem[] => {
  if (!filters) return items;
  let list = items;

  // Layer 1: Date Range Filter (strictly using Publish Date)
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

  // Layer 2: Jurisdiction Multi-Select
  if (filters.selectedJurisdictions && filters.selectedJurisdictions.length > 0) {
    list = list.filter((r) => filters.selectedJurisdictions!.includes(r.jurisdiction));
  } else if (filters.jurisdiction && filters.jurisdiction !== 'All' && filters.jurisdiction !== 'Multi') {
    list = list.filter((r) => r.jurisdiction === filters.jurisdiction);
  }

  // Layer 3: Themes Multi-Select (Compliance tags)
  if (filters.selectedThemes && filters.selectedThemes.length > 0) {
    list = list.filter((r) =>
      r.themes?.some((t) =>
        filters.selectedThemes!.some(
          (sel) => t.toLowerCase().includes(sel.toLowerCase()) || sel.toLowerCase().includes(t.toLowerCase())
        )
      )
    );
  } else if (filters.theme && filters.theme !== 'All' && filters.theme !== 'Multi') {
    const tLower = filters.theme.toLowerCase();
    list = list.filter((r) =>
      r.themes?.some((t) => t.toLowerCase().includes(tLower) || tLower.includes(t.toLowerCase()))
    );
  }

  // Layer 4: Category Multi-Select (Sector group & document types)
  if (filters.selectedCategories && filters.selectedCategories.length > 0) {
    list = list.filter((r) =>
      filters.selectedCategories!.some(
        (cat) =>
          r.category === cat ||
          (r.docType && r.docType.toLowerCase().includes(cat.toLowerCase())) ||
          (cat && cat.toLowerCase().includes(r.docType?.toLowerCase() || ''))
      )
    );
  } else if (filters.category && filters.category !== 'All' && filters.category !== 'Multi') {
    list = list.filter(
      (r) =>
        r.category === filters.category ||
        r.docType.toLowerCase().includes(filters.category.toLowerCase())
    );
  }

  // Linkage Multi-Select
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

// Synchronized Directory Source
const synchedDirectory = computed<RegulatoryDirectoryItem[]>(() => {
  return props.directoryItems.map((item) => {
    const isBookmarked = directoryStore.isBookmarked(item.id, item.referenceNumber, item.title);
    return {
      ...item,
      status: isBookmarked ? ('Following' as const) : ('None' as const),
    };
  });
});

// Computed Display Items for Directory Sub-view
const displayedDirectoryItems = computed<RegulatoryDirectoryItem[]>(() => {
  // Mode 1: Bookmarks is active (Default)
  if (directoryStore.isBookmarksActive) {
    return applyDirectoryPipeline(directoryStore.bookmarkedItems, activeDirectoryFilters.value);
  }

  // Mode 2: Bookmarks disabled -> requires user to click Apply first
  if (!hasAppliedDirectoryFilters.value) {
    return [];
  }

  let list = synchedDirectory.value;
  if (!activeDirectoryFilters.value) return list;

  // Apply common dimension pipeline
  list = applyDirectoryPipeline(list, activeDirectoryFilters.value);

  // Advanced: Regulators Candidate Pool
  if (activeDirectoryFilters.value.regulatorCandidates.length > 0) {
    const allowed = new Set(
      activeDirectoryFilters.value.regulatorCandidates.map((acronym) => acronym.toUpperCase())
    );
    list = list.filter((r) => allowed.has((r.regulatorAcronym || '').toUpperCase()));
  }

  // Advanced: Full-text Keywords Boolean Search (OR vs AND)
  if (activeDirectoryFilters.value.keywordCandidates.length > 0) {
    const kws = activeDirectoryFilters.value.keywordCandidates.map((k) => k.toLowerCase().trim());
    list = list.filter((r) => {
      const fullCorpus = [
        r.title,
        r.referenceNumber,
        r.executiveSummary,
        r.operationalImpact,
        r.authenticExcerpt,
        ...(r.themes || []),
      ]
        .join(' ')
        .toLowerCase();

      if (activeDirectoryFilters.value?.keywordMode === 'AND') {
        return kws.every((kw) => fullCorpus.includes(kw));
      } else {
        return kws.some((kw) => fullCorpus.includes(kw));
      }
    });
  }

  return list;
});

// Pagination for Directory view
const directoryPageSize = ref<number>(20);
const directoryCurrentPage = ref<number>(1);

const totalDirectoryItems = computed(() => displayedDirectoryItems.value.length);
const totalDirectoryPages = computed(() =>
  Math.max(1, Math.ceil(totalDirectoryItems.value / directoryPageSize.value))
);

const directoryStartIndex = computed(
  () => (directoryCurrentPage.value - 1) * directoryPageSize.value
);
const directoryEndIndex = computed(() =>
  Math.min(directoryStartIndex.value + directoryPageSize.value, totalDirectoryItems.value)
);

const paginatedDirectoryItems = computed(() => {
  return displayedDirectoryItems.value.slice(
    directoryStartIndex.value,
    directoryEndIndex.value
  );
});

// Filter Panel Handlers
const handleApplyDirectoryFilters = (filters: DirectoryFilterState) => {
  activeDirectoryFilters.value = { ...filters };
  hasAppliedDirectoryFilters.value = true;
  directoryCurrentPage.value = 1;
};

const handleResetDirectoryFilters = () => {
  activeDirectoryFilters.value = {
    datePreset: 'All',
    startDate: '01/01/2020',
    endDate: '28/09/2026',
    dateType: 'publishDate',
    jurisdiction: 'All',
    theme: 'All',
    category: 'All',
    selectedJurisdictions: [],
    selectedThemes: [],
    selectedCategories: [],
    selectedLinkages: [],
    regulatorCandidates: [],
    keywordCandidates: [],
    keywordMode: 'OR',
  };
  hasAppliedDirectoryFilters.value = false;
  directoryCurrentPage.value = 1;
};

const handleToggleDirectoryBookmarks = (active: boolean) => {
  if (active) {
    hasAppliedDirectoryFilters.value = false;
  }
  directoryCurrentPage.value = 1;
};

const handleDirectoryFilterChange = (partial: Partial<DirectoryFilterState>) => {
  if (activeDirectoryFilters.value) {
    activeDirectoryFilters.value = {
      ...activeDirectoryFilters.value,
      ...partial,
    };
  }
};

// Batch Create Task Trigger
const handleCreateTaskForSelection = () => {
  let targetItems: Array<{ id: string; title: string; regulator?: string; regulatorAcronym?: string }> = [];

  if (subView.value === 'latest') {
    targetItems = activeAlerts.value
      .filter((a) => selectedItemIds.value.includes(a.id))
      .map((a) => ({
        id: a.regulationId || a.id,
        title: a.title,
        regulator: a.regulator,
        regulatorAcronym: a.regulatorAcronym,
      }));
  } else {
    targetItems = displayedDirectoryItems.value
      .filter((d) => selectedItemIds.value.includes(d.id))
      .map((d) => ({
        id: d.id,
        title: d.title,
        regulator: d.regulator,
        regulatorAcronym: d.regulatorAcronym,
      }));
  }

  emit('createTaskForItems', targetItems);
};
</script>

<template>
  <div class="news-feed-view w-full p-4 sm:p-6 lg:p-8 space-y-5 animate-in fade-in">
    <!-- Top Action Bar -->
    <div
      class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-neutral-200 pb-4"
    >
      <!-- Left: Segmented Switch [ Latest | Directory ] -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-2xs">
          <button
            id="tab-btn-feed-latest"
            @click="subView = 'latest'; selectedItemIds = []"
            :class="`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              subView === 'latest'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            <Radio class="w-4 h-4 text-blue-600" />
            <span>Latest</span>
            <span
              :class="`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                subView === 'latest' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
              }`"
            >
              {{ activeAlerts.length }}
            </span>
          </button>

          <button
            id="tab-btn-feed-directory"
            @click="subView = 'directory'; layoutMode = 'list'; selectedItemIds = []"
            :class="`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              subView === 'directory'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            <Bookmark class="w-4 h-4 text-blue-600" />
            <span>Directory</span>
            <span
              :class="`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                subView === 'directory' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
              }`"
            >
              {{ directoryStore.bookmarkedItems.length }}
            </span>
          </button>
        </div>

        <div v-if="subView === 'directory'" class="text-xs text-neutral-500 font-medium hidden sm:inline">
          {{
            directoryStore.isBookmarksActive
              ? 'Showing Bookmarked items by default. Toggle Bookmarks off to run search across global directory.'
              : 'Search mode active. Set 4-layer criteria and click Apply.'
          }}
        </div>
      </div>

      <!-- Right: View Toggle & Create Task Button -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Layout Switch (Card vs List: Card view is dimmed and disabled in Directory) -->
        <div class="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
          <button
            @click="subView !== 'directory' && (layoutMode = 'card')"
            :disabled="subView === 'directory'"
            :class="`p-1.5 rounded-md transition-all ${
              subView === 'directory'
                ? 'opacity-25 cursor-not-allowed text-neutral-400 bg-transparent'
                : layoutMode === 'card'
                ? 'bg-white text-blue-600 shadow-2xs cursor-pointer'
                : 'text-neutral-500 hover:text-neutral-900 cursor-pointer'
            }`"
            :title="subView === 'directory' ? 'Directory supports List View only (Card View is disabled)' : 'Card View'"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
          <button
            @click="layoutMode = 'list'"
            :class="`p-1.5 rounded-md transition-colors cursor-pointer ${
              layoutMode === 'list' ? 'bg-white text-blue-600 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
            }`"
            title="List / Table View"
          >
            <List class="w-4 h-4" />
          </button>
        </div>

        <!-- Batch Create Task button (if items selected) -->
        <button
          v-if="selectedItemIds.length > 0"
          @click="handleCreateTaskForSelection"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer animate-in zoom-in-95"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Create Task ({{ selectedItemIds.length }} Selected)</span>
        </button>

        <!-- General Create Task Button -->
        <button
          v-else
          @click="emit('createTaskForItems', [])"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Create Task</span>
        </button>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- VIEW A: LATEST NEWS FEED CONTENT                              -->
    <!-- ============================================================= -->
    <div v-if="subView === 'latest'" class="space-y-4">
      <!-- Latest Filter Bar (Unified Search & Multi-Select Dimension Filters) -->
      <div class="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
          <!-- Search -->
          <div class="relative md:col-span-4">
            <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search news title, summary, authority..."
              class="w-full pl-9 pr-3 h-9 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs text-neutral-900 focus:outline-none transition-colors"
            />
          </div>

          <!-- Jurisdiction Multi-Select -->
          <div class="md:col-span-2">
            <ComboboxFilter
              label="Jurisdiction"
              placeholder="All Jurisdictions"
              :options="ALL_JURISDICTIONS"
              v-model:selectedValues="selectedJurisdictions"
            />
          </div>

          <!-- Category Multi-Select -->
          <div class="md:col-span-2">
            <ComboboxFilter
              label="Category"
              placeholder="All Categories"
              :options="SECTOR_GROUPS"
              v-model:selectedValues="selectedCategories"
            />
          </div>

          <!-- Relevance Multi-Select -->
          <div class="md:col-span-2">
            <ComboboxFilter
              label="Relevance"
              placeholder="All Relevances"
              :options="['Direct / Highly Relevant', 'Relevant', 'Partially Relevant', 'Low']"
              v-model:selectedValues="selectedRelevances"
            />
          </div>

          <!-- Linkage Multi-Select -->
          <div class="md:col-span-2">
            <ComboboxFilter
              label="Linkage"
              placeholder="All Linkage"
              :options="['Linked to Tasks', 'Unlinked']"
              v-model:selectedValues="selectedLinkages"
            />
          </div>
        </div>

        <!-- Active Filters Tag Bar with Clear All -->
        <div
          v-if="hasActiveLatestFilters"
          class="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs flex-wrap"
        >
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-neutral-500 text-[11px] font-medium">Active filters:</span>

            <span
              v-for="jur in selectedJurisdictions"
              :key="jur"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200"
            >
              <span>{{ jur }}</span>
              <button
                @click="selectedJurisdictions = selectedJurisdictions.filter((j) => j !== jur)"
                class="hover:text-blue-900 cursor-pointer"
              >
                <X class="w-3 h-3" />
              </button>
            </span>

            <span
              v-for="cat in selectedCategories"
              :key="cat"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-200"
            >
              <span>{{ cat }}</span>
              <button
                @click="selectedCategories = selectedCategories.filter((c) => c !== cat)"
                class="hover:text-indigo-900 cursor-pointer"
              >
                <X class="w-3 h-3" />
              </button>
            </span>

            <span
              v-for="rel in selectedRelevances"
              :key="rel"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200"
            >
              <span>{{ rel }}</span>
              <button
                @click="selectedRelevances = selectedRelevances.filter((r) => r !== rel)"
                class="hover:text-amber-900 cursor-pointer"
              >
                <X class="w-3 h-3" />
              </button>
            </span>

            <span
              v-for="lnk in selectedLinkages"
              :key="lnk"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200"
            >
              <span>{{ lnk }}</span>
              <button
                @click="selectedLinkages = selectedLinkages.filter((l) => l !== lnk)"
                class="hover:text-purple-900 cursor-pointer"
              >
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>

          <button
            @click="handleClearAllLatestFilters"
            class="text-neutral-500 hover:text-rose-600 font-medium text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
          >
            <X class="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="filteredLatestAlerts.length === 0"
        class="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
          <CheckCircle2 class="w-6 h-6 text-emerald-500" />
        </div>
        <h3 class="text-sm font-bold text-neutral-900">All Live Updates Cleared</h3>
        <p class="text-xs text-neutral-500 max-w-md mx-auto">
          No pending regulatory alerts match your filter. Items you marked as Read or Bookmarked can be reviewed in the Directory.
        </p>
      </div>

      <!-- Card View Mode -->
      <div
        v-else-if="layoutMode === 'card'"
        class="space-y-4"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="alert in paginatedLatestAlerts"
            :key="alert.id"
            class="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all flex flex-col justify-between group"
          >
            <!-- Card Header -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="selectedItemIds.includes(alert.id)"
                    @click.stop="toggleSelectItem(alert.id)"
                    class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span class="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                    {{ alert.regulatorAcronym || 'REG' }}
                  </span>
                  <span class="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                    {{ alert.jurisdiction }}
                  </span>
                </div>

                <!-- Linkage count badge (Noise reduction: displays numeric count badge) -->
                <button
                  @click.stop="emit('openDetail', alert)"
                  :title="`${taskStore.getNewsLinkageCount(alert.regulationId || alert.id, alert.title)} linked task(s). Click to view details.`"
                  :class="`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                    taskStore.getNewsLinkageCount(alert.regulationId || alert.id, alert.title) > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                  }`"
                >
                  <Layers class="w-3 h-3" />
                  <span>{{ taskStore.getNewsLinkageCount(alert.regulationId || alert.id, alert.title) }} Tasks</span>
                </button>
              </div>

              <!-- Title & Published info -->
              <div>
                <h3
                  @click="emit('openDetail', alert)"
                  class="text-xs sm:text-sm font-bold text-neutral-900 leading-snug line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  {{ alert.title }}
                </h3>
                <div class="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                  <Clock class="w-3 h-3 text-neutral-400" />
                  <span>Published: {{ alert.publishDate }}</span>
                </div>
              </div>

              <!-- Category & Themes Fields -->
              <div class="space-y-1.5 py-1.5 border-y border-neutral-100 text-[11px]">
                <!-- Category Field -->
                <div class="flex items-center gap-1.5">
                  <span class="text-neutral-500 font-medium shrink-0">Category:</span>
                  <span class="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md text-[10px] truncate max-w-[240px]">
                    <Folder class="w-3 h-3 text-indigo-600 shrink-0" />
                    <span class="truncate">{{ alert.category || 'Financial Services & Capital Markets' }}</span>
                  </span>
                </div>

                <!-- Themes Field -->
                <div class="flex items-start gap-1.5">
                  <span class="text-neutral-500 font-medium shrink-0 pt-0.5">Themes:</span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="thm in (alert.themes && alert.themes.length > 0 ? alert.themes : ['Compliance & Governance'])"
                      :key="thm"
                      class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200/80 max-w-[200px] truncate"
                    >
                      <Tag class="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                      <span class="truncate">{{ thm }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Summary -->
              <p class="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                {{ alert.aiRelevanceSummary }}
              </p>
            </div>

            <!-- Card Actions (Clean Two Actions: Read & Bookmark) -->
            <div class="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-end gap-1.5">
              <!-- Read Action (formerly Dismiss: clears card without saving) -->
              <button
                @click.stop="emit('readAlert', alert.id)"
                class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                title="Mark as Read & Clear"
              >
                <Check class="w-3.5 h-3.5 text-neutral-500" />
                <span>Read</span>
              </button>

              <!-- Bookmark Action (formerly Acknowledge: saves into Bookmarks) -->
              <button
                @click.stop="emit('bookmarkAlert', alert)"
                class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                title="Bookmark to Directory"
              >
                <Bookmark class="w-3.5 h-3.5 text-blue-600" />
                <span>Bookmark</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination for Latest Card View -->
        <PaginationController
          v-if="filteredLatestAlerts.length > 0"
          :totalItems="filteredLatestAlerts.length"
          v-model:currentPage="latestCurrentPage"
          v-model:pageSize="latestPageSize"
        />
      </div>

      <!-- List / Table View Mode (Scalable for hundreds of items) -->
      <div v-else class="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <table class="w-full text-left text-xs">
          <thead class="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-700">
            <tr>
              <th class="p-3 w-8">
                <input
                  type="checkbox"
                  :checked="selectedItemIds.length === paginatedLatestAlerts.length && paginatedLatestAlerts.length > 0"
                  @click="toggleSelectAll(paginatedLatestAlerts)"
                  class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              <th class="p-3">News & Regulatory Publication</th>
              <th class="p-3 w-32">Authority</th>
              <th class="p-3 w-28">Jurisdiction</th>
              <th class="p-3 w-24">Linkage</th>
              <th class="p-3 w-28">Date</th>
              <th class="p-3 w-48 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="alert in paginatedLatestAlerts"
              :key="alert.id"
              class="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
              @click="emit('openDetail', alert)"
            >
              <td class="p-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedItemIds.includes(alert.id)"
                  @click.stop="toggleSelectItem(alert.id)"
                  class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
              </td>
              <td class="p-3">
                <div class="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                  {{ alert.title }}
                </div>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span class="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                    {{ alert.category || 'Financial Services & Capital Markets' }}
                  </span>
                  <span
                    v-for="thm in (alert.themes || []).slice(0, 2)"
                    :key="thm"
                    class="text-[10px] text-neutral-600 bg-neutral-100 border border-neutral-200/60 px-1.5 py-0.2 rounded font-normal"
                  >
                    {{ thm }}
                  </span>
                </div>
                <div class="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                  {{ alert.aiRelevanceSummary }}
                </div>
              </td>
              <td class="p-3">
                <span class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                  {{ alert.regulatorAcronym || 'REG' }}
                </span>
              </td>
              <td class="p-3 text-neutral-600">{{ alert.jurisdiction }}</td>
              <td class="p-3">
                <span
                  :class="`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    taskStore.getNewsLinkageCount(alert.regulationId || alert.id, alert.title) > 0
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-neutral-400'
                  }`"
                >
                  <Layers class="w-3 h-3" />
                  <span>{{ taskStore.getNewsLinkageCount(alert.regulationId || alert.id, alert.title) }}</span>
                </span>
              </td>
              <td class="p-3 text-neutral-500 font-mono text-[11px]">{{ alert.publishDate }}</td>
              <td class="p-3 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click.stop="emit('readAlert', alert.id)"
                    class="px-2 py-1 rounded text-xs font-semibold text-neutral-600 hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                    title="Mark Read"
                  >
                    Read
                  </button>
                  <button
                    @click.stop="emit('bookmarkAlert', alert)"
                    class="px-2 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                    title="Bookmark"
                  >
                    Bookmark
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination for Latest List View -->
        <PaginationController
          v-if="filteredLatestAlerts.length > 0"
          :totalItems="filteredLatestAlerts.length"
          v-model:currentPage="latestCurrentPage"
          v-model:pageSize="latestPageSize"
        />
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- VIEW B: DIRECTORY 4-LAYER PIPELINE CONTENT                    -->
    <!-- ============================================================= -->
    <div v-else class="space-y-5">
      <!-- 4-Layer Filter Panel -->
      <DirectoryFilterPanel
        :isBookmarksActive="directoryStore.isBookmarksActive"
        @apply="handleApplyDirectoryFilters"
        @reset="handleResetDirectoryFilters"
        @toggleBookmarks="handleToggleDirectoryBookmarks"
        @filterChange="handleDirectoryFilterChange"
      />

      <!-- CASE 1: Bookmarks is Disabled AND User has NOT clicked Apply yet -->
      <!-- Conditional trigger: When Bookmarks is turned off, shows Ready to Search Directory prompt before Apply is clicked -->
      <div
        v-if="!directoryStore.isBookmarksActive && !hasAppliedDirectoryFilters"
        class="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-12 text-center space-y-4 shadow-2xs animate-in fade-in"
      >
        <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto text-blue-600">
          <Compass class="w-8 h-8" />
        </div>
        <div class="space-y-1 max-w-md mx-auto">
          <h3 class="text-base font-bold text-neutral-900">Ready to Search Directory</h3>
          <p class="text-xs text-neutral-500 leading-relaxed">
            To prevent performance bottlenecks across thousands of global statutory publications, configure your 4-layer filters above (Date Range, Jurisdictions, Themes, Categories, or Keywords) and click <strong>Apply</strong> to execute the full-catalog search.
          </p>
        </div>
        <button
          @click="hasAppliedDirectoryFilters = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
        >
          <span>Run Directory Search</span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>

      <!-- CASE 2: Empty Results (either Bookmarks is empty or Search yielded 0 results) -->
      <div
        v-else-if="displayedDirectoryItems.length === 0"
        class="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
          <Bookmark class="w-6 h-6 text-neutral-400" />
        </div>
        <h3 class="text-sm font-bold text-neutral-900">
          {{ directoryStore.isBookmarksActive ? 'No Bookmarked Publications' : 'No Regulatory Items Found' }}
        </h3>
        <p class="text-xs text-neutral-500 max-w-md mx-auto">
          {{
            directoryStore.isBookmarksActive
              ? 'You have not bookmarked any publications yet. Click "Bookmark" on news items in the Latest feed to add them to your workspace.'
              : 'No items match your 4-layer filter criteria. Adjust your date range, jurisdictions, or categories above.'
          }}
        </p>
      </div>

      <!-- CASE 3: Render Results (Cards or List View) -->
      <div v-else class="space-y-4">
        <!-- Results Header Bar -->
        <div class="flex items-center justify-between text-xs px-1">
          <div class="flex items-center gap-2 text-neutral-600 font-medium">
            <span>Showing</span>
            <strong class="text-neutral-900 font-bold">{{ directoryStartIndex + 1 }}–{{ directoryEndIndex }}</strong>
            <span>of</span>
            <strong class="text-neutral-900 font-bold">{{ totalDirectoryItems }}</strong>
            <span>{{ directoryStore.isBookmarksActive ? 'bookmarked publications' : 'regulatory records' }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-neutral-500 text-[11px]">Per page:</span>
            <select
              v-model="directoryPageSize"
              @change="directoryCurrentPage = 1"
              class="h-7 px-2 text-xs font-medium text-neutral-800 bg-white border border-neutral-200 rounded-lg cursor-pointer"
            >
              <option :value="20">20</option>
              <option :value="40">40</option>
              <option :value="60">60</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <!-- LIST / TABLE VIEW MODE FOR DIRECTORY (Directory strictly uses List View) -->
        <div class="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-700">
              <tr>
                <th class="p-3 w-8">
                  <input
                    type="checkbox"
                    :checked="selectedItemIds.length === paginatedDirectoryItems.length && paginatedDirectoryItems.length > 0"
                    @click="toggleSelectAll(paginatedDirectoryItems)"
                    class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th class="p-3">Title / Document</th>
                <th class="p-3 w-32">Authority</th>
                <th class="p-3 w-28">Jurisdiction</th>
                <th class="p-3 w-36">Category</th>
                <th class="p-3 w-24">Linkage</th>
                <th class="p-3 w-28">Date</th>
                <th class="p-3 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr
                v-for="item in paginatedDirectoryItems"
                :key="item.id"
                class="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                @click="emit('openDetail', item)"
              >
                <td class="p-3" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedItemIds.includes(item.id)"
                    @click.stop="toggleSelectItem(item.id)"
                    class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </td>
                <td class="p-3">
                  <div class="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                    {{ item.title }}
                  </div>
                  <div class="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {{ item.referenceNumber || 'Official Circular' }}
                  </div>
                  <div v-if="item.themes && item.themes.length > 0" class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="thm in item.themes.slice(0, 2)"
                      :key="thm"
                      class="text-[10px] px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded border border-neutral-200/60 font-normal"
                    >
                      {{ thm }}
                    </span>
                    <span v-if="item.themes.length > 2" class="text-[10px] text-neutral-400">
                      +{{ item.themes.length - 2 }}
                    </span>
                  </div>
                </td>
                <td class="p-3">
                  <span class="font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                    {{ item.regulatorAcronym || 'REG' }}
                  </span>
                </td>
                <td class="p-3 text-neutral-600">{{ item.jurisdiction }}</td>
                <td class="p-3 text-neutral-600 truncate max-w-[140px]">{{ item.category }}</td>
                <td class="p-3">
                  <span
                    :class="`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      taskStore.getNewsLinkageCount(item.id, item.title, item.referenceNumber) > 0
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-neutral-400'
                    }`"
                  >
                    <Layers class="w-3 h-3" />
                    <span>{{ taskStore.getNewsLinkageCount(item.id, item.title, item.referenceNumber) }} Tasks</span>
                  </span>
                </td>
                <td class="p-3 text-neutral-500 font-mono text-[11px]">{{ item.publishDate }}</td>
                <td class="p-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      @click.stop="emit('toggleBookmarkDirectory', item)"
                      :class="`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        directoryStore.isBookmarked(item.id, item.referenceNumber, item.title)
                          ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                          : 'text-neutral-400 hover:text-amber-600 border-neutral-200 hover:bg-neutral-50'
                      }`"
                      :title="directoryStore.isBookmarked(item.id, item.referenceNumber, item.title) ? 'Remove Bookmark' : 'Bookmark'"
                    >
                      <BookmarkCheck
                        v-if="directoryStore.isBookmarked(item.id, item.referenceNumber, item.title)"
                        class="w-3.5 h-3.5 text-amber-600"
                      />
                      <Bookmark v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls for Directory -->
        <PaginationController
          v-if="displayedDirectoryItems.length > 0"
          :totalItems="displayedDirectoryItems.length"
          v-model:currentPage="directoryCurrentPage"
          v-model:pageSize="directoryPageSize"
        />
      </div>
    </div>
  </div>
</template>
