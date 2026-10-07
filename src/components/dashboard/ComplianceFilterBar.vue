<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Search,
  Globe,
  Shield,
  Layers,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronDown,
} from 'lucide-vue-next';
import ComboboxFilter from '@/components/common/ComboboxFilter.vue';
import { REGULATORY_CATEGORIES } from '@/types';

export interface ComplianceFilterBarProps {
  activeTab: 'regulations' | 'regulators';
  searchQuery: string;
  selectedJurisdictions: string[];
  availableJurisdictions: string[];
  selectedThemes: string[];
  availableThemes: readonly string[] | string[];
  selectedCategories: string[];
  selectedMateriality: string;
  selectedStatus: string;
  matchingCount?: number;
  totalCount?: number;
}

const props = defineProps<ComplianceFilterBarProps>();

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void;
  (e: 'update:selectedJurisdictions', val: string[]): void;
  (e: 'update:selectedThemes', val: string[]): void;
  (e: 'update:selectedCategories', val: string[]): void;
  (e: 'update:selectedMateriality', val: string): void;
  (e: 'update:selectedStatus', val: string): void;
  (e: 'clearAll'): void;
}>();

const isMoreFiltersOpen = ref(false);
const moreFiltersRef = ref<HTMLDivElement | null>(null);

const handleClickOutside = (event: MouseEvent) => {
  if (moreFiltersRef.value && !moreFiltersRef.value.contains(event.target as Node)) {
    isMoreFiltersOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const secondaryFiltersCount = computed(
  () => props.selectedCategories.length + (props.selectedMateriality !== 'All' ? 1 : 0)
);

const hasActiveFilters = computed(
  () =>
    props.searchQuery.trim() !== '' ||
    props.selectedJurisdictions.length > 0 ||
    props.selectedThemes.length > 0 ||
    props.selectedCategories.length > 0 ||
    props.selectedMateriality !== 'All' ||
    (props.activeTab === 'regulations' && props.selectedStatus !== 'All')
);
</script>

<template>
  <div class="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
    <!-- Primary Row: Search input + primary shared filters + conditional status + More Filters -->
    <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
      <!-- 1. Search input -->
      <div class="relative flex-1 min-w-[200px]">
        <label for="input-compliance-search" class="sr-only">Search</label>
        <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="input-compliance-search"
          type="text"
          :value="searchQuery"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          :placeholder="
            activeTab === 'regulations'
              ? 'Search title, reference, or regulator...'
              : 'Search authority name or acronym...'
          "
          title="Search"
          aria-label="Search"
          class="w-full h-9 pl-9 pr-8 bg-white rounded-lg border border-neutral-300 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all"
        />
        <button
          v-if="searchQuery"
          type="button"
          @click="emit('update:searchQuery', '')"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
          title="Clear search"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- 2. Primary Shared & Conditional Dimensions -->
      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <!-- Shared Filter 1: Jurisdictions -->
        <ComboboxFilter
          id="filter-jurisdictions"
          label="Jurisdictions"
          :options="availableJurisdictions"
          :selectedValues="selectedJurisdictions"
          @update:selectedValues="emit('update:selectedJurisdictions', $event)"
          placeholder="All"
        >
          <template #icon>
            <Globe class="w-3.5 h-3.5 text-neutral-500" />
          </template>
        </ComboboxFilter>

        <!-- Shared Filter 2: Themes -->
        <ComboboxFilter
          id="filter-themes"
          label="Themes"
          :options="availableThemes"
          :selectedValues="selectedThemes"
          @update:selectedValues="emit('update:selectedThemes', $event)"
          placeholder="All"
        >
          <template #icon>
            <Shield class="w-3.5 h-3.5 text-neutral-500" />
          </template>
        </ComboboxFilter>

        <!-- Conditional Dimension: Status (Exclusive to Regulations Tab) -->
        <div v-if="activeTab === 'regulations'" class="relative">
          <select
            id="select-filter-status"
            :value="selectedStatus"
            @change="emit('update:selectedStatus', ($event.target as HTMLSelectElement).value)"
            :class="`h-9 px-3 bg-white border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer min-w-[120px] transition-all ${
              selectedStatus !== 'All'
                ? 'border-blue-300 bg-blue-50/50 text-blue-900'
                : 'border-neutral-300 text-neutral-700'
            }`"
          >
            <option value="All">Status: All</option>
            <option value="Not Imported">Status: Not Imported</option>
            <option value="In Progress">Status: In Progress</option>
            <option value="Imported">Status: Imported</option>
          </select>
        </div>

        <!-- Secondary Dimensions Toggle: More Filters (Popover) -->
        <div class="relative" ref="moreFiltersRef">
          <button
            id="btn-more-filters"
            type="button"
            @click="isMoreFiltersOpen = !isMoreFiltersOpen"
            :class="`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isMoreFiltersOpen || secondaryFiltersCount > 0
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-300'
            }`"
            title="Category, Relevance"
          >
            <SlidersHorizontal class="w-3.5 h-3.5 text-neutral-500" />
            <span>Filters</span>
            <span
              v-if="secondaryFiltersCount > 0"
              class="w-4 h-4 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold"
            >
              {{ secondaryFiltersCount }}
            </span>
            <ChevronDown
              :class="`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                isMoreFiltersOpen ? 'rotate-180 text-blue-600' : ''
              }`"
            />
          </button>

          <!-- More Filters Popover -->
          <div
            v-if="isMoreFiltersOpen"
            class="absolute right-0 z-50 mt-1.5 w-80 sm:w-96 bg-white rounded-xl border border-neutral-200 shadow-xl p-4 text-xs space-y-3 animate-in fade-in zoom-in-95"
          >
            <div class="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span class="font-semibold text-neutral-900 flex items-center gap-1.5">
                <SlidersHorizontal class="w-3.5 h-3.5 text-blue-600" />
                Additional Filters
              </span>
              <button
                v-if="secondaryFiltersCount > 0"
                type="button"
                @click="
                  emit('update:selectedCategories', []);
                  emit('update:selectedMateriality', 'All');
                "
                class="text-blue-600 hover:underline text-xs font-semibold cursor-pointer"
              >
                Reset
              </button>
            </div>

            <!-- Secondary Dimension 1: Regulatory Category -->
            <div class="space-y-1">
              <label class="text-neutral-700 font-semibold block text-xs">
                Category
              </label>
              <ComboboxFilter
                id="filter-category"
                label="Category"
                :options="REGULATORY_CATEGORIES"
                :selectedValues="selectedCategories"
                @update:selectedValues="emit('update:selectedCategories', $event)"
                placeholder="All Categories"
                className="w-full"
              >
                <template #icon>
                  <Layers class="w-3.5 h-3.5 text-neutral-500" />
                </template>
              </ComboboxFilter>
            </div>

            <!-- Secondary Dimension 2: Relevance Tier -->
            <div class="space-y-1">
              <label class="text-neutral-700 font-semibold block text-xs">
                Relevance
              </label>
              <select
                id="select-filter-materiality"
                :value="selectedMateriality"
                @change="emit('update:selectedMateriality', ($event.target as HTMLSelectElement).value)"
                :class="`w-full h-9 px-3 bg-white border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer transition-all ${
                  selectedMateriality !== 'All'
                    ? 'border-blue-300 bg-blue-50/50 text-blue-900'
                    : 'border-neutral-300 text-neutral-700'
                }`"
              >
                <option value="All">All Relevance</option>
                <option value="Direct / Highly Relevant">Direct / Highly Relevant</option>
                <option value="Relevant">Relevant</option>
                <option value="Partially Relevant">Partially Relevant</option>
              </select>
            </div>

            <!-- Popover Footer -->
            <div class="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="
                    emit('update:selectedCategories', []);
                    emit('update:selectedMateriality', 'All');
                  "
                  class="px-2.5 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  @click="
                    emit('clearAll');
                    isMoreFiltersOpen = false;
                  "
                  class="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Clear All
                </button>
              </div>
              <button
                type="button"
                @click="isMoreFiltersOpen = false"
                class="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <!-- Clear Filters (Quick Reset) -->
        <button
          v-if="hasActiveFilters"
          id="btn-clear-compliance-filters"
          type="button"
          @click="emit('clearAll')"
          class="h-9 px-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          title="Reset filters"
        >
          <RotateCcw class="w-3 h-3 text-neutral-500" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Active Filter Chips & Match Feedback Line -->
    <div
      v-if="hasActiveFilters || (matchingCount !== undefined && totalCount !== undefined)"
      class="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600"
    >
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-neutral-500 font-medium text-xs">Active:</span>

        <span
          v-if="searchQuery.trim()"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200"
        >
          Search: "{{ searchQuery }}"
          <button
            type="button"
            @click="emit('update:searchQuery', '')"
            class="hover:text-neutral-900 cursor-pointer"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="selectedJurisdictions.length > 0"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
        >
          Jurisdictions: {{ selectedJurisdictions.join(', ') }}
          <button
            type="button"
            @click="emit('update:selectedJurisdictions', [])"
            class="hover:text-blue-900 cursor-pointer"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="selectedThemes.length > 0"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
        >
          Themes ({{ selectedThemes.length }})
          <button
            type="button"
            @click="emit('update:selectedThemes', [])"
            class="hover:text-blue-900 cursor-pointer"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="activeTab === 'regulations' && selectedStatus !== 'All'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
        >
          Status: {{ selectedStatus }}
          <button
            type="button"
            @click="emit('update:selectedStatus', 'All')"
            class="hover:text-blue-900 cursor-pointer"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="selectedCategories.length > 0"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200"
        >
          Categories ({{ selectedCategories.length }})
          <button
            type="button"
            @click="emit('update:selectedCategories', [])"
            class="hover:text-neutral-900 cursor-pointer"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="selectedMateriality !== 'All'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-300"
        >
          Relevance: {{ selectedMateriality }}
          <button
            type="button"
            @click="emit('update:selectedMateriality', 'All')"
            class="hover:text-neutral-950 cursor-pointer"
          >
            <X class="w-3 h-3" />
          </button>
        </span>
      </div>

      <!-- Matching Count Feedback -->
      <span
        v-if="matchingCount !== undefined && totalCount !== undefined"
        class="text-xs text-neutral-500 font-mono ml-auto"
      >
        Showing {{ matchingCount }} of {{ totalCount }}
        {{ activeTab === 'regulations' ? 'regulations' : 'regulators' }}
      </span>
    </div>
  </div>
</template>
