<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  Calendar,
  Filter,
  Search,
  Building2,
  Tag,
  X,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Globe2,
  SlidersHorizontal,
  Check,
  Info,
  BookmarkCheck,
  Lock,
} from 'lucide-vue-next';
import type { DirectoryFilterState } from '@/types';
import { ALL_JURISDICTIONS } from '@/types';
import { useDirectoryStore } from '@/stores/directoryStore';
import ComboboxFilter from '@/components/common/ComboboxFilter.vue';

const directoryStore = useDirectoryStore();

const props = withDefaults(
  defineProps<{
    isBookmarksActive?: boolean;
  }>(),
  {
    isBookmarksActive: true,
  }
);

const emit = defineEmits<{
  (e: 'apply', filters: DirectoryFilterState): void;
  (e: 'reset'): void;
  (e: 'toggleBookmarks', active: boolean): void;
  (e: 'filterChange', filters: Partial<DirectoryFilterState>): void;
}>();

// Available Regulators list for Auto-suggest
const ALL_REGULATORS = [
  { acronym: 'HKMA', name: 'Hong Kong Monetary Authority', jurisdiction: 'Hong Kong' },
  { acronym: 'SFC', name: 'Securities and Futures Commission', jurisdiction: 'Hong Kong' },
  { acronym: 'HKEX', name: 'Hong Kong Exchanges and Clearing', jurisdiction: 'Hong Kong' },
  { acronym: 'MAS', name: 'Monetary Authority of Singapore', jurisdiction: 'Singapore' },
  { acronym: 'SEC', name: 'Securities and Exchange Commission', jurisdiction: 'United States' },
  { acronym: 'CFTC', name: 'Commodity Futures Trading Commission', jurisdiction: 'United States' },
  { acronym: 'FINRA', name: 'Financial Industry Regulatory Authority', jurisdiction: 'United States' },
  { acronym: 'FCA', name: 'Financial Conduct Authority', jurisdiction: 'United Kingdom' },
  { acronym: 'PRA', name: 'Prudential Regulation Authority', jurisdiction: 'United Kingdom' },
  { acronym: 'EBA', name: 'European Banking Authority', jurisdiction: 'European Union' },
  { acronym: 'ESMA', name: 'European Securities and Markets Authority', jurisdiction: 'European Union' },
  { acronym: 'APRA', name: 'Australian Prudential Regulation Authority', jurisdiction: 'Australia' },
  { acronym: 'ASIC', name: 'Australian Securities and Investments Commission', jurisdiction: 'Australia' },
  { acronym: 'FATF', name: 'Financial Action Task Force', jurisdiction: 'Global/Offshore' },
  { acronym: 'BIS', name: 'Bank for International Settlements', jurisdiction: 'Global/Offshore' },
];

const JURISDICTION_OPTIONS = ['All', ...ALL_JURISDICTIONS];

const THEME_OPTIONS = [
  'All',
  'Virtual Assets/Crypto',
  'AML/CFT and sanctions',
  'ESG and sustainability disclosure',
  'Data protection and cybersecurity',
  'AI governance and model risk',
  'Operational resilience and incident reporting',
  'Outsourcing and third-party risk',
  'Prudential and capital requirements',
  'Market conduct and listing rules',
  'Conduct and consumer protection',
];

const CATEGORY_OPTIONS = [
  'All',
  'Financial Services & Capital Markets',
  'Corporate Governance & CoSec',
  'Compliance, Risk & Enforcement',
  'Legal & Judicial',
  'Commerce, Safety & Public Administration',
  'Guideline',
  'Circular',
  'Rulebook',
  'Consultation Paper',
  'Primary Legislation',
  'Code of Conduct & Standards',
  'Enforcement',
];

// Reference anchor date
const REFERENCE_NOW = new Date('2026-09-28T00:00:00');

const formatDate = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const calcDateMinusDays = (days: number): Date => {
  const d = new Date(REFERENCE_NOW.getTime());
  d.setDate(d.getDate() - days);
  return d;
};

// Date Presets & Field Selection (strictly Publish Date)
type DatePresetType = '30D' | 'All' | '6M' | '1Y' | 'Custom';
const activeDatePreset = ref<DatePresetType>('All');
const dateType = ref<'publishDate'>('publishDate');

const startDateInput = ref<string>('01/01/2020');
const endDateInput = ref<string>(formatDate(REFERENCE_NOW));

// Multi-Select Dropdowns for Jurisdiction, Themes, Category, Linkage
const selectedJurisdictions = ref<string[]>([]);
const selectedThemes = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedLinkages = ref<string[]>([]);
const selectedJurisdiction = ref<string>('All');
const selectedTheme = ref<string>('All');
const selectedCategory = ref<string>('All');

// Candidates Pools
const regulatorInput = ref<string>('');
const isRegulatorDropdownOpen = ref<boolean>(false);
const regulatorCandidates = ref<string[]>([]);

const keywordInput = ref<string>('');
const keywordCandidates = ref<string[]>([]);
const keywordMode = ref<'OR' | 'AND'>('OR');

// Auto-suggest suggestions for regulators
const regulatorSuggestions = computed(() => {
  const q = regulatorInput.value.trim().toLowerCase();
  if (!q) return ALL_REGULATORS.slice(0, 6);
  return ALL_REGULATORS.filter(
    (r) =>
      r.acronym.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.jurisdiction.toLowerCase().includes(q)
  );
});

// Switch Date Preset
const selectDatePreset = (preset: DatePresetType) => {
  activeDatePreset.value = preset;
  if (preset === '30D') {
    startDateInput.value = formatDate(calcDateMinusDays(30));
    endDateInput.value = formatDate(REFERENCE_NOW);
  } else if (preset === '6M') {
    startDateInput.value = formatDate(calcDateMinusDays(180));
    endDateInput.value = formatDate(REFERENCE_NOW);
  } else if (preset === '1Y') {
    startDateInput.value = formatDate(calcDateMinusDays(365));
    endDateInput.value = formatDate(REFERENCE_NOW);
  } else if (preset === 'All') {
    startDateInput.value = '01/01/2020';
    endDateInput.value = formatDate(REFERENCE_NOW);
  }
  emitFilterChanges();
};

// Add Regulator Candidate
const addRegulatorCandidate = (acronym: string) => {
  if (directoryStore.isBookmarksActive) return;
  const clean = acronym.trim().toUpperCase();
  if (!clean) return;
  if (regulatorCandidates.value.includes(clean)) {
    regulatorInput.value = '';
    isRegulatorDropdownOpen.value = false;
    return;
  }
  if (regulatorCandidates.value.length >= 10) return;
  regulatorCandidates.value.push(clean);
  regulatorInput.value = '';
  isRegulatorDropdownOpen.value = false;
};

const removeRegulatorCandidate = (acronym: string) => {
  if (directoryStore.isBookmarksActive) return;
  regulatorCandidates.value = regulatorCandidates.value.filter((r) => r !== acronym);
};

// Add Keyword Candidate
const addKeywordCandidate = () => {
  if (directoryStore.isBookmarksActive) return;
  const clean = keywordInput.value.trim();
  if (!clean) return;
  if (keywordCandidates.value.some((k) => k.toLowerCase() === clean.toLowerCase())) {
    keywordInput.value = '';
    return;
  }
  if (keywordCandidates.value.length >= 10) return;
  keywordCandidates.value.push(clean);
  keywordInput.value = '';
};

const removeKeywordCandidate = (keyword: string) => {
  if (directoryStore.isBookmarksActive) return;
  keywordCandidates.value = keywordCandidates.value.filter((k) => k !== keyword);
};

// Reset Filters Action
const resetFilters = () => {
  activeDatePreset.value = 'All';
  startDateInput.value = '01/01/2020';
  endDateInput.value = formatDate(REFERENCE_NOW);

  selectedJurisdictions.value = [];
  selectedThemes.value = [];
  selectedCategories.value = [];
  selectedJurisdiction.value = 'All';
  selectedTheme.value = 'All';
  selectedCategory.value = 'All';

  regulatorCandidates.value = [];
  keywordCandidates.value = [];
  regulatorInput.value = '';
  keywordInput.value = '';
  keywordMode.value = 'OR';
  dateType.value = 'publishDate';
  selectedLinkages.value = [];

  emit('reset');
};

const emitFilterChanges = () => {
  emit('filterChange', {
    datePreset: activeDatePreset.value,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    dateType: dateType.value,
    jurisdiction:
      selectedJurisdictions.value.length === 1
        ? selectedJurisdictions.value[0]
        : selectedJurisdictions.value.length === 0
        ? 'All'
        : 'Multi',
    selectedJurisdictions: [...selectedJurisdictions.value],
    theme:
      selectedThemes.value.length === 1
        ? selectedThemes.value[0]
        : selectedThemes.value.length === 0
        ? 'All'
        : 'Multi',
    selectedThemes: [...selectedThemes.value],
    category:
      selectedCategories.value.length === 1
        ? selectedCategories.value[0]
        : selectedCategories.value.length === 0
        ? 'All'
        : 'Multi',
    selectedCategories: [...selectedCategories.value],
    selectedLinkages: [...selectedLinkages.value],
  });
};

watch([selectedJurisdictions, selectedThemes, selectedCategories, selectedLinkages, dateType], () => {
  emitFilterChanges();
});

// Apply All Action
const applyFilters = () => {
  emit('apply', {
    datePreset: activeDatePreset.value,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    dateType: dateType.value,
    jurisdiction:
      selectedJurisdictions.value.length === 1
        ? selectedJurisdictions.value[0]
        : selectedJurisdictions.value.length === 0
        ? 'All'
        : 'Multi',
    selectedJurisdictions: [...selectedJurisdictions.value],
    theme:
      selectedThemes.value.length === 1
        ? selectedThemes.value[0]
        : selectedThemes.value.length === 0
        ? 'All'
        : 'Multi',
    selectedThemes: [...selectedThemes.value],
    category:
      selectedCategories.value.length === 1
        ? selectedCategories.value[0]
        : selectedCategories.value.length === 0
        ? 'All'
        : 'Multi',
    selectedCategories: [...selectedCategories.value],
    selectedLinkages: [...selectedLinkages.value],
    regulatorCandidates: directoryStore.isBookmarksActive ? [] : [...regulatorCandidates.value],
    keywordCandidates: directoryStore.isBookmarksActive ? [] : [...keywordCandidates.value],
    keywordMode: keywordMode.value,
  });
};

const handleToggleBookmarks = () => {
  directoryStore.toggleBookmarksActive();
  emit('toggleBookmarks', directoryStore.isBookmarksActive);
  emitFilterChanges();
};

onMounted(() => {
  emitFilterChanges();
});
</script>

<template>
  <div
    id="regulatory-directory-filter-panel"
    class="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 sm:p-6 space-y-4"
  >
    <!-- TOP STRIP: Bookmarks Toggle & Primary Actions -->
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          id="btn-filter-bookmarks"
          @click="handleToggleBookmarks"
          :class="`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none ${
            directoryStore.isBookmarksActive
              ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 font-normal'
          }`"
        >
          <BookmarkCheck class="w-4 h-4" />
          <span>Bookmarks</span>
          <span
            :class="`text-xs font-mono px-1.5 py-0.5 rounded-full font-semibold ${
              directoryStore.isBookmarksActive ? 'bg-blue-700/80 text-white' : 'bg-neutral-200 text-neutral-700'
            }`"
          >
            {{ directoryStore.bookmarkedItems.length }}
          </span>
          <span
            v-if="directoryStore.isBookmarksActive"
            class="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-0.5"
            title="Active"
          />
        </button>

        <span class="text-xs text-neutral-700 font-normal hidden sm:inline">
          {{
            directoryStore.isBookmarksActive
              ? 'Showing acknowledged regulations. Candidate inputs locked.'
              : 'Manual search mode. Set criteria and apply.'
          }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="resetFilters"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5 text-neutral-400" />
          <span>Reset</span>
        </button>

        <button
          type="button"
          id="btn-apply-directory-filters"
          @click="applyFilters"
          class="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          <Rocket class="w-3.5 h-3.5" />
          <span>Apply</span>
        </button>
      </div>
    </div>

    <!-- Row 1: Primary Filter Selectors (Grouped: Date, Jurisdiction, Themes, Category, Linkage) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
      <!-- Date Range (Preset Buttons + Range Display + Field Indicator) -->
      <div class="lg:col-span-4 space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-blue-600" />
            <span>Date Range</span>
          </label>
          <span class="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Publish Date
          </span>
        </div>

        <!-- Presets -->
        <div class="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button
            type="button"
            @click="selectDatePreset('All')"
            :class="`flex-1 py-1 px-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeDatePreset === 'All'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-neutral-800 font-normal hover:text-neutral-900'
            }`"
          >
            All
          </button>
          <button
            type="button"
            @click="selectDatePreset('30D')"
            :class="`flex-1 py-1 px-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeDatePreset === '30D'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-neutral-800 font-normal hover:text-neutral-900'
            }`"
          >
            30D
          </button>
          <button
            type="button"
            @click="selectDatePreset('6M')"
            :class="`flex-1 py-1 px-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeDatePreset === '6M'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-neutral-800 font-normal hover:text-neutral-900'
            }`"
          >
            6M
          </button>
          <button
            type="button"
            @click="selectDatePreset('1Y')"
            :class="`flex-1 py-1 px-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeDatePreset === '1Y'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-neutral-800 font-normal hover:text-neutral-900'
            }`"
          >
            1Y
          </button>
          <button
            type="button"
            @click="activeDatePreset = 'Custom'"
            :class="`flex-1 py-1 px-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeDatePreset === 'Custom'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-neutral-800 font-normal hover:text-neutral-900'
            }`"
          >
            Custom
          </button>
        </div>

        <!-- Inline Custom Inputs when Custom selected -->
        <div v-if="activeDatePreset === 'Custom'" class="flex items-center gap-2 pt-1">
          <input
            type="text"
            v-model="startDateInput"
            @change="emitFilterChanges"
            placeholder="DD/MM/YYYY"
            class="w-1/2 px-2.5 py-1.5 text-xs font-mono bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <span class="text-neutral-800 text-xs font-normal">to</span>
          <input
            type="text"
            v-model="endDateInput"
            @change="emitFilterChanges"
            placeholder="DD/MM/YYYY"
            class="w-1/2 px-2.5 py-1.5 text-xs font-mono bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      <!-- Dropdown: Jurisdiction (Multi-Select) -->
      <div class="lg:col-span-2 space-y-1.5">
        <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
          <Globe2 class="w-3.5 h-3.5 text-neutral-800" />
          <span>Jurisdiction</span>
        </label>
        <ComboboxFilter
          id="select-dir-jurisdiction"
          label="Jurisdiction"
          :options="JURISDICTION_OPTIONS.filter((o) => o !== 'All')"
          :selected-values="selectedJurisdictions"
          placeholder="All Jurisdictions"
          class="w-full"
          @update:selected-values="selectedJurisdictions = $event"
        />
      </div>

      <!-- Dropdown: Themes (Multi-Select) -->
      <div class="lg:col-span-2 space-y-1.5">
        <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
          <Tag class="w-3.5 h-3.5 text-neutral-800" />
          <span>Themes</span>
        </label>
        <ComboboxFilter
          id="select-dir-themes"
          label="Themes"
          :options="THEME_OPTIONS.filter((o) => o !== 'All')"
          :selected-values="selectedThemes"
          placeholder="All Themes"
          class="w-full"
          @update:selected-values="selectedThemes = $event"
        />
      </div>

      <!-- Dropdown: Category (Multi-Select) -->
      <div class="lg:col-span-2 space-y-1.5">
        <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
          <Filter class="w-3.5 h-3.5 text-neutral-800" />
          <span>Category</span>
        </label>
        <ComboboxFilter
          id="select-dir-category"
          label="Category"
          :options="CATEGORY_OPTIONS.filter((o) => o !== 'All')"
          :selected-values="selectedCategories"
          placeholder="All Categories"
          class="w-full"
          @update:selected-values="selectedCategories = $event"
        />
      </div>

      <!-- Dropdown: Linkage (Multi-Select) -->
      <div class="lg:col-span-2 space-y-1.5">
        <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
          <Layers class="w-3.5 h-3.5 text-neutral-800" />
          <span>Linkage</span>
        </label>
        <ComboboxFilter
          id="select-dir-linkage"
          label="Linkage"
          :options="['Linked to Tasks', 'Unlinked']"
          :selected-values="selectedLinkages"
          placeholder="All Linkage"
          class="w-full"
          @update:selected-values="selectedLinkages = $event"
        />
      </div>
    </div>

    <!-- Row 2: Regulators & Keywords Candidates Inputs (Disabled when Bookmarks is Active) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
      <!-- Regulators Auto-suggest -->
      <div class="space-y-1.5 relative">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Building2 class="w-3.5 h-3.5 text-blue-600" />
            <span>Regulators</span>
            <span v-if="directoryStore.isBookmarksActive" class="text-xs text-neutral-500 font-normal flex items-center gap-1">
              <Lock class="w-3 h-3" />
              Locked
            </span>
          </label>
          <span
            v-if="!directoryStore.isBookmarksActive"
            :class="`text-xs px-2 py-0.5 rounded font-semibold ${
              regulatorCandidates.length >= 10
                ? 'bg-amber-100 text-amber-900'
                : 'text-neutral-800'
            }`"
          >
            {{ regulatorCandidates.length }}/10
          </span>
        </div>

        <div class="relative">
          <input
            type="text"
            v-model="regulatorInput"
            :disabled="directoryStore.isBookmarksActive"
            @focus="!directoryStore.isBookmarksActive && (isRegulatorDropdownOpen = true)"
            @keydown.enter.prevent="
              !directoryStore.isBookmarksActive && regulatorSuggestions[0] && addRegulatorCandidate(regulatorSuggestions[0].acronym)
            "
            :placeholder="directoryStore.isBookmarksActive ? 'Locked in Bookmarks' : 'Search authority (HKMA, MAS, SEC, SFC, FCA)...'"
            :class="`w-full pl-8 pr-16 h-8 text-xs font-normal rounded-lg border transition-all ${
              directoryStore.isBookmarksActive
                ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                : 'bg-white text-neutral-900 border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-neutral-400'
            }`"
          />
          <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          <button
            type="button"
            @click="regulatorInput && addRegulatorCandidate(regulatorInput)"
            :disabled="directoryStore.isBookmarksActive || !regulatorInput.trim() || regulatorCandidates.length >= 10"
            class="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>

        <!-- Auto-suggest Dropdown -->
        <div
          v-if="!directoryStore.isBookmarksActive && isRegulatorDropdownOpen && (regulatorInput || regulatorSuggestions.length > 0)"
          class="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto py-1"
        >
          <div class="px-3 py-1 text-xs font-semibold text-neutral-800">
            Suggested Authorities
          </div>
          <button
            v-for="reg in regulatorSuggestions"
            :key="reg.acronym"
            type="button"
            @click="addRegulatorCandidate(reg.acronym)"
            class="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-2">
              <span class="font-semibold text-neutral-900">{{ reg.acronym }}</span>
              <span class="text-neutral-800 font-normal truncate max-w-xs">{{ reg.name }}</span>
            </div>
            <span class="text-xs font-normal text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
              {{ reg.jurisdiction }}
            </span>
          </button>
        </div>

        <!-- Selected Candidate Chips -->
        <div v-if="!directoryStore.isBookmarksActive && regulatorCandidates.length > 0" class="flex flex-wrap gap-1.5 pt-1">
          <span
            v-for="reg in regulatorCandidates"
            :key="reg"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
          >
            <span>{{ reg }}</span>
            <button
              type="button"
              @click="removeRegulatorCandidate(reg)"
              class="hover:text-rose-600 transition-colors cursor-pointer"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
        </div>
      </div>

      <!-- Keywords Filter -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Search class="w-3.5 h-3.5 text-blue-600" />
            <span>Keywords</span>
            <span v-if="directoryStore.isBookmarksActive" class="text-xs text-neutral-500 font-normal flex items-center gap-1">
              <Lock class="w-3 h-3" />
              Locked
            </span>
          </label>
          <div v-if="!directoryStore.isBookmarksActive" class="flex items-center gap-2">
            <!-- Mode Switch (OR / AND) -->
            <div class="flex items-center bg-neutral-100 p-0.5 rounded-md border border-neutral-200 text-xs">
              <button
                type="button"
                @click="keywordMode = 'OR'"
                :class="`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  keywordMode === 'OR' ? 'bg-white text-blue-600 font-semibold shadow-xs' : 'text-neutral-800 font-normal'
                }`"
              >
                OR
              </button>
              <button
                type="button"
                @click="keywordMode = 'AND'"
                :class="`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  keywordMode === 'AND' ? 'bg-white text-blue-600 font-semibold shadow-xs' : 'text-neutral-800 font-normal'
                }`"
              >
                AND
              </button>
            </div>
            <span
              :class="`text-xs px-2 py-0.5 rounded font-semibold ${
                keywordCandidates.length >= 10
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-neutral-800'
              }`"
            >
              {{ keywordCandidates.length }}/10
            </span>
          </div>
        </div>

        <div class="relative">
          <input
            type="text"
            v-model="keywordInput"
            :disabled="directoryStore.isBookmarksActive"
            @keydown.enter.prevent="!directoryStore.isBookmarksActive && addKeywordCandidate()"
            :placeholder="directoryStore.isBookmarksActive ? 'Locked in Bookmarks' : 'Type keyword & press Enter (e.g. AI, AML)...'"
            :class="`w-full pl-8 pr-16 h-8 text-xs font-normal rounded-lg border transition-all ${
              directoryStore.isBookmarksActive
                ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                : 'bg-white text-neutral-900 border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-neutral-400'
            }`"
          />
          <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />

          <button
            type="button"
            @click="addKeywordCandidate"
            :disabled="directoryStore.isBookmarksActive || !keywordInput.trim() || keywordCandidates.length >= 10"
            class="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>

        <!-- Selected Keyword Chips -->
        <div v-if="!directoryStore.isBookmarksActive && keywordCandidates.length > 0" class="flex flex-wrap gap-1.5 pt-1">
          <span
            v-for="kw in keywordCandidates"
            :key="kw"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
          >
            <span>"{{ kw }}"</span>
            <button
              type="button"
              @click="removeKeywordCandidate(kw)"
              class="hover:text-rose-600 transition-colors cursor-pointer"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
