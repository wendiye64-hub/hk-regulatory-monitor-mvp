<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Layers,
  Globe,
  Shield,
  LayoutGrid,
  List,
  ArrowUpDown,
  Search,
  X,
} from 'lucide-vue-next';
import type { PriorityAlert } from '@/types';
import { normalizeRelevance, ALL_JURISDICTIONS } from '@/types';
import { useDirectoryStore } from '@/stores/directoryStore';
import { useMonitorStore } from '@/stores/monitorStore';

const directoryStore = useDirectoryStore();
const monitorStore = useMonitorStore();

const props = defineProps<{
  alerts: PriorityAlert[];
}>();

const emit = defineEmits<{
  (e: 'selectAlert', regulationId: string): void;
  (e: 'acknowledge', alertId: string, event: MouseEvent): void;
  (e: 'dismiss', alertId: string, event: MouseEvent): void;
  (e: 'openHistory'): void;
}>();

// View mode: 'board' (grid) vs 'table'
const viewMode = ref<'board' | 'table'>('board');

// Filters Dropdown State
const selectedRelevances = ref<string[]>([
  'Direct / Highly Relevant',
  'Relevant',
  'Partially Relevant',
]);
const slaFilter = ref<'all' | 'overdue' | 'due24h'>('all');
const selectedRegulator = ref<string>('all');
const selectedJurisdiction = ref<string>('all');
const searchTitle = ref<string>('');

// Table Sorting
const tableSortDirection = ref<'asc' | 'desc'>('asc');

// Transitioning animation tracking
const acknowledgingAlertIds = ref<string[]>([]);
const dismissingAlertIds = ref<string[]>([]);

// --- Grid Mode Pagination (3 x 5 = 15 cards per page) ---
const GRID_PAGE_SIZE = 15;
const gridCurrentPage = ref<number>(1);

// --- Table Mode Pagination (20 / 40 / 60 / 100 per page, matching Watchlist) ---
const TABLE_PAGE_SIZE_OPTIONS = [20, 40, 60, 100] as const;
const tablePageSize = ref<number>(20);
const tableCurrentPage = ref<number>(1);

const activeAlerts = computed(() => {
  return props.alerts.filter(
    (a) =>
      a.status === 'pending' &&
      !acknowledgingAlertIds.value.includes(a.id) &&
      !dismissingAlertIds.value.includes(a.id)
  );
});

const filteredAlerts = computed(() => {
  return activeAlerts.value.filter((alert) => {
    if (searchTitle.value.trim()) {
      const query = searchTitle.value.toLowerCase().trim();
      if (!alert.title.toLowerCase().includes(query)) {
        return false;
      }
    }

    const alertRelevance = normalizeRelevance(alert.materiality);
    if (!selectedRelevances.value.includes(alertRelevance)) return false;

    if (selectedJurisdiction.value !== 'all' && alert.jurisdiction !== selectedJurisdiction.value) {
      return false;
    }

    if (selectedRegulator.value !== 'all' && alert.regulatorAcronym !== selectedRegulator.value)
      return false;

    if (slaFilter.value === 'overdue' && !alert.isOverdueSLA) return false;
    if (slaFilter.value === 'due24h') {
      const isClose = alert.slaDeadline.includes('h') || alert.slaDeadline.includes('Today');
      if (!isClose && !alert.isOverdueSLA) return false;
    }

    return true;
  });
});

const processedCount = computed(() => props.alerts.filter((a) => a.status !== 'pending').length);

// Grid Totals & Slicing
const gridTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAlerts.value.length / GRID_PAGE_SIZE))
);
const gridStartIndex = computed(() => (gridCurrentPage.value - 1) * GRID_PAGE_SIZE);
const gridEndIndex = computed(() =>
  Math.min(gridStartIndex.value + GRID_PAGE_SIZE, filteredAlerts.value.length)
);
const displayedBoardAlerts = computed(() => {
  return filteredAlerts.value.slice(gridStartIndex.value, gridEndIndex.value);
});

// Table Totals & Slicing
const tableTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAlerts.value.length / tablePageSize.value))
);
const tableStartIndex = computed(() => (tableCurrentPage.value - 1) * tablePageSize.value);
const tableEndIndex = computed(() =>
  Math.min(tableStartIndex.value + tablePageSize.value, filteredAlerts.value.length)
);
const sortedTableAlerts = computed(() => {
  const sorted = [...filteredAlerts.value].sort((a, b) => {
    if (a.isOverdueSLA && !b.isOverdueSLA) return tableSortDirection.value === 'asc' ? -1 : 1;
    if (!a.isOverdueSLA && b.isOverdueSLA) return tableSortDirection.value === 'asc' ? 1 : -1;
    return tableSortDirection.value === 'asc'
      ? a.slaDeadline.localeCompare(b.slaDeadline)
      : b.slaDeadline.localeCompare(a.slaDeadline);
  });
  return sorted.slice(tableStartIndex.value, tableEndIndex.value);
});

// Windowed page list with ellipsis support (identical to Watchlist and Directory)
const getVisiblePages = (current: number, total: number): (number | string)[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
};

const gridVisiblePages = computed(() =>
  getVisiblePages(gridCurrentPage.value, gridTotalPages.value)
);
const tableVisiblePages = computed(() =>
  getVisiblePages(tableCurrentPage.value, tableTotalPages.value)
);

// Grid Navigation
const goToGridPage = (page: number | string) => {
  if (typeof page !== 'number') return;
  if (page >= 1 && page <= gridTotalPages.value) {
    gridCurrentPage.value = page;
  }
};
const prevGridPage = () => {
  if (gridCurrentPage.value > 1) {
    gridCurrentPage.value--;
  }
};
const nextGridPage = () => {
  if (gridCurrentPage.value < gridTotalPages.value) {
    gridCurrentPage.value++;
  }
};

// Table Navigation
const goToTablePage = (page: number | string) => {
  if (typeof page !== 'number') return;
  if (page >= 1 && page <= tableTotalPages.value) {
    tableCurrentPage.value = page;
  }
};
const prevTablePage = () => {
  if (tableCurrentPage.value > 1) {
    tableCurrentPage.value--;
  }
};
const nextTablePage = () => {
  if (tableCurrentPage.value < tableTotalPages.value) {
    tableCurrentPage.value++;
  }
};

// Watchers for clamping pages
watch([filteredAlerts], () => {
  if (gridCurrentPage.value > gridTotalPages.value) {
    gridCurrentPage.value = gridTotalPages.value;
  }
  if (gridCurrentPage.value < 1) {
    gridCurrentPage.value = 1;
  }
  if (tableCurrentPage.value > tableTotalPages.value) {
    tableCurrentPage.value = tableTotalPages.value;
  }
  if (tableCurrentPage.value < 1) {
    tableCurrentPage.value = 1;
  }
});

watch([tablePageSize], () => {
  tableCurrentPage.value = 1;
});

watch([searchTitle, selectedRelevances, selectedRegulator, selectedJurisdiction, slaFilter], () => {
  gridCurrentPage.value = 1;
  tableCurrentPage.value = 1;
});

// Handlers for Acknowledge & Dismiss: Card disappears from News Feed immediately & syncs to Directory Bookmarks
const handleAcknowledgeClick = (alert: PriorityAlert, e: MouseEvent) => {
  e.stopPropagation();
  if (acknowledgingAlertIds.value.includes(alert.id) || dismissingAlertIds.value.includes(alert.id))
    return;

  acknowledgingAlertIds.value.push(alert.id);

  // Sync to directory store bookmarks with isAcknowledged flag
  directoryStore.addBookmark({
    ...alert,
    isAcknowledged: true,
  });
  monitorStore.acknowledgeAlert(alert);

  emit('acknowledge', alert.id, e);
  setTimeout(() => {
    acknowledgingAlertIds.value = acknowledgingAlertIds.value.filter((id) => id !== alert.id);
  }, 400);
};

const handleDismissClick = (alert: PriorityAlert, e: MouseEvent) => {
  e.stopPropagation();
  if (dismissingAlertIds.value.includes(alert.id) || acknowledgingAlertIds.value.includes(alert.id))
    return;

  dismissingAlertIds.value.push(alert.id);

  // Guarantee dismissed item does NOT appear in Bookmarks
  directoryStore.removeBookmark(alert.regulationId || alert.id, undefined, alert.title, alert.id);
  monitorStore.dismissAlert(alert);

  emit('dismiss', alert.id, e);
  setTimeout(() => {
    dismissingAlertIds.value = dismissingAlertIds.value.filter((id) => id !== alert.id);
  }, 350);
};

const getTagsList = (alert: PriorityAlert) => {
  const tags: Array<{ id: string; label: string; type: 'jurisdiction' | 'category' | 'theme' }> = [];
  if (alert.jurisdiction) {
    tags.push({ id: `jur-${alert.id}`, label: alert.jurisdiction, type: 'jurisdiction' });
  }
  if (alert.category) {
    tags.push({ id: `cat-${alert.id}`, label: alert.category, type: 'category' });
  }
  if (alert.themes && alert.themes.length > 0) {
    alert.themes.forEach((th, idx) => {
      tags.push({ id: `th-${alert.id}-${idx}`, label: th, type: 'theme' });
    });
  }
  return tags;
};
</script>

<template>
  <section class="priority-alert-feed space-y-4">
    <!-- Top Header: Title, Counts, Search, Mode Toggle & History -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
          <Flame class="w-5 h-5 text-white" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-base font-bold text-neutral-900 tracking-tight">
              News Feed &bull; Live Priority Alerts
            </h3>
            <span class="bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold px-2 py-0.5 rounded-full">
              {{ filteredAlerts.length }} Actionable
            </span>
          </div>
          <p class="text-xs text-neutral-500">
            Real-time feed of supervisory notices and circulars. Acknowledging syncs to Directory Bookmarks.
          </p>
        </div>
      </div>

      <!-- Controls: View Mode, Search, History Button -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- View Mode: Grid (Board 3x5) vs Table -->
        <div class="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
          <button
            @click="viewMode = 'board'"
            :class="`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'board' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
            }`"
            title="Grid Mode (3 columns × 5 rows per page)"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
          <button
            @click="viewMode = 'table'"
            :class="`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'
            }`"
            title="Table Mode (20/40/60/100 per page)"
          >
            <List class="w-4 h-4" />
          </button>
        </div>

        <!-- Search Bar -->
        <div class="relative w-44 sm:w-56">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            v-model="searchTitle"
            type="text"
            placeholder="Search alerts..."
            class="w-full pl-8 pr-7 py-1.5 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 rounded-lg text-xs text-neutral-900 outline-none focus:border-blue-500 transition-all"
          />
          <button
            v-if="searchTitle"
            @click="searchTitle = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- Jurisdiction Filter (All jurisdictions matching Interactive Setup Wizard) -->
        <div class="relative">
          <select
            v-model="selectedJurisdiction"
            aria-label="Filter by Jurisdiction"
            title="Filter by Jurisdiction"
            class="h-8 pl-2.5 pr-6 text-xs font-semibold text-neutral-800 bg-neutral-50 hover:bg-white border border-neutral-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer max-w-[150px] truncate"
          >
            <option value="all">All Jurisdictions</option>
            <option v-for="j in ALL_JURISDICTIONS" :key="j" :value="j">{{ j }}</option>
          </select>
        </div>

        <!-- History Button (Entry point to find and restore dismissed alerts) -->
        <button
          id="btn-alert-history"
          @click="emit('openHistory')"
          class="text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Inspect Processed & Dismissed History"
        >
          <History class="w-3.5 h-3.5 text-neutral-500" />
          <span>History</span>
          <span class="bg-neutral-100 text-neutral-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {{ processedCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredAlerts.length === 0"
      class="p-12 text-center bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-3"
    >
      <CheckCircle2 class="w-10 h-10 text-emerald-500 mx-auto" />
      <p class="font-bold text-neutral-800 text-sm">No Pending Actionable Alerts</p>
      <p class="text-xs text-neutral-500 max-w-md mx-auto">
        All alerts have been triaged or dismissed. You can review and restore any dismissed alerts from History.
      </p>
      <button
        type="button"
        @click="emit('openHistory')"
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
      >
        <History class="w-3.5 h-3.5" />
        <span>Open History</span>
      </button>
    </div>

    <!-- TABLE VIEW (20 / 40 / 60 / 100 per page with pagination beside it) -->
    <div
      v-else-if="viewMode === 'table'"
      class="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">Relevance</th>
              <th class="py-3 px-4">Regulator</th>
              <th class="py-3 px-4 min-w-[260px]">Alert Title & Regulatory Summary</th>
              <th
                class="py-3 px-4 cursor-pointer select-none hover:text-neutral-900"
                @click="tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc'"
              >
                <div class="flex items-center gap-1">
                  <span>SLA Deadline</span>
                  <ArrowUpDown class="w-3 h-3 text-neutral-400" />
                </div>
              </th>
              <th class="py-3 px-4">Date</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="alert in sortedTableAlerts"
              :key="alert.id"
              @click="emit('selectAlert', alert.regulationId)"
              class="hover:bg-blue-50/40 transition-all cursor-pointer group"
            >
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  v-if="normalizeRelevance(alert.materiality) === 'Direct / Highly Relevant'"
                  class="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs w-fit"
                >
                  <Flame class="w-3 h-3 text-rose-600" />
                  Direct / Highly Relevant
                </span>
                <span
                  v-else-if="normalizeRelevance(alert.materiality) === 'Relevant'"
                  class="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  Relevant
                </span>
                <span
                  v-else-if="normalizeRelevance(alert.materiality) === 'Partially Relevant'"
                  class="bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                >
                  Partially Relevant
                </span>
                <span v-else class="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Low
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span class="font-mono font-bold bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded text-[11px]">
                  {{ alert.regulatorAcronym }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="space-y-0.5">
                  <h4 class="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {{ alert.title }}
                  </h4>
                  <p class="text-[11px] text-neutral-500 line-clamp-1">
                    {{ alert.aiRelevanceSummary }}
                  </p>
                </div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap font-mono">
                <div class="flex items-center gap-1.5">
                  <Clock :class="`w-3.5 h-3.5 ${alert.isOverdueSLA ? 'text-rose-600' : 'text-neutral-400'}`" />
                  <span
                    :class="
                      alert.isOverdueSLA
                        ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px]'
                        : 'text-neutral-700 font-medium text-[11px]'
                    "
                  >
                    {{ alert.slaDeadline }}
                  </span>
                </div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-neutral-500 font-mono text-[11px]">
                {{ alert.publishDate }}
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5" @click.stop>
                  <!-- Acknowledge Button: card disappears from News Feed & syncs to Directory Bookmarks -->
                  <button
                    type="button"
                    @click="handleAcknowledgeClick(alert, $event)"
                    :disabled="acknowledgingAlertIds.includes(alert.id)"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shadow-2xs flex items-center gap-1"
                    title="Acknowledge alert and add to Directory Bookmarks"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>

                  <!-- Dismiss Button: disappears from feed, accessible via History -->
                  <button
                    type="button"
                    @click="handleDismissClick(alert, $event)"
                    :disabled="dismissingAlertIds.includes(alert.id)"
                    class="px-2.5 py-1 text-neutral-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Dismiss alert and save to History"
                  >
                    <XCircle class="w-3.5 h-3.5 text-neutral-400" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table Mode Pagination Footer (identical to Watchlist) -->
      <div class="p-3 sm:p-4 border-t border-neutral-200 bg-neutral-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
        <!-- Left: Item counts -->
        <div class="flex items-center gap-1.5 font-normal">
          <span>Showing</span>
          <span class="font-semibold text-neutral-900 font-mono">
            {{ filteredAlerts.length > 0 ? tableStartIndex + 1 : 0 }}
          </span>
          <span>to</span>
          <span class="font-semibold text-neutral-900 font-mono">{{ tableEndIndex }}</span>
          <span>of</span>
          <span class="font-semibold text-neutral-900 font-mono">{{ filteredAlerts.length }}</span>
          <span>alerts</span>
        </div>

        <!-- Right: Per page selector & page navigation -->
        <div class="flex items-center gap-3 flex-wrap ml-auto">
          <!-- Per Page Selector (20 / 40 / 60 / 100) -->
          <div class="flex items-center gap-1.5">
            <label for="select-page-size-alert" class="text-neutral-500 font-medium whitespace-nowrap">
              Per page:
            </label>
            <select
              id="select-page-size-alert"
              v-model.number="tablePageSize"
              class="h-7 px-2 py-0 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option v-for="opt in TABLE_PAGE_SIZE_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
          </div>

          <!-- Page Navigation Buttons -->
          <div class="flex items-center gap-1">
            <!-- First Page (<<) -->
            <button
              type="button"
              @click="goToTablePage(1)"
              :disabled="tableCurrentPage === 1"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                tableCurrentPage === 1
                  ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
              "
              title="First Page"
            >
              <ChevronsLeft class="w-3.5 h-3.5" />
            </button>

            <!-- Previous Page (<) -->
            <button
              type="button"
              @click="prevTablePage"
              :disabled="tableCurrentPage === 1"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                tableCurrentPage === 1
                  ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
              "
              title="Previous Page"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>

            <!-- Numbered Pages -->
            <div class="hidden sm:flex items-center gap-1">
              <template v-for="(p, idx) in tableVisiblePages" :key="`table-page-${idx}`">
                <span v-if="p === '...'" class="px-1 text-neutral-400 font-medium">...</span>
                <button
                  v-else
                  type="button"
                  @click="goToTablePage(p)"
                  class="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  :class="
                    p === tableCurrentPage
                      ? 'bg-blue-600 text-white shadow-2xs border border-blue-600'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200'
                  "
                >
                  {{ p }}
                </button>
              </template>
            </div>

            <!-- Mobile Compact Page Indicator -->
            <span class="sm:hidden px-2 text-xs font-semibold text-neutral-700">
              {{ tableCurrentPage }} / {{ tableTotalPages }}
            </span>

            <!-- Next Page (>) -->
            <button
              type="button"
              @click="nextTablePage"
              :disabled="tableCurrentPage === tableTotalPages"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                tableCurrentPage === tableTotalPages
                  ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
              "
              title="Next Page"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>

            <!-- Last Page (>>) -->
            <button
              type="button"
              @click="goToTablePage(tableTotalPages)"
              :disabled="tableCurrentPage === tableTotalPages"
              class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
              :class="
                tableCurrentPage === tableTotalPages
                  ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
              "
              title="Last Page"
            >
              <ChevronsRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- GRID VIEW: 3 Columns x 5 Rows (15 cards per page) with full pagination -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <div
          v-for="alert in displayedBoardAlerts"
          :key="alert.id"
          :id="`alert-card-${alert.id}`"
          @click="emit('selectAlert', alert.regulationId)"
          :class="`w-full bg-white border rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
            alert.isOverdueSLA
              ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/15'
              : 'border-neutral-200 hover:border-neutral-300'
          }`"
        >
          <div>
            <!-- Top Row: Regulator + Relevance -->
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-bold text-neutral-900 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-lg shrink-0 font-mono">
                  {{ alert.regulatorAcronym }}
                </span>
                <span class="text-xs font-medium text-neutral-600 truncate">
                  {{ alert.regulator }}
                </span>
              </div>

              <div class="shrink-0 flex items-center gap-1.5">
                <span
                  v-if="normalizeRelevance(alert.materiality) === 'Direct / Highly Relevant'"
                  class="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                >
                  <Flame class="w-3 h-3 text-rose-600" />
                  Direct / Highly Relevant
                </span>
                <span
                  v-else-if="normalizeRelevance(alert.materiality) === 'Relevant'"
                  class="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                >
                  Relevant
                </span>
                <span
                  v-else
                  class="bg-neutral-100 text-neutral-700 text-[11px] font-medium px-2 py-0.5 rounded-full"
                >
                  {{ normalizeRelevance(alert.materiality) }}
                </span>
              </div>
            </div>

            <!-- Alert Title -->
            <h4 class="text-sm font-bold text-neutral-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
              {{ alert.title }}
            </h4>

            <!-- Category & Themes Fields -->
            <div class="space-y-1.5 my-2.5 text-[11px] border-y border-neutral-100 py-1.5">
              <div class="flex items-center gap-1.5">
                <span class="text-neutral-500 font-medium shrink-0">Category:</span>
                <span class="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md truncate max-w-[220px]">
                  {{ alert.category || 'Financial Services & Capital Markets' }}
                </span>
              </div>
              <div class="flex items-start gap-1.5">
                <span class="text-neutral-500 font-medium shrink-0 pt-0.5">Themes:</span>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="thm in (alert.themes && alert.themes.length > 0 ? alert.themes : ['Compliance & Governance'])"
                    :key="thm"
                    class="text-[10px] font-medium px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200 max-w-[190px] truncate"
                  >
                    {{ thm }}
                  </span>
                </div>
              </div>
            </div>

            <!-- AI Relevance Summary Box -->
            <p class="mt-2 text-xs text-neutral-700 leading-relaxed line-clamp-2 bg-neutral-50/90 p-2.5 rounded-xl border border-neutral-200/80">
              <span class="text-neutral-900 font-bold">AI Impact: </span>
              {{ alert.aiRelevanceSummary }}
            </p>
          </div>

          <!-- Card Footer -->
          <div class="mt-4 pt-3 border-t border-neutral-100">
            <div class="flex items-center justify-between text-xs text-neutral-500 mb-3 font-mono">
              <span>Date: {{ alert.publishDate }}</span>
              <div class="flex items-center gap-1">
                <Clock :class="`w-3.5 h-3.5 ${alert.isOverdueSLA ? 'text-rose-600' : 'text-neutral-400'}`" />
                <span
                  :class="
                    alert.isOverdueSLA
                      ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200'
                      : 'text-neutral-600'
                  "
                >
                  {{ alert.isOverdueSLA ? `SLA Overdue (${alert.slaDeadline})` : `SLA: ${alert.slaDeadline}` }}
                </span>
              </div>
            </div>

            <!-- Action Buttons: Acknowledge & Dismiss only -->
            <div class="flex items-center justify-between gap-2" @click.stop>
              <div class="flex items-center gap-2 w-full">
                <!-- Acknowledge Button: card disappears from News Feed & syncs to Directory Bookmarks -->
                <button
                  type="button"
                  @click="handleAcknowledgeClick(alert, $event)"
                  :disabled="acknowledgingAlertIds.includes(alert.id)"
                  class="flex-1 py-1.5 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer bg-blue-600 hover:bg-blue-700"
                  title="Acknowledge alert and add to Directory Bookmarks"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>Acknowledge</span>
                </button>

                <!-- Dismiss Button: disappears from feed, accessible via History -->
                <button
                  type="button"
                  @click="handleDismissClick(alert, $event)"
                  :disabled="dismissingAlertIds.includes(alert.id)"
                  class="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-neutral-200"
                  title="Dismiss from active feed and save to History"
                >
                  <XCircle class="w-3.5 h-3.5 text-neutral-400" />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid Mode Pagination Bar (3x5 = 15 cards per page) -->
      <div
        v-if="filteredAlerts.length > 0"
        class="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600"
      >
        <!-- Left: Count description -->
        <div class="flex items-center gap-1.5 font-normal">
          <span>Showing</span>
          <span class="font-semibold text-neutral-900 font-mono">
            {{ filteredAlerts.length > 0 ? gridStartIndex + 1 : 0 }}
          </span>
          <span>to</span>
          <span class="font-semibold text-neutral-900 font-mono">{{ gridEndIndex }}</span>
          <span>of</span>
          <span class="font-semibold text-neutral-900 font-mono">{{ filteredAlerts.length }}</span>
          <span>alerts (3×5 per page)</span>
        </div>

        <!-- Right: Page navigation controls -->
        <div class="flex items-center gap-1 ml-auto">
          <!-- First Page (<<) -->
          <button
            type="button"
            @click="goToGridPage(1)"
            :disabled="gridCurrentPage === 1"
            class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
            :class="
              gridCurrentPage === 1
                ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
            "
            title="First Page"
          >
            <ChevronsLeft class="w-3.5 h-3.5" />
          </button>

          <!-- Prev Page (<) -->
          <button
            type="button"
            @click="prevGridPage"
            :disabled="gridCurrentPage === 1"
            class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
            :class="
              gridCurrentPage === 1
                ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
            "
            title="Previous Page"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
          </button>

          <!-- Numbered Pages -->
          <div class="hidden sm:flex items-center gap-1">
            <template v-for="(p, idx) in gridVisiblePages" :key="`grid-page-${idx}`">
              <span v-if="p === '...'" class="px-1 text-neutral-400 font-medium">...</span>
              <button
                v-else
                type="button"
                @click="goToGridPage(p)"
                class="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer"
                :class="
                  p === gridCurrentPage
                    ? 'bg-blue-600 text-white shadow-2xs border border-blue-600'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200'
                "
              >
                {{ p }}
              </button>
            </template>
          </div>

          <!-- Mobile Compact Page Indicator -->
          <span class="sm:hidden px-2 text-xs font-semibold text-neutral-700">
            {{ gridCurrentPage }} / {{ gridTotalPages }}
          </span>

          <!-- Next Page (>) -->
          <button
            type="button"
            @click="nextGridPage"
            :disabled="gridCurrentPage === gridTotalPages"
            class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
            :class="
              gridCurrentPage === gridTotalPages
                ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
            "
            title="Next Page"
          >
            <ChevronRight class="w-3.5 h-3.5" />
          </button>

          <!-- Last Page (>>) -->
          <button
            type="button"
            @click="goToGridPage(gridTotalPages)"
            :disabled="gridCurrentPage === gridTotalPages"
            class="w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer"
            :class="
              gridCurrentPage === gridTotalPages
                ? 'border-neutral-200 text-neutral-300 bg-neutral-50 cursor-not-allowed'
                : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 shadow-2xs'
            "
            title="Last Page"
          >
            <ChevronsRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
