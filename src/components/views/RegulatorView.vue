<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Building2,
  Search,
  Check,
  Plus,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  ShieldCheck,
  Globe,
  X,
} from 'lucide-vue-next';
import type { RegulatorInScope } from '@/types';
import { ALL_JURISDICTIONS, SECTOR_GROUPS } from '@/types';
import { useTaskStore } from '@/stores/taskStore';
import ComboboxFilter from '@/components/common/ComboboxFilter.vue';
import PaginationController from '@/components/common/PaginationController.vue';

const props = defineProps<{
  regulators: RegulatorInScope[];
}>();

const emit = defineEmits<{
  (e: 'toggleFollow', regulatorId: string): void;
  (e: 'openRegulatorDetail', regulator: RegulatorInScope): void;
  (e: 'createTaskForRegulators', regulators: Array<{ id: string; name: string; acronym?: string; jurisdiction?: string }>): void;
}>();

const taskStore = useTaskStore();

// Top segment filter: 'all' vs 'following'
const activeSegment = ref<'all' | 'following'>('all');

// Search & Multi-Select Filter state
// NOTE: Regulator is an objective entity with NO timestamp nature, strictly NO DATE FILTER!
const searchQuery = ref('');
const selectedJurisdictions = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedFollowStatuses = ref<string[]>([]);
const selectedLinkages = ref<string[]>([]);
const sortField = ref<'name' | 'jurisdiction' | 'linkage'>('name');
const sortDirection = ref<'asc' | 'desc'>('asc');

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    selectedJurisdictions.value.length > 0 ||
    selectedCategories.value.length > 0 ||
    selectedFollowStatuses.value.length > 0 ||
    selectedLinkages.value.length > 0
  );
});

const handleClearAllFilters = () => {
  searchQuery.value = '';
  selectedJurisdictions.value = [];
  selectedCategories.value = [];
  selectedFollowStatuses.value = [];
  selectedLinkages.value = [];
};

// Multi-select for batch Task Creation
const selectedRegulatorIds = ref<string[]>([]);

// Expanded sub-scopes tracking
const expandedRegulatorIds = ref<string[]>([]);

const toggleExpand = (id: string) => {
  if (expandedRegulatorIds.value.includes(id)) {
    expandedRegulatorIds.value = expandedRegulatorIds.value.filter((i) => i !== id);
  } else {
    expandedRegulatorIds.value.push(id);
  }
};

const toggleSelectAll = (items: RegulatorInScope[]) => {
  if (selectedRegulatorIds.value.length === items.length) {
    selectedRegulatorIds.value = [];
  } else {
    selectedRegulatorIds.value = items.map((r) => r.id);
  }
};

const toggleSelect = (id: string) => {
  if (selectedRegulatorIds.value.includes(id)) {
    selectedRegulatorIds.value = selectedRegulatorIds.value.filter((i) => i !== id);
  } else {
    selectedRegulatorIds.value.push(id);
  }
};

const handleSort = (field: 'name' | 'jurisdiction' | 'linkage') => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = field === 'linkage' ? 'desc' : 'asc';
  }
};

const filteredRegulators = computed(() => {
  return props.regulators
    .filter((reg) => {
      // Segment filter
      if (activeSegment.value === 'following' && !reg.isFollowed) {
        return false;
      }

      // Follow Status multi-select
      if (selectedFollowStatuses.value.length > 0) {
        const isFollowing = reg.isFollowed;
        const matchFollowing = selectedFollowStatuses.value.includes('Following') && isFollowing;
        const matchNotFollowing = selectedFollowStatuses.value.includes('Not Following') && !isFollowing;
        if (!matchFollowing && !matchNotFollowing) return false;
      }

      // Search Query
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim();
        const match =
          reg.name.toLowerCase().includes(q) ||
          reg.acronym.toLowerCase().includes(q) ||
          reg.jurisdiction.toLowerCase().includes(q) ||
          (reg.category && reg.category.toLowerCase().includes(q)) ||
          (reg.themes && reg.themes.some((t) => t.toLowerCase().includes(q)));
        if (!match) return false;
      }

      // Jurisdiction Multi-Select Filter
      if (
        selectedJurisdictions.value.length > 0 &&
        !selectedJurisdictions.value.includes(reg.jurisdiction)
      ) {
        return false;
      }

      // Category Multi-Select Filter
      if (
        selectedCategories.value.length > 0 &&
        (!reg.category || !selectedCategories.value.includes(reg.category))
      ) {
        return false;
      }

      // Linkage Multi-Select Filter
      if (selectedLinkages.value.length > 0) {
        const count = taskStore.getRegulatorLinkageCount(reg.id || reg.acronym);
        const isLinked = count > 0;
        const matchLinked = selectedLinkages.value.includes('Linked to Tasks') && isLinked;
        const matchUnlinked = selectedLinkages.value.includes('Unlinked') && !isLinked;
        if (!matchLinked && !matchUnlinked) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField.value === 'name') {
        comparison = (a.acronym || a.name).localeCompare(b.acronym || b.name);
      } else if (sortField.value === 'jurisdiction') {
        comparison = a.jurisdiction.localeCompare(b.jurisdiction);
      } else if (sortField.value === 'linkage') {
        const countA = taskStore.getRegulatorLinkageCount(a.id || a.acronym);
        const countB = taskStore.getRegulatorLinkageCount(b.id || b.acronym);
        comparison = countA - countB;
      }
      return sortDirection.value === 'asc' ? comparison : -comparison;
    });
});

const followingCount = computed(() => props.regulators.filter((r) => r.isFollowed).length);

// Pagination for Regulator View (Default 20, options 40, 60, 100)
const pageSize = ref<number>(20);
const currentPage = ref<number>(1);

const paginatedRegulators = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRegulators.value.slice(start, start + pageSize.value);
});

// Watch filters to reset page to 1
watch(
  [
    activeSegment,
    searchQuery,
    selectedJurisdictions,
    selectedCategories,
    selectedFollowStatuses,
    selectedLinkages,
    sortField,
    sortDirection,
  ],
  () => {
    currentPage.value = 1;
  }
);

// Batch create task
const handleCreateTaskForSelection = () => {
  const selected = props.regulators
    .filter((r) => selectedRegulatorIds.value.includes(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      acronym: r.acronym,
      jurisdiction: r.jurisdiction,
    }));
  emit('createTaskForRegulators', selected);
};

const handleCreateTaskForSingle = (reg: RegulatorInScope) => {
  emit('createTaskForRegulators', [
    {
      id: reg.id,
      name: reg.name,
      acronym: reg.acronym,
      jurisdiction: reg.jurisdiction,
    },
  ]);
};
</script>

<template>
  <div class="regulator-view w-full p-4 sm:p-6 lg:p-8 space-y-5 animate-in fade-in">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
      <!-- Left: Segmented Switch [ All Regulators | Following ] -->
      <div class="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-2xs">
        <button
          id="tab-btn-regulators-all"
          @click="activeSegment = 'all'; selectedRegulatorIds = []"
          :class="`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSegment === 'all'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`"
        >
          <Globe class="w-4 h-4 text-blue-600" />
          <span>All Regulators</span>
          <span
            :class="`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
              activeSegment === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
            }`"
          >
            {{ regulators.length }}
          </span>
        </button>

        <button
          id="tab-btn-regulators-following"
          @click="activeSegment = 'following'; selectedRegulatorIds = []"
          :class="`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSegment === 'following'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`"
        >
          <Building2 class="w-4 h-4 text-blue-600" />
          <span>Following</span>
          <span
            :class="`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
              activeSegment === 'following' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-600'
            }`"
          >
            {{ followingCount }}
          </span>
        </button>
      </div>

      <!-- Right: Create Task Button -->
      <div class="flex items-center gap-2.5">
        <button
          v-if="selectedRegulatorIds.length > 0"
          @click="handleCreateTaskForSelection"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer animate-in zoom-in-95"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Create Task ({{ selectedRegulatorIds.length }} Selected)</span>
        </button>

        <button
          v-else
          @click="emit('createTaskForRegulators', [])"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Create Task</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar (NO DATE FILTER FOR REGULATORS - All Multi-Select) -->
    <div class="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
        <!-- Search Input -->
        <div class="relative md:col-span-4">
          <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search authority name, acronym (e.g. HKMA, MAS, FCA, SEC)..."
            class="w-full pl-9 pr-3 h-9 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs text-neutral-900 focus:outline-none transition-colors"
          />
        </div>

        <!-- Jurisdiction Multi-Select -->
        <div class="md:col-span-3">
          <ComboboxFilter
            label="Jurisdiction"
            placeholder="All Jurisdictions"
            :options="ALL_JURISDICTIONS"
            v-model:selectedValues="selectedJurisdictions"
          />
        </div>

        <!-- Category Multi-Select -->
        <div class="md:col-span-3">
          <ComboboxFilter
            label="Category"
            placeholder="All Categories"
            :options="SECTOR_GROUPS"
            v-model:selectedValues="selectedCategories"
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
      <div v-if="hasActiveFilters" class="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs flex-wrap">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-neutral-500 text-[11px] font-medium">Active filters:</span>

          <span
            v-for="jur in selectedJurisdictions"
            :key="jur"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200"
          >
            <span>{{ jur }}</span>
            <button @click="selectedJurisdictions = selectedJurisdictions.filter(j => j !== jur)" class="hover:text-blue-900 cursor-pointer">
              <X class="w-3 h-3" />
            </button>
          </span>

          <span
            v-for="cat in selectedCategories"
            :key="cat"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-200"
          >
            <span>{{ cat }}</span>
            <button @click="selectedCategories = selectedCategories.filter(c => c !== cat)" class="hover:text-indigo-900 cursor-pointer">
              <X class="w-3 h-3" />
            </button>
          </span>

          <span
            v-for="lnk in selectedLinkages"
            :key="lnk"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200"
          >
            <span>{{ lnk }}</span>
            <button @click="selectedLinkages = selectedLinkages.filter(l => l !== lnk)" class="hover:text-purple-900 cursor-pointer">
              <X class="w-3 h-3" />
            </button>
          </span>
        </div>

        <button
          @click="handleClearAllFilters"
          class="text-neutral-500 hover:text-rose-600 font-medium text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
        >
          <X class="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>
    </div>

    <!-- REGULATOR ENTITIES TABLE -->
    <div class="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
      <!-- Empty State -->
      <div
        v-if="filteredRegulators.length === 0"
        class="p-12 text-center space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
          <Building2 class="w-6 h-6 text-neutral-400" />
        </div>
        <h3 class="text-sm font-bold text-neutral-900">No Regulatory Authorities Found</h3>
        <p class="text-xs text-neutral-500 max-w-md mx-auto">
          No regulators match the selected jurisdiction or search keywords.
        </p>
      </div>

      <!-- Table -->
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-700">
          <tr>
            <th class="p-3 w-8">
              <input
                type="checkbox"
                :checked="selectedRegulatorIds.length === paginatedRegulators.length && paginatedRegulators.length > 0"
                @click="toggleSelectAll(paginatedRegulators)"
                class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
            </th>
            <th class="p-3 cursor-pointer select-none" @click="handleSort('name')">
              <div class="flex items-center gap-1.5 hover:text-blue-600">
                <span>Regulatory Authority</span>
                <ArrowUpDown class="w-3 h-3 text-neutral-400" />
              </div>
            </th>
            <th class="p-3 w-36 cursor-pointer select-none" @click="handleSort('jurisdiction')">
              <div class="flex items-center gap-1.5 hover:text-blue-600">
                <span>Jurisdiction</span>
                <ArrowUpDown class="w-3 h-3 text-neutral-400" />
              </div>
            </th>
            <th class="p-3 w-48">Supervisory Category</th>
            <th class="p-3 w-28 cursor-pointer select-none" @click="handleSort('linkage')">
              <div class="flex items-center gap-1.5 hover:text-blue-600">
                <span>Linkage</span>
                <ArrowUpDown class="w-3 h-3 text-neutral-400" />
              </div>
            </th>
            <th class="p-3 w-28">Status</th>
            <th class="p-3 w-52 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100">
          <template v-for="reg in paginatedRegulators" :key="reg.id">
            <tr
              class="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
              @click="emit('openRegulatorDetail', reg)"
            >
              <td class="p-3" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedRegulatorIds.includes(reg.id)"
                  @click.stop="toggleSelect(reg.id)"
                  class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
              </td>
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md shrink-0">
                    {{ reg.acronym || 'REG' }}
                  </span>
                  <div class="min-w-0">
                    <div class="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                      {{ reg.name }}
                    </div>
                    <div v-if="reg.subScopes && reg.subScopes.length > 0" class="text-[11px] text-neutral-400 flex items-center gap-1">
                      <span>{{ reg.subScopes.length }} supervisory divisions</span>
                      <button
                        @click.stop="toggleExpand(reg.id)"
                        class="text-blue-600 hover:underline inline-flex items-center text-[10px]"
                      >
                        {{ expandedRegulatorIds.includes(reg.id) ? 'Collapse' : 'Expand' }}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
              <td class="p-3">
                <span class="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                  {{ reg.jurisdiction }}
                </span>
              </td>
              <td class="p-3 text-neutral-600 truncate max-w-[190px]">
                {{ reg.category || 'Financial Services & Capital Markets' }}
              </td>

              <!-- Linkage Column (Noise reduction: displays numeric count badge) -->
              <td class="p-3">
                <span
                  :class="`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    taskStore.getRegulatorLinkageCount(reg.id || reg.acronym) > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-neutral-400'
                  }`"
                >
                  <Layers class="w-3 h-3" />
                  <span>{{ taskStore.getRegulatorLinkageCount(reg.id || reg.acronym) }} Tasks</span>
                </span>
              </td>

              <!-- Following Status -->
              <td class="p-3">
                <span
                  v-if="reg.isFollowed"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full"
                >
                  <Check class="w-3 h-3 text-blue-600" />
                  <span>Following</span>
                </span>
                <span
                  v-else
                  class="text-[11px] text-neutral-400"
                >
                  Not Following
                </span>
              </td>

              <!-- Actions -->
              <td class="p-3 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click.stop="handleCreateTaskForSingle(reg)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                    title="Create Task for this Regulator"
                  >
                    <Plus class="w-3 h-3" />
                    <span>Create Task</span>
                  </button>

                  <button
                    @click.stop="emit('toggleFollow', reg.id)"
                    :class="`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      reg.isFollowed
                        ? 'bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 border border-neutral-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                    }`"
                  >
                    {{ reg.isFollowed ? 'Unfollow' : '+ Follow' }}
                  </button>
                </div>
              </td>
            </tr>

            <!-- Expandable Sub-scopes row -->
            <tr v-if="expandedRegulatorIds.includes(reg.id) && reg.subScopes && reg.subScopes.length > 0" class="bg-neutral-50/50">
              <td colspan="7" class="p-3 pl-12 space-y-2">
                <div class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Supervisory Sub-Divisions & Circular Scopes
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div
                    v-for="sub in reg.subScopes"
                    :key="sub.id"
                    class="p-2.5 rounded-lg bg-white border border-neutral-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div class="font-bold text-neutral-800">{{ sub.name }}</div>
                      <div class="text-[11px] text-neutral-500 font-mono">{{ sub.code }}</div>
                    </div>
                    <span :class="`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sub.isFollowed ? 'bg-blue-50 text-blue-700' : 'text-neutral-400'}`">
                      {{ sub.isFollowed ? 'Monitored' : 'Inactive' }}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <!-- Pagination for Regulator View -->
      <PaginationController
        v-if="filteredRegulators.length > 0"
        :totalItems="filteredRegulators.length"
        v-model:currentPage="currentPage"
        v-model:pageSize="pageSize"
      />
    </div>
  </div>
</template>
