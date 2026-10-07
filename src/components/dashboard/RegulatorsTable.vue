<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  AlertCircle,
  Building2,
  Edit,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from 'lucide-vue-next';
import type {
  RegulatorInScope,
  HealthStatus,
} from '@/types';
import { REGULATORY_THEMES, ALL_JURISDICTIONS } from '@/types';
import ComplianceFilterBar from './ComplianceFilterBar.vue';

export interface RegulatorsTableFilterState {
  searchQuery: string;
  selectedJurisdictions: string[];
  selectedThemes: string[];
  selectedCategories: string[];
  selectedMateriality?: string;
}

const props = withDefaults(
  defineProps<{
    regulators: RegulatorInScope[];
    availableThemes?: readonly string[] | string[];
    availableJurisdictions?: string[];
    externalFilters?: RegulatorsTableFilterState;
  }>(),
  {
    availableThemes: () => [...REGULATORY_THEMES],
    availableJurisdictions: () => [...ALL_JURISDICTIONS],
  }
);

const emit = defineEmits<{
  (e: 'toggleFollow', id: string): void;
  (e: 'toggleSubScopeFollow', regulatorId: string, subScopeId: string): void;
  (e: 'openConfigDrawer'): void;
  (e: 'editRegulator', reg: RegulatorInScope): void;
}>();

const localSearchQuery = ref('');
const localSelectedThemes = ref<string[]>([]);
const localSelectedJurisdictions = ref<string[]>([]);
const localSelectedCategories = ref<string[]>([]);
const localSelectedMateriality = ref('All');
const expandedRegulatorIds = ref<Set<string>>(new Set(['regl-001']));

const toggleExpand = (id: string) => {
  const next = new Set(expandedRegulatorIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedRegulatorIds.value = next;
};

const searchQuery = computed(() =>
  props.externalFilters ? props.externalFilters.searchQuery : localSearchQuery.value
);
const selectedThemes = computed(() =>
  props.externalFilters ? props.externalFilters.selectedThemes : localSelectedThemes.value
);
const selectedJurisdictions = computed(() =>
  props.externalFilters ? props.externalFilters.selectedJurisdictions : localSelectedJurisdictions.value
);
const selectedCategories = computed(() =>
  props.externalFilters ? props.externalFilters.selectedCategories : localSelectedCategories.value
);
const selectedMateriality = computed(
  () => props.externalFilters?.selectedMateriality ?? localSelectedMateriality.value
);

const handleClearLocalFilters = () => {
  localSearchQuery.value = '';
  localSelectedThemes.value = [];
  localSelectedJurisdictions.value = [];
  localSelectedCategories.value = [];
  localSelectedMateriality.value = 'All';
};

const filteredRegulators = computed(() => {
  return props.regulators.filter((r) => {
    if (!r.isFollowed) return false;

    const matchesSearch =
      searchQuery.value.trim() === '' ||
      r.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.acronym.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.jurisdiction.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesJurisdiction =
      selectedJurisdictions.value.length === 0 || selectedJurisdictions.value.includes(r.jurisdiction);

    const matchesCategory =
      selectedCategories.value.length === 0 || selectedCategories.value.includes(r.category);

    const matchesTheme =
      selectedThemes.value.length === 0 ||
      (r.themes && r.themes.some((th) => selectedThemes.value.includes(th)));

    return matchesSearch && matchesJurisdiction && matchesCategory && matchesTheme;
  });
});

// --- Pagination State (20 / 40 / 60 / 100 per page) ---
const PAGE_SIZE_OPTIONS = [20, 40, 60, 100] as const;
const pageSize = ref<number>(20);
const currentPage = ref<number>(1);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRegulators.value.length / pageSize.value));
});

// Clamp currentPage if totalPages decreases or pageSize changes
watch([filteredRegulators, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

// Reset to page 1 whenever filters change
watch(
  [
    searchQuery,
    selectedThemes,
    selectedJurisdictions,
    selectedCategories,
    selectedMateriality,
  ],
  () => {
    currentPage.value = 1;
  }
);

const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + pageSize.value, filteredRegulators.value.length)
);

const paginatedRegulators = computed(() => {
  return filteredRegulators.value.slice(startIndex.value, endIndex.value);
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
</script>

<template>
  <div id="tab-regulators-in-scope" class="space-y-3">
    <!-- If externalFilters is NOT provided, render the standalone ComplianceFilterBar -->
    <ComplianceFilterBar
      v-if="!externalFilters"
      activeTab="regulators"
      v-model:searchQuery="localSearchQuery"
      v-model:selectedJurisdictions="localSelectedJurisdictions"
      :availableJurisdictions="availableJurisdictions"
      v-model:selectedThemes="localSelectedThemes"
      :availableThemes="availableThemes"
      v-model:selectedCategories="localSelectedCategories"
      v-model:selectedMateriality="localSelectedMateriality"
      selectedStatus="All"
      @clearAll="handleClearLocalFilters"
      :matchingCount="filteredRegulators.length"
      :totalCount="regulators.filter((r) => r.isFollowed).length"
    />

    <!-- Regulators In-Scope Table -->
    <div class="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100 border-b border-slate-300 text-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <th class="py-3 px-4 min-w-[240px]">Regulator Authority</th>
              <th class="py-3 px-3">Jurisdiction</th>
              <th class="py-3 px-3">Category</th>
              <th class="py-3 px-3 text-center">Monitoring</th>
              <th class="py-3 px-3">Cadence</th>
              <th class="py-3 px-3 min-w-[180px]">Bound Themes</th>
              <th class="py-3 px-3">Last Checked</th>
              <th class="py-3 px-3 min-w-[200px]">Latest Publication Detected</th>
              <th class="py-3 px-3">Endpoint Health</th>
              <th class="py-3 px-3 text-center">Open Alerts</th>
              <th class="py-3 px-3">Owner</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/80 text-slate-800">
            <tr v-if="filteredRegulators.length === 0">
              <td colspan="11" class="py-12 text-center text-slate-500">
                <Building2 class="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p class="font-semibold text-slate-700">No followed regulators match criteria</p>
                <p class="text-xs text-slate-400 mt-1">
                  Only actively followed authorities appear in this scope. Click "Watchlist Search" to follow additional authorities.
                </p>
              </td>
            </tr>
            <template v-else v-for="reg in paginatedRegulators" :key="reg.id">
              <tr
                :id="`regulator-row-${reg.id}`"
                class="even:bg-slate-50/40 odd:bg-white hover:bg-blue-50/60 transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                      {{ reg.acronym.slice(0, 3) }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-slate-900">{{ reg.name }}</span>
                        <button
                          type="button"
                          @click="emit('editRegulator', reg)"
                          class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                          title="Edit regulator cadence, category and themes"
                        >
                          <Edit class="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-slate-600 font-mono font-medium">
                          {{ reg.acronym }}
                        </span>
                        <button
                          v-if="reg.subScopes && reg.subScopes.length > 0"
                          type="button"
                          @click="toggleExpand(reg.id)"
                          class="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer"
                        >
                          <ChevronDown v-if="expandedRegulatorIds.has(reg.id)" class="w-3 h-3 text-blue-600" />
                          <ChevronRight v-else class="w-3 h-3 text-slate-400" />
                          <span>{{ reg.subScopes.length }} sub-scopes</span>
                          <span class="font-mono text-[9px] text-blue-700 font-bold">
                            ({{ reg.subScopes.filter((s) => s.isFollowed).length }} on)
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </td>

                <td class="py-3 px-3 font-medium text-slate-700">
                  {{ reg.jurisdiction }}
                </td>

                <td class="py-3 px-3">
                  <span class="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">
                    {{ reg.category }}
                  </span>
                </td>

                <td class="py-3 px-3 text-center">
                  <button
                    @click="emit('toggleFollow', reg.id)"
                    :class="`h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      reg.isFollowed
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`"
                  >
                    {{ reg.isFollowed ? 'Following' : '+ Follow' }}
                  </button>
                </td>

                <td class="py-3 px-3">
                  <span class="text-slate-700 font-medium">
                    {{ reg.cadence }}
                  </span>
                </td>

                <td class="py-3 px-3">
                  <div class="flex flex-wrap gap-1 items-center">
                    <span
                      v-for="(theme, idx) in reg.themes.slice(0, 2)"
                      :key="`${theme}-${idx}`"
                      class="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold"
                    >
                      {{ theme }}
                    </span>
                    <span
                      v-if="reg.themes.length > 2"
                      class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md font-semibold cursor-help transition-colors"
                      :title="`Additional themes: ${reg.themes.slice(2).join(', ')}`"
                    >
                      +{{ reg.themes.length - 2 }}
                    </span>
                  </div>
                </td>

                <td class="py-3 px-3 text-slate-600 font-mono text-xs whitespace-nowrap font-medium">
                  {{ reg.lastChecked }}
                </td>

                <td class="py-3 px-3">
                  <span class="font-medium text-slate-900 line-clamp-1">
                    {{ reg.latestPublication }}
                  </span>
                </td>

                <td class="py-3 px-3 whitespace-nowrap">
                  <span
                    v-if="reg.health === 'Healthy'"
                    class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Healthy
                    <span v-if="reg.endpointLatencyMs" class="text-[10px] text-emerald-600 font-mono">
                      ({{ reg.endpointLatencyMs }}ms)
                    </span>
                  </span>
                  <span
                    v-else-if="reg.health === 'Degraded'"
                    class="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Degraded
                    <span v-if="reg.endpointLatencyMs" class="text-[10px] text-amber-600 font-mono">
                      ({{ reg.endpointLatencyMs }}ms)
                    </span>
                  </span>
                  <span
                    v-else
                    class="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                  >
                    <AlertCircle class="w-3 h-3 text-rose-600" />
                    Failed
                  </span>
                </td>

                <td class="py-3 px-3 text-center">
                  <span
                    v-if="reg.openAlertsCount > 0"
                    class="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full"
                  >
                    {{ reg.openAlertsCount }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>

                <td class="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                  {{ reg.owner }}
                </td>
              </tr>

              <!-- Expandable Child Sub-Scopes Rows -->
              <template v-if="expandedRegulatorIds.has(reg.id) && reg.subScopes">
                <tr
                  v-for="sub in reg.subScopes"
                  :key="`${reg.id}-${sub.id}`"
                  class="bg-blue-50/25 hover:bg-blue-50/50 border-l-4 border-l-blue-500 text-xs transition-colors"
                >
                  <td class="py-2.5 px-4 pl-10">
                    <div class="space-y-0.5">
                      <div class="font-bold text-slate-900 flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                        <span>{{ sub.name }}</span>
                        <span class="font-mono text-[10px] bg-white border border-blue-200 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                          {{ sub.code }}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-500 line-clamp-1">
                        {{ sub.description }}
                      </p>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-slate-600 font-medium">
                    {{ reg.jurisdiction }}
                  </td>
                  <td class="py-2.5 px-3">
                    <span class="bg-white text-slate-600 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {{ reg.category }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      @click="emit('toggleSubScopeFollow', reg.id, sub.id)"
                      :class="`h-6 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sub.isFollowed
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                      }`"
                    >
                      {{ sub.isFollowed ? 'Following' : '+ Follow' }}
                    </button>
                  </td>
                  <td class="py-2.5 px-3 text-slate-700 font-medium">
                    <span class="flex items-center gap-1">
                      <Clock class="w-3 h-3 text-slate-400" />
                      {{ sub.cadence }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="(th, idx) in sub.themes.slice(0, 2)"
                        :key="`${th}-${idx}`"
                        class="text-[9px] bg-white border border-slate-200 text-slate-700 px-1 py-0.5 rounded"
                      >
                        {{ th }}
                      </span>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                    {{ reg.lastChecked }}
                  </td>
                  <td class="py-2.5 px-3 text-slate-500 text-[11px] italic">
                    Child entity continuous feed
                  </td>
                  <td class="py-2.5 px-3">
                    <span
                      v-if="reg.health === 'Healthy'"
                      class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                    >
                      Healthy
                    </span>
                    <span
                      v-else-if="reg.health === 'Degraded'"
                      class="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                    >
                      Degraded
                    </span>
                    <span
                      v-else
                      class="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                    >
                      Failed
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <span
                      v-if="sub.openAlertsCount > 0"
                      class="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px]"
                    >
                      {{ sub.openAlertsCount }}
                    </span>
                    <span v-else class="text-slate-400 text-[10px]">0</span>
                  </td>
                  <td class="py-2.5 px-3 text-slate-600 text-[11px]">
                    {{ reg.owner }}
                  </td>
                </tr>
              </template>
            </template>
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
              {{ filteredRegulators.length === 0 ? 0 : startIndex + 1 }}–{{ endIndex }}
            </span>
            of
            <span class="font-bold text-slate-900">{{ filteredRegulators.length }}</span>
            regulators in scope
          </span>
          <span
            v-if="filteredRegulators.length !== regulators.filter((r) => r.isFollowed).length"
            class="text-[11px] text-slate-400 font-normal"
          >
            (filtered from {{ regulators.filter((r) => r.isFollowed).length }} followed)
          </span>
        </div>

        <!-- Right: Rows per page & Page Navigation -->
        <div class="flex items-center gap-3 flex-wrap ml-auto">
          <!-- Per Page Selector (20 / 40 / 60 / 100) -->
          <div class="flex items-center gap-1.5">
            <label for="select-page-size-reg" class="text-slate-500 font-medium whitespace-nowrap">
              Per page:
            </label>
            <select
              id="select-page-size-reg"
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
