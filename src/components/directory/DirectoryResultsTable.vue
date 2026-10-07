<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  FileText,
  Building2,
  Globe2,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  CheckCircle2,
  FileCheck2,
  PlusCircle,
  Download,
  Copy,
  FolderPlus,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  FilterX,
  Eye,
  BookmarkCheck,
  Check,
} from 'lucide-vue-next';
import type { RegulatoryDirectoryItem, DocumentType } from '@/types';
import { useDirectoryStore } from '@/stores/directoryStore';

const directoryStore = useDirectoryStore();

const props = defineProps<{
  regulations: RegulatoryDirectoryItem[];
  isLoading?: boolean;
  hasApplied?: boolean;
  totalSourceCount?: number;
}>();

const emit = defineEmits<{
  (e: 'selectRegulation', regulation: RegulatoryDirectoryItem): void;
  (e: 'importToDiligence', regulation: RegulatoryDirectoryItem): void;
  (e: 'bulkImportToDiligence', regulations: RegulatoryDirectoryItem[]): void;
  (e: 'toggleFrameworkFollow', regulation: RegulatoryDirectoryItem): void;
  (e: 'bulkToggleFrameworkFollow', regulations: RegulatoryDirectoryItem[]): void;
  (e: 'copyCitation', regulation: RegulatoryDirectoryItem): void;
  (e: 'resetFilters'): void;
}>();

// Selection State
const selectedIds = ref<string[]>([]);
const activeActionMenuId = ref<string | null>(null);

// Pagination State (20 / 40 / 60 / 100 per page, moves page)
const PAGE_SIZE_OPTIONS = [20, 40, 60, 100] as const;
const pageSize = ref<number>(20);
const currentPage = ref<number>(1);

// Sort State: 3-State Toggle
// 1st click: Sort descending (newest to oldest / highest to lowest)
// 2nd click: Switch to ascending (oldest to newest / lowest to highest)
// 3rd click: Reset sorting to default order
type SortField = 'publishDate' | 'effectiveDate' | 'aiRelevanceScore' | 'title' | 'regulator';
const sortField = ref<SortField | null>(null);
const sortOrder = ref<'asc' | 'desc'>('desc');

const toggleSort = (field: SortField) => {
  if (sortField.value === field) {
    if (sortOrder.value === 'desc') {
      // 2nd click: Ascending
      sortOrder.value = 'asc';
    } else {
      // 3rd click: Reset sorting
      sortField.value = null;
      sortOrder.value = 'desc';
    }
  } else {
    // 1st click: Descending
    sortField.value = field;
    sortOrder.value = 'desc';
  }
  currentPage.value = 1;
};

// Sorted list
const sortedRegulations = computed(() => {
  if (!sortField.value) {
    return [...props.regulations];
  }
  const list = [...props.regulations];
  return list.sort((a, b) => {
    if (sortField.value === 'publishDate') {
      const timeA = a.publishDate ? new Date(a.publishDate).getTime() : null;
      const timeB = b.publishDate ? new Date(b.publishDate).getTime() : null;
      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return 1;
      if (timeB === null) return -1;
      return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA;
    } else if (sortField.value === 'effectiveDate') {
      const timeA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : null;
      const timeB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : null;
      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return 1;
      if (timeB === null) return -1;
      return sortOrder.value === 'asc' ? timeA - timeB : timeB - timeA;
    } else if (sortField.value === 'aiRelevanceScore') {
      const comparison = (a.aiRelevanceScore || 0) - (b.aiRelevanceScore || 0);
      return sortOrder.value === 'desc' ? -comparison : comparison;
    } else if (sortField.value === 'title') {
      const comparison = a.title.localeCompare(b.title);
      return sortOrder.value === 'desc' ? -comparison : comparison;
    } else if (sortField.value === 'regulator') {
      const comparison = a.regulatorAcronym.localeCompare(b.regulatorAcronym);
      return sortOrder.value === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
});

// Pagination Calculations
const totalItems = computed(() => sortedRegulations.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)));

const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, totalItems.value));

const paginatedRegulations = computed(() => {
  return sortedRegulations.value.slice(startIndex.value, endIndex.value);
});

// Watchers for clamping page
watch([totalItems, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

// Select All visible
const isCurrentPageAllSelected = computed(() => {
  if (paginatedRegulations.value.length === 0) return false;
  return paginatedRegulations.value.every((r) => selectedIds.value.includes(r.id));
});

const isSomeSelected = computed(() => {
  return selectedIds.value.length > 0 && !isCurrentPageAllSelected.value;
});

const toggleSelectAllCurrentPage = () => {
  if (isCurrentPageAllSelected.value) {
    const pageIds = new Set(paginatedRegulations.value.map((r) => r.id));
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id));
  } else {
    const currentSet = new Set(selectedIds.value);
    paginatedRegulations.value.forEach((r) => currentSet.add(r.id));
    selectedIds.value = Array.from(currentSet);
  }
};

const toggleSelectRow = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id);
  } else {
    selectedIds.value.push(id);
  }
};

const clearSelection = () => {
  selectedIds.value = [];
};

// Selected items
const selectedItems = computed(() => {
  return props.regulations.filter((r) => selectedIds.value.includes(r.id));
});

// Batch Actions
const handleBulkImport = () => {
  if (selectedItems.value.length === 0) return;
  emit('bulkImportToDiligence', selectedItems.value);
};

const handleBulkFrameworkFollow = () => {
  if (selectedItems.value.length === 0) return;
  emit('bulkToggleFrameworkFollow', selectedItems.value);
};

// Helpers for presentation
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getDocTypeBadgeStyle = (docType: string) => {
  switch (docType) {
    case 'Rulebook':
    case 'Regulations/Rules':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Circular':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Consultation Paper':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Guideline':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Standard':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Enforcement':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Primary Legislation':
      return 'bg-slate-100 text-slate-800 border-slate-300';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
};

const getAiScoreBadge = (score: number) => {
  if (score >= 90) {
    return {
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      label: 'High Match',
    };
  }
  if (score >= 75) {
    return {
      barClass: 'bg-blue-500',
      textClass: 'text-blue-700 bg-blue-50 border-blue-200',
      label: 'Med Match',
    };
  }
  return {
    barClass: 'bg-amber-500',
    textClass: 'text-amber-700 bg-amber-50 border-amber-200',
    label: 'Moderate',
  };
};

const getJurisdictionFlag = (j: string): string => {
  if (j.includes('Hong Kong')) return '🇭🇰';
  if (j.includes('Singapore')) return '🇸🇬';
  if (j.includes('United States')) return '🇺🇸';
  if (j.includes('United Kingdom')) return '🇬🇧';
  if (j.includes('European')) return '🇪🇺';
  if (j.includes('Australia')) return '🇦🇺';
  return '🌐';
};

// Pagination numbers array
const displayedPageNumbers = computed(() => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});
</script>

<template>
  <div
    id="regulatory-directory-results-container"
    class="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden flex flex-col"
  >
    <!-- Table Header Toolbar -->
    <div class="px-4 sm:px-6 py-3 border-b border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3">
      <!-- Left: Total count -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-neutral-900">Found</span>
        <span class="text-xs font-semibold font-mono px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
          {{ totalItems }} Regulations
        </span>
      </div>

      <!-- Right: Batch Actions when rows selected -->
      <div v-if="selectedIds.length > 0" class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 animate-in fade-in duration-150">
        <span class="text-xs font-semibold text-neutral-900">
          {{ selectedIds.length }} Selected
        </span>

        <button
          type="button"
          @click="handleBulkImport"
          class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
        >
          <FileCheck2 class="w-3.5 h-3.5" />
          <span>Import</span>
        </button>

        <button
          type="button"
          @click="handleBulkFrameworkFollow"
          class="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 text-xs font-semibold rounded transition-colors cursor-pointer"
        >
          <BookmarkCheck class="w-3.5 h-3.5 text-blue-600" />
          <span>Monitor</span>
        </button>

        <button
          type="button"
          @click="clearSelection"
          class="text-xs text-neutral-800 hover:text-neutral-900 px-2 py-1 rounded cursor-pointer font-normal"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Data Table Area -->
    <div class="overflow-x-auto min-w-full">
      <table class="w-full text-left border-collapse">
        <!-- Table Header: 60-30-10, 2 font weights -->
        <thead>
          <tr class="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-900 select-none">
            <!-- Col 1: Checkbox -->
            <th class="w-10 px-4 py-3 text-center">
              <input
                type="checkbox"
                :checked="isCurrentPageAllSelected"
                :indeterminate="isSomeSelected"
                @change="toggleSelectAllCurrentPage"
                class="w-4 h-4 rounded text-blue-600 border-neutral-300 focus:ring-blue-500 cursor-pointer"
                title="Select all on this page"
              />
            </th>

            <!-- Col 2: Title & Ref -->
            <th class="px-4 py-3 min-w-[320px] select-none">
              <button
                type="button"
                id="dir-th-sort-title"
                @click="toggleSort('title')"
                class="inline-flex items-center gap-1.5 hover:text-neutral-900 transition-colors cursor-pointer group"
              >
                <span :class="sortField === 'title' ? 'text-blue-700 font-semibold' : 'text-neutral-900'">Title & Ref</span>
                <span
                  class="inline-flex items-center p-0.5 rounded transition-colors"
                  :class="sortField === 'title' ? 'text-blue-600 bg-blue-50' : 'text-neutral-400 group-hover:text-neutral-700'"
                >
                  <ArrowDown v-if="sortField === 'title' && sortOrder === 'desc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUp v-else-if="sortField === 'title' && sortOrder === 'asc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUpDown v-else class="w-3 h-3" />
                </span>
              </button>
            </th>

            <!-- Col 3: Type -->
            <th class="px-3 py-3 w-28">
              <span>Type</span>
            </th>

            <!-- Col 4: Regulator -->
            <th class="px-3 py-3 w-32 select-none">
              <button
                type="button"
                id="dir-th-sort-regulator"
                @click="toggleSort('regulator')"
                class="inline-flex items-center gap-1.5 hover:text-neutral-900 transition-colors cursor-pointer group"
              >
                <span :class="sortField === 'regulator' ? 'text-blue-700 font-semibold' : 'text-neutral-900'">Regulator</span>
                <span
                  class="inline-flex items-center p-0.5 rounded transition-colors"
                  :class="sortField === 'regulator' ? 'text-blue-600 bg-blue-50' : 'text-neutral-400 group-hover:text-neutral-700'"
                >
                  <ArrowDown v-if="sortField === 'regulator' && sortOrder === 'desc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUp v-else-if="sortField === 'regulator' && sortOrder === 'asc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUpDown v-else class="w-3 h-3" />
                </span>
              </button>
            </th>

            <!-- Col 5: Jurisdiction -->
            <th class="px-3 py-3 w-32">
              <span>Jurisdiction</span>
            </th>

            <!-- Col 6: Date -->
            <th class="px-3 py-3 w-28 select-none">
              <button
                type="button"
                id="dir-th-sort-date"
                @click="toggleSort('publishDate')"
                class="inline-flex items-center gap-1.5 hover:text-neutral-900 transition-colors cursor-pointer group"
                title="Sort by Date"
              >
                <span :class="sortField === 'publishDate' ? 'text-blue-700 font-semibold' : 'text-neutral-900'">Date</span>
                <span
                  class="inline-flex items-center p-0.5 rounded transition-colors"
                  :class="sortField === 'publishDate' ? 'text-blue-600 bg-blue-50' : 'text-neutral-400 group-hover:text-neutral-700'"
                >
                  <ArrowDown v-if="sortField === 'publishDate' && sortOrder === 'desc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUp v-else-if="sortField === 'publishDate' && sortOrder === 'asc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUpDown v-else class="w-3 h-3" />
                </span>
              </button>
            </th>

            <!-- Col 7: Themes -->
            <th class="px-3 py-3 min-w-[180px]">
              <span>Themes</span>
            </th>

            <!-- Col 9: AI Relevance -->
            <th class="px-4 py-3 w-32 select-none">
              <button
                type="button"
                id="dir-th-sort-ai"
                @click="toggleSort('aiRelevanceScore')"
                class="inline-flex items-center gap-1.5 hover:text-neutral-900 transition-colors cursor-pointer group"
              >
                <span :class="sortField === 'aiRelevanceScore' ? 'text-blue-700 font-semibold' : 'text-neutral-900'">AI Relevance</span>
                <span
                  class="inline-flex items-center p-0.5 rounded transition-colors"
                  :class="sortField === 'aiRelevanceScore' ? 'text-blue-600 bg-blue-50' : 'text-neutral-400 group-hover:text-neutral-700'"
                >
                  <ArrowDown v-if="sortField === 'aiRelevanceScore' && sortOrder === 'desc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUp v-else-if="sortField === 'aiRelevanceScore' && sortOrder === 'asc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                  <ArrowUpDown v-else class="w-3 h-3" />
                </span>
              </button>
            </th>

            <!-- Col 10: Status -->
            <th class="px-3 py-3 w-28 text-center">
              <span>Status</span>
            </th>

            <!-- Col 11: Actions -->
            <th class="px-4 py-3 w-40 text-right">
              <span>Actions</span>
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="divide-y divide-neutral-200 text-xs">
          <!-- Zero State -->
          <tr v-if="paginatedRegulations.length === 0">
            <td colspan="10" class="py-16 px-4 text-center">
              <div v-if="directoryStore.isBookmarksActive && directoryStore.bookmarkedItems.length === 0" class="max-w-md mx-auto flex flex-col items-center">
                <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <BookmarkCheck class="w-6 h-6" />
                </div>
                <h4 class="text-sm font-semibold text-neutral-900 mb-1">
                  No Acknowledged Bookmarks Yet
                </h4>
                <p class="text-xs font-normal text-neutral-600 mb-3 leading-relaxed text-center">
                  Items only appear here after clicking <span class="font-semibold text-emerald-700">"Acknowledge"</span> on alert cards in the News Feed.
                </p>
                <button
                  type="button"
                  @click="directoryStore.setBookmarksActive(false)"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Explore Global Directory</span>
                </button>
              </div>
              <div v-else-if="hasApplied === false" class="max-w-md mx-auto flex flex-col items-center">
                <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Search class="w-6 h-6" />
                </div>
                <h4 class="text-sm font-semibold text-neutral-900 mb-1">
                  Ready to Search Directory
                </h4>
                <p class="text-xs font-normal text-neutral-600 mb-2 leading-relaxed text-center">
                  Select your criteria in the Filter panel above and click <span class="font-semibold text-blue-600">"Apply"</span> to explore the global regulatory catalog.
                </p>
              </div>
              <div v-else-if="(totalSourceCount ?? 0) === 0" class="max-w-md mx-auto flex flex-col items-center">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <FilterX class="w-6 h-6" />
                </div>
                <h4 class="text-sm font-semibold text-neutral-900 mb-1">
                  No Live Regulations Received from Crawler
                </h4>
                <p class="text-xs font-normal text-neutral-700 mb-4 leading-relaxed text-center">
                  The crawler API (<code class="bg-neutral-100 px-1 py-0.5 rounded font-mono text-[11px]">/regulatory/updates/latest</code>) has not returned any publications yet. Connect your backend or run the crawler to ingest official regulatory gazettes.
                </p>
              </div>
              <div v-else class="max-w-md mx-auto flex flex-col items-center">
                <div class="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
                  <FilterX class="w-6 h-6" />
                </div>
                <h4 class="text-sm font-semibold text-neutral-900 mb-1">
                  No regulations match criteria
                </h4>
                <p class="text-xs font-normal text-neutral-800 mb-4 leading-relaxed text-center">
                  Try removing filter tags, switching to OR mode, or broadening date scope.
                </p>
                <button
                  type="button"
                  @click="emit('resetFilters')"
                  class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Reset Filters</span>
                </button>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-for="reg in paginatedRegulations"
            :key="reg.id"
            :class="`hover:bg-neutral-50/80 transition-colors ${
              selectedIds.includes(reg.id) ? 'bg-neutral-100/60' : ''
            }`"
          >
            <!-- Checkbox -->
            <td class="px-4 py-3 text-center">
              <input
                type="checkbox"
                :checked="selectedIds.includes(reg.id)"
                @change="toggleSelectRow(reg.id)"
                class="w-4 h-4 rounded text-blue-600 border-neutral-300 focus:ring-blue-500 cursor-pointer"
              />
            </td>

            <!-- Publication Title & Ref -->
            <td class="px-4 py-3">
              <div class="flex flex-col gap-1">
                <!-- Title & Acknowledged Badge -->
                <div class="flex items-start gap-1.5 flex-wrap">
                  <button
                    type="button"
                    @click="emit('selectRegulation', reg)"
                    class="text-left font-semibold text-neutral-900 hover:text-blue-600 transition-colors leading-snug cursor-pointer line-clamp-2"
                    :title="reg.title"
                  >
                    {{ reg.title }}
                  </button>

                  <span
                    v-if="reg.isAcknowledged"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 select-none shadow-2xs mt-0.5"
                    title="Acknowledged from Live Priority Alerts Feed"
                  >
                    <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                    <span>Acknowledged</span>
                  </span>
                </div>

                <!-- Ref -->
                <div class="flex items-center gap-2 text-xs text-neutral-800 font-mono font-normal">
                  <span>Ref: {{ reg.referenceNumber }}</span>
                </div>
              </div>
            </td>

            <!-- Doc Type Badge -->
            <td class="px-3 py-3">
              <span
                :class="`inline-block text-xs font-normal px-2 py-0.5 rounded border ${getDocTypeBadgeStyle(
                  reg.docType
                )}`"
              >
                {{ reg.docType }}
              </span>
            </td>

            <!-- Regulator -->
            <td class="px-3 py-3">
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-neutral-900 font-mono text-xs">
                  {{ reg.regulatorAcronym }}
                </span>
                <span class="text-xs text-neutral-800 font-normal hidden xl:inline truncate max-w-[100px]" :title="reg.regulator">
                  {{ reg.regulator }}
                </span>
              </div>
            </td>

            <!-- Jurisdiction -->
            <td class="px-3 py-3">
              <div class="flex items-center gap-1.5 text-xs text-neutral-800 font-normal">
                <span class="text-sm select-none">{{ getJurisdictionFlag(reg.jurisdiction) }}</span>
                <span class="truncate">{{ reg.jurisdiction }}</span>
              </div>
            </td>

            <!-- Date -->
            <td class="px-3 py-3 whitespace-nowrap text-xs font-mono text-neutral-800 font-normal">
              <span>{{ formatDisplayDate(reg.publishDate || reg.effectiveDate) }}</span>
            </td>

            <!-- Themes -->
            <td class="px-3 py-3">
              <div class="flex flex-wrap items-center gap-1">
                <span
                  v-for="theme in reg.themes.slice(0, 2)"
                  :key="theme"
                  class="text-xs font-normal bg-neutral-100 text-neutral-800 border border-neutral-200 px-1.5 py-0.5 rounded truncate max-w-[140px]"
                  :title="theme"
                >
                  {{ theme }}
                </span>
                <span
                  v-if="reg.themes.length > 2"
                  class="text-xs font-semibold bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded cursor-help"
                  :title="reg.themes.slice(2).join(', ')"
                >
                  +{{ reg.themes.length - 2 }}
                </span>
              </div>
            </td>

            <!-- AI Relevance -->
            <td class="px-4 py-3">
              <div class="relative group inline-block">
                <div
                  :class="`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold cursor-help shadow-xs ${
                    getAiScoreBadge(reg.aiRelevanceScore).textClass
                  }`"
                >
                  <span
                    :class="`w-1.5 h-1.5 rounded-full ${
                      getAiScoreBadge(reg.aiRelevanceScore).barClass
                    }`"
                  />
                  <span>{{ reg.aiRelevanceScore }}%</span>
                </div>

                <!-- Hover Popover: Why Relevant -->
                <div
                  class="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-neutral-900 text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none leading-relaxed border border-neutral-800"
                >
                  <div class="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                    <Sparkles class="w-3.5 h-3.5" />
                    <span>Relevance Rationale</span>
                  </div>
                  <p class="text-neutral-300 text-xs font-normal">
                    {{ reg.whyRelevantExplanation || 'Directly relevant to active institutional scope.' }}
                  </p>
                </div>
              </div>
            </td>

            <!-- Status: Following vs None -->
            <td class="px-3 py-3 text-center">
              <span
                v-if="reg.status === 'Following'"
                class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded"
              >
                <Check class="w-3 h-3" />
                <span>Following</span>
              </span>
              <span
                v-else
                class="inline-block text-xs font-normal px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded"
              >
                None
              </span>
            </td>

            <!-- Actions: Import + More Menu -->
            <td class="px-4 py-3 text-right">
              <div class="inline-flex items-center gap-1.5 relative">
                <!-- Import Button -->
                <button
                  type="button"
                  @click="emit('importToDiligence', reg)"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:text-blue-600 bg-white hover:bg-neutral-50 border border-neutral-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                  title="Import to Diligence"
                >
                  <FileCheck2 class="w-3.5 h-3.5 text-blue-600" />
                  <span>Import</span>
                </button>

                <!-- More Options Menu Button -->
                <div class="relative">
                  <button
                    type="button"
                    @click="
                      activeActionMenuId = activeActionMenuId === reg.id ? null : reg.id
                    "
                    class="p-1 rounded text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    title="More options"
                  >
                    <MoreHorizontal class="w-4 h-4" />
                  </button>

                  <!-- Popover Menu -->
                  <div
                    v-if="activeActionMenuId === reg.id"
                    class="absolute right-0 top-full mt-1 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-40 py-1 text-left animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      type="button"
                      @click="
                        emit('toggleFrameworkFollow', reg);
                        activeActionMenuId = null;
                      "
                      class="w-full px-3 py-2 text-xs font-normal text-neutral-900 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <BookmarkCheck class="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {{ reg.status === 'Following' ? 'Remove from Monitor' : 'Add to Monitor' }}
                      </span>
                    </button>

                    <button
                      type="button"
                      @click="
                        emit('selectRegulation', reg);
                        activeActionMenuId = null;
                      "
                      class="w-full px-3 py-2 text-xs font-normal text-neutral-900 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Eye class="w-3.5 h-3.5 text-neutral-800" />
                      <span>View Full Record</span>
                    </button>

                    <button
                      type="button"
                      @click="
                        emit('copyCitation', reg);
                        activeActionMenuId = null;
                      "
                      class="w-full px-3 py-2 text-xs font-normal text-neutral-900 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Copy class="w-3.5 h-3.5 text-neutral-800" />
                      <span>Copy Citation</span>
                    </button>

                    <a
                      :href="reg.officialUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click="activeActionMenuId = null"
                      class="w-full px-3 py-2 text-xs font-normal text-neutral-900 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ExternalLink class="w-3.5 h-3.5 text-neutral-800" />
                      <span>Official Source</span>
                    </a>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Table Footer: Pagination & Page Size Selection (8-point grid, 2 font weights) -->
    <div class="px-4 sm:px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-800 font-normal">
      <!-- Left: Range Info -->
      <div class="flex items-center gap-2">
        <span>
          Showing
          <strong class="text-neutral-900 font-semibold">{{ totalItems === 0 ? 0 : startIndex + 1 }}</strong>
          –
          <strong class="text-neutral-900 font-semibold">{{ endIndex }}</strong>
          of
          <strong class="text-neutral-900 font-semibold">{{ totalItems }}</strong>
          total records
        </span>
      </div>

      <!-- Right: Page Size & Page Controls -->
      <div class="flex items-center gap-3">
        <!-- Per page selector -->
        <div class="flex items-center gap-1.5">
          <label for="select-dir-pagesize" class="text-neutral-800 text-xs font-normal">Per page:</label>
          <select
            id="select-dir-pagesize"
            v-model="pageSize"
            class="h-8 px-2 text-xs font-normal text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option v-for="opt in PAGE_SIZE_OPTIONS" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>

        <!-- Pagination Navigation Buttons -->
        <div class="flex items-center gap-1">
          <!-- First Page -->
          <button
            type="button"
            @click="currentPage = 1"
            :disabled="currentPage === 1"
            class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft class="w-3.5 h-3.5 text-neutral-800" />
          </button>

          <!-- Prev Page -->
          <button
            type="button"
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft class="w-3.5 h-3.5 text-neutral-800" />
          </button>

          <!-- Numbered Buttons -->
          <template v-for="(pageNum, idx) in displayedPageNumbers" :key="`page-${idx}`">
            <span v-if="pageNum === '...'" class="px-1 text-neutral-400">...</span>
            <button
              v-else
              type="button"
              @click="currentPage = Number(pageNum)"
              :class="`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-100'
              }`"
            >
              {{ pageNum }}
            </button>
          </template>

          <!-- Next Page -->
          <button
            type="button"
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight class="w-3.5 h-3.5 text-neutral-800" />
          </button>

          <!-- Last Page -->
          <button
            type="button"
            @click="currentPage = totalPages"
            :disabled="currentPage >= totalPages"
            class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight class="w-3.5 h-3.5 text-neutral-800" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
