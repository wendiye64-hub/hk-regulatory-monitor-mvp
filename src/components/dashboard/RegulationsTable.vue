<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Share2,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next';
import type {
  RegulationItem,
  MaterialityLevel,
  DiligenceStatus,
} from '@/types';
import { REGULATORY_THEMES, normalizeRelevance, ALL_JURISDICTIONS } from '@/types';
import ComplianceFilterBar from './ComplianceFilterBar.vue';

export interface RegulationsTableFilterState {
  searchQuery: string;
  selectedJurisdictions: string[];
  selectedThemes: string[];
  selectedCategories: string[];
  selectedMateriality: string;
  selectedStatus: string;
}

const props = withDefaults(
  defineProps<{
    regulations: RegulationItem[];
    availableThemes?: readonly string[] | string[];
    availableJurisdictions?: string[];
    filterOverdueOnly?: boolean;
    externalFilters?: RegulationsTableFilterState;
    animatingRegId?: string | null;
  }>(),
  {
    availableThemes: () => [...REGULATORY_THEMES],
    availableJurisdictions: () => [...ALL_JURISDICTIONS],
    filterOverdueOnly: false,
    animatingRegId: null,
  }
);

const emit = defineEmits<{
  (e: 'selectRegulation', regulation: RegulationItem): void;
  (e: 'bulkImport', selectedIds: string[]): void;
  (e: 'singleImport', regulation: RegulationItem, event: MouseEvent): void;
}>();

const localSearchQuery = ref('');
const localSelectedThemes = ref<string[]>([]);
const localSelectedJurisdictions = ref<string[]>([]);
const localSelectedCategories = ref<string[]>([]);
const localSelectedMateriality = ref('All');
const localSelectedStatus = ref('All');
const selectedRowIds = ref<string[]>([]);

// Date Sorting: 'publishDate' | 'effectiveDate'
type DateSortField = 'publishDate' | 'effectiveDate';
type SortDirection = 'asc' | 'desc';

const sortField = ref<DateSortField | null>(null);
const sortDirection = ref<SortDirection>('desc');

const handleSort = (field: DateSortField) => {
  if (sortField.value === field) {
    if (sortDirection.value === 'desc') {
      // 2nd click: Ascending
      sortDirection.value = 'asc';
    } else {
      // 3rd click: Reset sorting
      sortField.value = null;
      sortDirection.value = 'desc';
    }
  } else {
    // 1st click: Descending
    sortField.value = field;
    sortDirection.value = 'desc';
  }
};

const searchQuery = computed(() =>
  props.externalFilters ? props.externalFilters.searchQuery : localSearchQuery.value
);
const selectedJurisdictions = computed(() =>
  props.externalFilters ? props.externalFilters.selectedJurisdictions : localSelectedJurisdictions.value
);
const selectedThemes = computed(() =>
  props.externalFilters ? props.externalFilters.selectedThemes : localSelectedThemes.value
);
const selectedCategories = computed(() =>
  props.externalFilters ? props.externalFilters.selectedCategories : localSelectedCategories.value
);
const selectedMateriality = computed(() =>
  props.externalFilters ? props.externalFilters.selectedMateriality : localSelectedMateriality.value
);
const selectedStatus = computed(() =>
  props.externalFilters ? props.externalFilters.selectedStatus : localSelectedStatus.value
);

const handleClearLocalFilters = () => {
  localSearchQuery.value = '';
  localSelectedJurisdictions.value = [];
  localSelectedThemes.value = [];
  localSelectedCategories.value = [];
  localSelectedMateriality.value = 'All';
  localSelectedStatus.value = 'All';
};

const filteredRegulations = computed(() => {
  const filtered = props.regulations.filter((item) => {
    if (props.filterOverdueOnly && !item.isExceedingSLA) return false;

    const matchesSearch =
      searchQuery.value.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.referenceNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.regulator.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.regulatorAcronym.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesJurisdiction =
      selectedJurisdictions.value.length === 0 ||
      selectedJurisdictions.value.includes(item.jurisdiction);

    const matchesTheme =
      selectedThemes.value.length === 0 ||
      item.themes.some((th) => selectedThemes.value.includes(th));

    const matchesCategory =
      selectedCategories.value.length === 0 ||
      (item.category && selectedCategories.value.includes(item.category));

    const matchesMateriality =
      selectedMateriality.value === 'All' ||
      item.materiality === selectedMateriality.value ||
      normalizeRelevance(item.materiality) === selectedMateriality.value;

    const matchesStatus =
      selectedStatus.value === 'All' || item.diligenceStatus === selectedStatus.value;

    return (
      matchesSearch &&
      matchesJurisdiction &&
      matchesTheme &&
      matchesCategory &&
      matchesMateriality &&
      matchesStatus
    );
  });

  if (!sortField.value) {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    const valA = a[sortField.value!];
    const valB = b[sortField.value!];
    const timeA = valA ? new Date(valA).getTime() || null : null;
    const timeB = valB ? new Date(valB).getTime() || null : null;
    if (timeA === null && timeB === null) return 0;
    if (timeA === null) return 1;
    if (timeB === null) return -1;
    return sortDirection.value === 'asc' ? timeA - timeB : timeB - timeA;
  });
});

// --- Pagination State (20 / 40 / 60 / 100 per page) ---
const PAGE_SIZE_OPTIONS = [20, 40, 60, 100] as const;
const pageSize = ref<number>(20);
const currentPage = ref<number>(1);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRegulations.value.length / pageSize.value));
});

// Clamp currentPage if totalPages decreases or pageSize changes
watch([filteredRegulations, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

// Reset to page 1 whenever search query, filter, or sorting changes
watch(
  [
    searchQuery,
    selectedJurisdictions,
    selectedThemes,
    selectedCategories,
    selectedMateriality,
    selectedStatus,
    () => props.filterOverdueOnly,
    sortField,
    sortDirection,
  ],
  () => {
    currentPage.value = 1;
  }
);

const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + pageSize.value, filteredRegulations.value.length)
);

const paginatedRegulations = computed(() => {
  return filteredRegulations.value.slice(startIndex.value, endIndex.value);
});

// Windowed page list with ellipsis support
const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
});

const goToPage = (page: number | string) => {
  if (typeof page === 'number' && page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// Row Selection Helpers (Current Page vs All Filtered)
const isCurrentPageAllSelected = computed(() => {
  if (paginatedRegulations.value.length === 0) return false;
  return paginatedRegulations.value.every((r) => selectedRowIds.value.includes(r.id));
});

const toggleSelectAll = () => {
  const currentPageIds = paginatedRegulations.value.map((r) => r.id);
  if (isCurrentPageAllSelected.value) {
    selectedRowIds.value = selectedRowIds.value.filter((id) => !currentPageIds.includes(id));
  } else {
    const combined = new Set([...selectedRowIds.value, ...currentPageIds]);
    selectedRowIds.value = Array.from(combined);
  }
};

const selectAllFiltered = () => {
  selectedRowIds.value = filteredRegulations.value.map((r) => r.id);
};

const toggleSelectRow = (id: string, e: MouseEvent) => {
  e.stopPropagation();
  if (selectedRowIds.value.includes(id)) {
    selectedRowIds.value = selectedRowIds.value.filter((item) => item !== id);
  } else {
    selectedRowIds.value.push(id);
  }
};
</script>

<template>
  <div id="tab-regulations-in-scope" class="monitor-regulations-table space-y-3">
    <!-- If externalFilters is NOT provided, render the standalone ComplianceFilterBar -->
    <ComplianceFilterBar
      v-if="!externalFilters"
      activeTab="regulations"
      v-model:searchQuery="localSearchQuery"
      v-model:selectedJurisdictions="localSelectedJurisdictions"
      :availableJurisdictions="availableJurisdictions"
      v-model:selectedThemes="localSelectedThemes"
      :availableThemes="availableThemes"
      v-model:selectedCategories="localSelectedCategories"
      v-model:selectedMateriality="localSelectedMateriality"
      v-model:selectedStatus="localSelectedStatus"
      @clearAll="handleClearLocalFilters"
      :matchingCount="filteredRegulations.length"
      :totalCount="regulations.length"
    />

    <!-- Floating / Anchored Bulk Action Toolbar -->
    <div
      v-if="selectedRowIds.length > 0"
      id="bulk-action-toolbar"
      class="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2"
    >
      <div class="flex items-center gap-2 text-xs">
        <span class="font-bold bg-blue-600 px-2.5 py-0.5 rounded-md">
          {{ selectedRowIds.length }} Selected
        </span>
        <span class="text-slate-300 hidden sm:inline">
          Apply collision check & import into Diligence Frameworks
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="emit('bulkImport', selectedRowIds)"
          class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Share2 class="w-3.5 h-3.5" />
          <span>Bulk Import to Diligence</span>
        </button>
        <button
          @click="selectedRowIds = []"
          class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          Deselect
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div class="w-full bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
      <div class="w-full overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100 border-b border-slate-300 text-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <th class="py-3 px-3 w-10 text-center shrink-0">
                <button
                  @click="toggleSelectAll"
                  class="text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Select all on this page"
                >
                  <CheckSquare
                    v-if="isCurrentPageAllSelected"
                    class="w-4 h-4 text-blue-600"
                  />
                  <Square v-else class="w-4 h-4" />
                </button>
              </th>
              <th class="py-3 px-3 min-w-[280px] w-auto">Publication Title & Ref</th>
              <th class="py-3 px-3 w-20 whitespace-nowrap">Type</th>
              <th class="py-3 px-3 w-20 whitespace-nowrap">Regulator</th>
              <th class="py-3 px-3 w-24 whitespace-nowrap">Jurisdiction</th>
              <th class="py-3 px-3 min-w-[160px]">Themes</th>
              <!-- Published Sortable Header -->
              <th
                id="th-sort-pub-date"
                @click="handleSort('publishDate')"
                class="py-3 px-3 w-28 whitespace-nowrap cursor-pointer hover:bg-slate-200/90 transition-colors select-none group"
                :title="
                  sortField === 'publishDate'
                    ? sortDirection === 'desc'
                      ? 'Current: Newest to oldest (Click to switch to oldest to newest)'
                      : 'Current: Oldest to newest (Click to reset sort)'
                    : 'Click to sort by publication date'
                "
              >
                <div class="inline-flex items-center gap-1.5 font-semibold">
                  <span :class="sortField === 'publishDate' ? 'text-blue-700 font-bold' : 'text-slate-800'">Published</span>
                  <span
                    class="inline-flex items-center p-0.5 rounded transition-colors"
                    :class="sortField === 'publishDate' ? 'text-blue-600 bg-blue-100/70' : 'text-slate-400 group-hover:text-slate-700'"
                  >
                    <ArrowDown v-if="sortField === 'publishDate' && sortDirection === 'desc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                    <ArrowUp v-else-if="sortField === 'publishDate' && sortDirection === 'asc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5" />
                  </span>
                </div>
              </th>

              <!-- Effective Sortable Header -->
              <th
                id="th-sort-effective-date"
                @click="handleSort('effectiveDate')"
                class="py-3 px-3 w-32 whitespace-nowrap cursor-pointer hover:bg-slate-200/90 transition-colors select-none group"
                :title="
                  sortField === 'effectiveDate'
                    ? sortDirection === 'desc'
                      ? 'Current: Newest to oldest (Click to switch to oldest to newest)'
                      : 'Current: Oldest to newest (Click to reset sort)'
                    : 'Click to sort by effective date'
                "
              >
                <div class="inline-flex items-center gap-1.5 font-semibold">
                  <span :class="sortField === 'effectiveDate' ? 'text-blue-700 font-bold' : 'text-slate-800'">Effective</span>
                  <span
                    class="inline-flex items-center p-0.5 rounded transition-colors"
                    :class="sortField === 'effectiveDate' ? 'text-blue-600 bg-blue-100/70' : 'text-slate-400 group-hover:text-slate-700'"
                  >
                    <ArrowDown v-if="sortField === 'effectiveDate' && sortDirection === 'desc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                    <ArrowUp v-else-if="sortField === 'effectiveDate' && sortDirection === 'asc'" class="w-3.5 h-3.5 stroke-[2.5]" />
                    <ArrowUpDown v-else class="w-3.5 h-3.5" />
                  </span>
                </div>
              </th>
              <th class="py-3 px-3 w-28 whitespace-nowrap">AI Relevance</th>
              <th class="py-3 px-3 w-28 whitespace-nowrap">Status</th>
              <th class="py-3 px-3 w-24 whitespace-nowrap">Owner</th>
              <th class="py-3 px-3 w-24 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/80 text-slate-800">
            <tr v-if="filteredRegulations.length === 0">
              <td colspan="12" class="py-12 text-center text-slate-500">
                No regulatory publications found matching the applied criteria.
              </td>
            </tr>
            <tr
              v-else
              v-for="reg in paginatedRegulations"
              :key="reg.id"
              :id="`reg-row-${reg.id}`"
              @click="emit('selectRegulation', reg)"
              :class="`even:bg-slate-50/40 odd:bg-white hover:bg-blue-50/60 cursor-pointer transition-colors ${
                animatingRegId && reg.id === animatingRegId
                  ? 'bg-blue-50/95 ring-2 ring-blue-500/60 shadow-xs border-l-4 border-l-blue-600'
                  : selectedRowIds.includes(reg.id)
                  ? 'bg-blue-50/70'
                  : ''
              }`"
            >
              <td class="py-3 px-3 text-center shrink-0" @click="toggleSelectRow(reg.id, $event)">
                <CheckSquare v-if="selectedRowIds.includes(reg.id)" class="w-4 h-4 text-blue-600 mx-auto" />
                <Square v-else class="w-4 h-4 text-slate-400 mx-auto" />
              </td>

              <!-- Title & Ref -->
              <td class="py-3 px-3 min-w-[280px] w-auto overflow-hidden">
                <div v-if="animatingRegId && reg.id === animatingRegId" class="animate-in fade-in slide-in-from-left-4 duration-500">
                  <div class="flex items-center gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      Acknowledged Publication
                    </span>
                  </div>
                  <div class="font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
                    {{ reg.title }}
                  </div>
                  <div class="text-xs font-mono text-slate-600 mt-0.5 font-medium">
                    {{ reg.referenceNumber }}
                  </div>
                </div>
                <div v-else>
                  <div class="font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
                    {{ reg.title }}
                  </div>
                  <div class="text-xs font-mono text-slate-600 mt-0.5 font-medium">
                    {{ reg.referenceNumber }}
                  </div>
                </div>
              </td>

              <td class="py-3 px-3 w-20 whitespace-nowrap">
                <span class="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                  {{ reg.docType }}
                </span>
              </td>

              <td class="py-3 px-3 w-20 whitespace-nowrap">
                <span class="font-bold text-slate-900">
                  {{ reg.regulatorAcronym }}
                </span>
              </td>

              <td class="py-3 px-3 w-24 whitespace-nowrap text-slate-700 font-medium">
                {{ reg.jurisdiction }}
              </td>

              <td class="py-3 px-3 min-w-[160px]">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="(t, idx) in reg.themes.slice(0, 2)"
                    :key="`${t}-${idx}`"
                    class="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold"
                  >
                    {{ t }}
                  </span>
                  <span v-if="reg.themes.length > 2" class="text-xs text-slate-500 font-semibold">
                    +{{ reg.themes.length - 2 }}
                  </span>
                </div>
              </td>

              <td class="py-3 px-3 w-28 text-slate-600 whitespace-nowrap font-mono text-xs">
                {{ reg.publishDate }}
              </td>

              <td class="py-3 px-3 w-32 text-slate-800 whitespace-nowrap font-semibold font-mono text-xs">
                {{ reg.effectiveDate }}
              </td>

              <td class="py-3 px-3 w-28 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span
                    :class="`text-xs px-2.5 py-0.5 rounded-full ${
                      normalizeRelevance(reg.materiality) === 'Direct / Highly Relevant'
                        ? 'bg-rose-50 border border-rose-200 text-rose-700 font-bold'
                        : normalizeRelevance(reg.materiality) === 'Relevant'
                        ? 'bg-amber-50 border border-amber-200 text-amber-800 font-semibold'
                        : normalizeRelevance(reg.materiality) === 'Partially Relevant'
                        ? 'bg-amber-50/60 border border-amber-200/70 text-amber-800 font-medium'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`"
                  >
                    {{ normalizeRelevance(reg.materiality) }}
                  </span>
                  <span class="text-xs font-mono text-slate-600 font-medium">
                    {{ reg.aiRelevanceScore }}/100
                  </span>
                </div>
              </td>

              <td class="py-3 px-3 w-28 whitespace-nowrap">
                <span
                  v-if="reg.diligenceStatus === 'Imported'"
                  class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                >
                  <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                  Imported
                </span>
                <span
                  v-else-if="reg.diligenceStatus === 'In Progress'"
                  class="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                >
                  <Clock class="w-3 h-3 text-blue-600" />
                  In Progress
                </span>
                <span
                  v-else
                  class="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
                >
                  Not Imported
                </span>
              </td>

              <td class="py-3 px-3 w-24 text-slate-700 whitespace-nowrap font-medium">
                {{ reg.owner }}
              </td>

              <td class="py-3 px-3 w-24 text-right whitespace-nowrap" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="reg.diligenceStatus !== 'Imported'"
                    @click="emit('singleImport', reg, $event)"
                    class="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Import to Diligence Frameworks"
                  >
                    <Share2 class="w-3 h-3" />
                    <span class="hidden sm:inline">Import</span>
                  </button>
                  <a
                    :href="reg.officialUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-1.5 text-slate-500 hover:text-slate-800 rounded-md transition-colors"
                    title="Open Official Publication"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Table Footer with Pagination Controls -->
      <div class="p-3 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 select-none">
        <!-- Left: Item Counts & Range -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-slate-700">
            Showing
            <span class="font-bold text-slate-900">
              {{ filteredRegulations.length === 0 ? 0 : startIndex + 1 }}–{{ endIndex }}
            </span>
            of
            <span class="font-bold text-slate-900">{{ filteredRegulations.length }}</span>
            total publications in scope
          </span>
          <span
            v-if="filteredRegulations.length !== regulations.length"
            class="text-[11px] text-slate-400 font-normal"
          >
            (filtered from {{ regulations.length }} total)
          </span>
          <span class="hidden xl:inline-block text-slate-300">|</span>
          <span class="hidden xl:inline text-[11px] text-slate-400 font-mono">
            Last synched: 2026-09-13 21:00 UTC
          </span>
        </div>

        <!-- Right: Rows per page & Page Navigation -->
        <div class="flex items-center gap-3 flex-wrap ml-auto">
          <!-- Per Page Selector (20 / 40 / 60 / 100) -->
          <div class="flex items-center gap-1.5">
            <label for="select-page-size-pub" class="text-slate-500 font-medium whitespace-nowrap">
              Per page:
            </label>
            <select
              id="select-page-size-pub"
              v-model.number="pageSize"
              class="h-7 px-2 py-0 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option v-for="opt in PAGE_SIZE_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
          </div>

          <!-- Page Navigation Buttons -->
          <div class="flex items-center gap-1">
            <!-- First Page (<<) -->
            <button
              type="button"
              @click="goToPage(1)"
              :disabled="currentPage === 1"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                currentPage === 1
                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs hover:border-slate-300'
              "
              title="First Page"
            >
              <ChevronsLeft class="w-3.5 h-3.5" />
            </button>

            <!-- Previous Page (<) -->
            <button
              type="button"
              @click="prevPage"
              :disabled="currentPage === 1"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                currentPage === 1
                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs hover:border-slate-300'
              "
              title="Previous Page"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>

            <!-- Numbered Pages -->
            <div class="hidden sm:flex items-center gap-1">
              <template v-for="(p, idx) in visiblePages" :key="`page-${idx}`">
                <span v-if="p === '...'" class="px-1 text-slate-400 font-medium">...</span>
                <button
                  v-else
                  type="button"
                  @click="goToPage(p)"
                  class="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  :class="
                    p === currentPage
                      ? 'bg-blue-600 text-white shadow-2xs border border-blue-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                  "
                >
                  {{ p }}
                </button>
              </template>
            </div>

            <!-- Mobile Compact Page Indicator -->
            <span class="sm:hidden px-2 text-xs font-semibold text-slate-700">
              {{ currentPage }} / {{ totalPages }}
            </span>

            <!-- Next Page (>) -->
            <button
              type="button"
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                currentPage === totalPages
                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs hover:border-slate-300'
              "
              title="Next Page"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>

            <!-- Last Page (>>) -->
            <button
              type="button"
              @click="goToPage(totalPages)"
              :disabled="currentPage === totalPages"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                currentPage === totalPages
                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs hover:border-slate-300'
              "
              title="Last Page"
            >
              <ChevronsRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
