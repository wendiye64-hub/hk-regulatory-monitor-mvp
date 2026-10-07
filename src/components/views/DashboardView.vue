<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Radio,
  SlidersHorizontal,
} from 'lucide-vue-next';
import type {
  RegulationItem,
  PriorityAlert,
  RegulatorInScope,
  FrameworkCardData,
  CoverageGapDiagnostic,
} from '@/types';
import PriorityAlertFeed from '../dashboard/PriorityAlertFeed.vue';
import RegulatorsTable from '../dashboard/RegulatorsTable.vue';
import ComplianceFilterBar from '../dashboard/ComplianceFilterBar.vue';
import AlertHistoryModal from '../modals/AlertHistoryModal.vue';
import { useMonitorStore } from '@/stores/monitorStore';

const monitorStore = useMonitorStore();

const props = defineProps<{
  coverageGaps?: CoverageGapDiagnostic;
  priorityAlerts: PriorityAlert[];
  regulations: RegulationItem[];
  regulators: RegulatorInScope[];
  frameworks?: FrameworkCardData[];
  availableThemes: string[];
  availableJurisdictions: string[];
}>();

const emit = defineEmits<{
  (e: 'selectRegulation', regulation: RegulationItem): void;
  (e: 'selectAlert', regulationId: string): void;
  (e: 'acknowledgeAlert', alertId: string): void;
  (e: 'dismissAlert', alertId: string): void;
  (e: 'restoreAlert', alertId: string): void;
  (e: 'bulkImport', regulationIds: string[]): void;
  (e: 'singleImport', regulation: RegulationItem): void;
  (e: 'toggleFollowRegulator', regulatorId: string): void;
  (e: 'toggleSubScopeFollow', regulatorId: string, subScopeId: string): void;
  (e: 'editRegulator', reg: RegulatorInScope): void;
  (e: 'selectFramework', framework: FrameworkCardData): void;
  (e: 'newFramework'): void;
  (e: 'openScopeConfig'): void;
}>();

// Frameworks & Monitor Top Navigation: News Feed | Watchlist
const activeTopTab = ref<'news-feed' | 'watchlist'>('news-feed');
const isHistoryModalOpen = ref(false);

// Filter dimensions for Watchlist
const searchQuery = ref('');
const selectedJurisdictions = ref<string[]>([]);
const selectedThemes = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedMateriality = ref('All');
const selectedStatus = ref('All');

const handleClearFilters = () => {
  searchQuery.value = '';
  selectedJurisdictions.value = [];
  selectedThemes.value = [];
  selectedCategories.value = [];
  selectedMateriality.value = 'All';
  selectedStatus.value = 'All';
};

const followedRegulators = computed(() => {
  return props.regulators.filter((r) => r.isFollowed);
});

const matchingRegulatorsCount = computed(() => {
  return props.regulators.filter((r) => {
    if (!r.isFollowed) return false;
    const matchesSearch =
      searchQuery.value.trim() === '' ||
      r.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.acronym.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.jurisdiction.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesJurisdiction =
      selectedJurisdictions.value.length === 0 ||
      selectedJurisdictions.value.includes(r.jurisdiction);
    const matchesCategory =
      selectedCategories.value.length === 0 || selectedCategories.value.includes(r.category);
    const matchesTheme =
      selectedThemes.value.length === 0 ||
      (r.themes && r.themes.some((th) => selectedThemes.value.includes(th)));
    return matchesSearch && matchesJurisdiction && matchesCategory && matchesTheme;
  }).length;
});
</script>

<template>
  <div id="workspace-dashboard-view" class="monitor-dashboard-view w-full p-4 sm:p-6 lg:p-8 space-y-5 animate-in fade-in">
    <!-- Top Bar: Segmented Switch [ News Feed | Watchlist ] & Watchlist Search Modal Trigger -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
      <!-- Segmented Navigation: News Feed | Watchlist -->
      <div class="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-2xs">
        <button
          id="tab-btn-news-feed"
          @click="activeTopTab = 'news-feed'"
          :class="`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTopTab === 'news-feed'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`"
        >
          <Radio class="w-4 h-4 text-blue-600" />
          <span>News Feed</span>
          <span
            :class="`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
              activeTopTab === 'news-feed' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
            }`"
          >
            {{ priorityAlerts.filter((a) => a.status === 'pending').length }}
          </span>
        </button>

        <button
          id="tab-btn-watchlist"
          @click="activeTopTab = 'watchlist'"
          :class="`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTopTab === 'watchlist'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`"
        >
          <Building2 class="w-4 h-4 text-blue-600" />
          <span>Watchlist</span>
          <span
            :class="`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
              activeTopTab === 'watchlist' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
            }`"
          >
            {{ followedRegulators.length }}
          </span>
        </button>
      </div>

      <!-- Watchlist Search Button (triggers Drawer Modal) -->
      <button
        id="btn-watchlist-search"
        @click="emit('openScopeConfig')"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors shadow-2xs self-end sm:self-auto cursor-pointer"
        title="Open Watchlist Search"
      >
        <SlidersHorizontal class="w-3.5 h-3.5 text-blue-600" />
        <span>Watchlist Search</span>
      </button>
    </div>

    <!-- VIEW 1: News Feed (PriorityAlertFeed full-page view) -->
    <div v-if="activeTopTab === 'news-feed'" class="w-full space-y-4">
      <PriorityAlertFeed
        :alerts="priorityAlerts"
        @selectAlert="emit('selectAlert', $event)"
        @acknowledge="emit('acknowledgeAlert', $event)"
        @dismiss="emit('dismissAlert', $event)"
        @openHistory="isHistoryModalOpen = true"
      />
    </div>

    <!-- VIEW 2: Watchlist (Regulators full-page view) -->
    <div v-else-if="activeTopTab === 'watchlist'" class="w-full space-y-4">
      <!-- Filter Bar for Watchlist -->
      <ComplianceFilterBar
        activeTab="regulators"
        v-model:searchQuery="searchQuery"
        v-model:selectedJurisdictions="selectedJurisdictions"
        :availableJurisdictions="availableJurisdictions"
        v-model:selectedThemes="selectedThemes"
        :availableThemes="availableThemes"
        v-model:selectedCategories="selectedCategories"
        v-model:selectedMateriality="selectedMateriality"
        v-model:selectedStatus="selectedStatus"
        @clearAll="handleClearFilters"
        :matchingCount="matchingRegulatorsCount"
        :totalCount="followedRegulators.length"
      />

      <!-- Watchlist Full Table -->
      <RegulatorsTable
        :regulators="regulators"
        :availableThemes="availableThemes"
        :availableJurisdictions="availableJurisdictions"
        :externalFilters="{
          searchQuery,
          selectedJurisdictions,
          selectedThemes,
          selectedCategories,
          selectedMateriality,
        }"
        @toggleFollow="emit('toggleFollowRegulator', $event)"
        @toggleSubScopeFollow="emit('toggleSubScopeFollow', $event[0], $event[1])"
        @openConfigDrawer="emit('openScopeConfig')"
        @editRegulator="emit('editRegulator', $event)"
      />
    </div>

    <!-- Alert History Modal -->
    <AlertHistoryModal
      v-if="isHistoryModalOpen"
      :isOpen="isHistoryModalOpen"
      :alerts="priorityAlerts"
      @close="isHistoryModalOpen = false"
      @selectAlert="emit('selectAlert', $event)"
      @restoreAlert="emit('restoreAlert', $event)"
    />
  </div>
</template>
