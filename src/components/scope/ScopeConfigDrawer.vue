<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  X,
  SlidersHorizontal,
  Search,
  Check,
  Activity,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  Filter,
  CheckCheck,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit,
  Sparkles,
} from 'lucide-vue-next';
import type {
  RegulatorInScope,
  MonitoringCadence,
  CustomSourceRegistration,
  RegulatoryCategory,
} from '@/types';
import {
  REGULATORY_CATEGORIES,
  REGULATORY_THEMES,
  ALL_JURISDICTIONS,
} from '@/types';
import ComboboxFilter from '../common/ComboboxFilter.vue';

export interface ThemeGroup {
  id: string;
  title: string;
  items: { id: string; name: string; desc: string }[];
}

const HIERARCHICAL_THEME_GROUPS: ThemeGroup[] = [
  {
    id: 'grp-aml-gov',
    title: 'Anti-Money Laundering, Governance & Market Conduct (AML/CFT & Governance)',
    items: [
      {
        id: 'AML/CFT and Sanctions',
        name: 'AML/CFT and Sanctions',
        desc: 'Anti-money laundering, counter-terrorist financing, STR monitoring, and sanctions compliance',
      },
      {
        id: 'Corporate Governance & Executive Accountability',
        name: 'Corporate Governance & Executive Accountability',
        desc: 'Senior management accountability regime (MIC/SECR) and board internal controls',
      },
      {
        id: 'Whistleblowing & Market Misconduct',
        name: 'Whistleblowing & Market Misconduct',
        desc: 'Whistleblowing mechanisms, market misconduct, and insider trading prevention',
      },
    ],
  },
  {
    id: 'grp-resilience-fintech',
    title: 'Technology, Operational Resilience & Virtual Assets (Resilience & Fintech)',
    items: [
      {
        id: 'Operational Resilience & Outsourcing',
        name: 'Operational Resilience & Outsourcing',
        desc: 'Critical outsourcing, cloud migration, and business continuity management',
      },
      {
        id: 'Fintech, AI & Algorithmic Trading',
        name: 'Fintech, AI & Algorithmic Trading',
        desc: 'Generative AI governance, algorithmic trading, virtual assets, and regulatory sandboxes',
      },
      {
        id: 'Data Privacy & Cross-Border Transfers',
        name: 'Data Privacy & Cross-Border Transfers',
        desc: 'Personal data protection, cybersecurity, and cross-border transfer compliance',
      },
    ],
  },
  {
    id: 'grp-prudential-esg',
    title: 'Prudential Regulation, Capital Adequacy & Sustainable Finance (Prudential & ESG)',
    items: [
      {
        id: 'Capital Adequacy & Liquidity Risk',
        name: 'Capital Adequacy & Liquidity Risk',
        desc: 'Basel capital adequacy, liquidity coverage ratios (LCR), and regulatory stress testing',
      },
      {
        id: 'Consumer Protection & Conduct of Business',
        name: 'Consumer Protection & Conduct of Business',
        desc: 'Financial consumer protection, product suitability, and complaints handling',
      },
      {
        id: 'Sustainable Finance & ESG Disclosures',
        name: 'Sustainable Finance & ESG Disclosures',
        desc: 'Climate risk disclosures (ISSB/TCFD), ESG integration, and anti-greenwashing rules',
      },
    ],
  },
];

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    regulators: RegulatorInScope[];
    customSources: CustomSourceRegistration[];
    availableThemes: string[];
    availableJurisdictions?: string[];
    initialEditingRegulatorId?: string | null;
  }>(),
  {
    availableJurisdictions: () => [...ALL_JURISDICTIONS],
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggleFollow', regulatorId: string): void;
  (e: 'toggleSubScopeFollow', regulatorId: string, subScopeId: string): void;
  (e: 'triggerBackfill', regulator: RegulatorInScope): void;
  (e: 'toggleFollowAll', regulatorIds: string[], targetFollow: boolean): void;
  (e: 'toggleCustomSourceFollow', sourceId: string): void;
  (
    e: 'updateRegulatorSettings',
    regulatorId: string,
    cadence: MonitoringCadence,
    themes: string[],
    category?: RegulatoryCategory
  ): void;
  (
    e: 'addCustomSource',
    source: Omit<CustomSourceRegistration, 'id' | 'lastChecked'>
  ): void;
}>();

const activeTab = ref<'directory' | 'customSource'>('directory');
const searchQuery = ref('');
const selectedJurisdictions = ref<string[]>([]);
const selectedCategories = ref<string[]>([]);
const selectedThemes = ref<string[]>([]);
const editingRegulatorId = ref<string | null>(null);

// Expandable parent regulator cards: HKMA expanded by default
const expandedRegulatorIds = ref<Set<string>>(new Set(['regl-001']));

const handleToggleExpand = (regId: string) => {
  const next = new Set(expandedRegulatorIds.value);
  if (next.has(regId)) {
    next.delete(regId);
  } else {
    next.add(regId);
  }
  expandedRegulatorIds.value = next;
};

// Editing state for inline popover
const editCadence = ref<MonitoringCadence>('Daily');
const editThemes = ref<string[]>([]);
const editCategory = ref<RegulatoryCategory>('Financial Services & Capital Markets');

watch(
  () => props.initialEditingRegulatorId,
  (newId) => {
    if (newId) {
      editingRegulatorId.value = newId;
      expandedRegulatorIds.value = new Set([...expandedRegulatorIds.value, newId]);
      const reg = props.regulators.find((r) => r.id === newId);
      if (reg) {
        editCadence.value = reg.cadence;
        editThemes.value = reg.themes || [];
        editCategory.value = reg.category;
      }
    }
  },
  { immediate: true }
);

// New Custom Source Form state
const newUrl = ref('');
const newSourceType = ref<
  'Official Gazette' | 'Circulars RSS' | 'Press Releases' | 'Consultation Portal'
>('Circulars RSS');
const newRegulator = ref('Hong Kong Monetary Authority (HKMA)');
const regulatorComboboxSearch = ref('Hong Kong Monetary Authority (HKMA)');
const isRegulatorDropdownOpen = ref(false);
const newJurisdiction = ref('Hong Kong');
const newCategory = ref<RegulatoryCategory>('Financial Services & Capital Markets');
const newThemes = ref<string[]>([REGULATORY_THEMES[0]]);
const newPriority = ref<'High' | 'Standard'>('High');
const isVerifying = ref(false);
const probeResult = ref<{
  status: 'Verified & Reachable' | 'Unreachable / Blocked' | null;
  latencyMs?: number;
  message?: string;
}>({ status: null });

const isAutoDetected = ref(false);
const autoDetectedSummary = ref('');

const detectSettingsFromUrl = (urlStr: string) => {
  if (!urlStr || !urlStr.trim()) {
    isAutoDetected.value = false;
    autoDetectedSummary.value = '';
    return;
  }

  const cleanUrl = urlStr.trim().toLowerCase();

  // 1. Check known regulators in props
  let matchedRegulator = props.regulators.find((r) => {
    const acro = r.acronym.toLowerCase();
    const endpointClean = (r.officialEndpoint || '')
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '')
      .split('/')[0];
    return (
      cleanUrl.includes(`/${acro}/`) ||
      cleanUrl.includes(`.${acro}.`) ||
      cleanUrl.includes(`${acro}.`) ||
      (endpointClean && cleanUrl.includes(endpointClean))
    );
  });

  // Well-known global authority signatures
  if (!matchedRegulator) {
    if (cleanUrl.includes('hkma')) {
      matchedRegulator = props.regulators.find((r) => r.acronym === 'HKMA') || ({
        name: 'Hong Kong Monetary Authority (HKMA)',
        acronym: 'HKMA',
        jurisdiction: 'Hong Kong',
        category: 'Financial Services & Capital Markets',
        themes: ['Prudential and capital requirements'],
      } as any);
    } else if (cleanUrl.includes('sfc.hk') || cleanUrl.includes('sfc')) {
      matchedRegulator = props.regulators.find((r) => r.acronym === 'SFC') || ({
        name: 'Securities and Futures Commission (SFC)',
        acronym: 'SFC',
        jurisdiction: 'Hong Kong',
        category: 'Financial Services & Capital Markets',
        themes: ['Market conduct and listing rules'],
      } as any);
    } else if (cleanUrl.includes('mas.gov') || cleanUrl.includes('/mas')) {
      matchedRegulator = props.regulators.find((r) => r.acronym === 'MAS') || ({
        name: 'Monetary Authority of Singapore (MAS)',
        acronym: 'MAS',
        jurisdiction: 'Singapore',
        category: 'Financial Services & Capital Markets',
        themes: ['Operational resilience and incident reporting'],
      } as any);
    } else if (cleanUrl.includes('fca.org') || cleanUrl.includes('/fca')) {
      matchedRegulator = props.regulators.find((r) => r.acronym === 'FCA') || ({
        name: 'Financial Conduct Authority (FCA)',
        acronym: 'FCA',
        jurisdiction: 'United Kingdom',
        category: 'Financial Services & Capital Markets',
        themes: ['Conduct and consumer protection'],
      } as any);
    } else if (cleanUrl.includes('sec.gov') || cleanUrl.includes('/sec')) {
      matchedRegulator = props.regulators.find((r) => r.acronym === 'SEC') || ({
        name: 'Securities and Exchange Commission (SEC)',
        acronym: 'SEC',
        jurisdiction: 'United States',
        category: 'Financial Services & Capital Markets',
        themes: ['Market conduct and listing rules'],
      } as any);
    } else if (cleanUrl.includes('cftc.gov')) {
      matchedRegulator = ({
        name: 'Commodity Futures Trading Commission (CFTC)',
        acronym: 'CFTC',
        jurisdiction: 'United States',
        category: 'Financial Services & Capital Markets',
        themes: ['Market conduct and listing rules'],
      } as any);
    } else if (cleanUrl.includes('finma.ch') || cleanUrl.includes('finma')) {
      matchedRegulator = ({
        name: 'Swiss Financial Market Supervisory Authority (FINMA)',
        acronym: 'FINMA',
        jurisdiction: 'Switzerland',
        category: 'Financial Services & Capital Markets',
        themes: ['Prudential and capital requirements'],
      } as any);
    } else if (cleanUrl.includes('asic.gov') || cleanUrl.includes('asic')) {
      matchedRegulator = ({
        name: 'Australian Securities and Investments Commission (ASIC)',
        acronym: 'ASIC',
        jurisdiction: 'Australia',
        category: 'Financial Services & Capital Markets',
        themes: ['Conduct and consumer protection'],
      } as any);
    } else if (cleanUrl.includes('apra.gov') || cleanUrl.includes('apra')) {
      matchedRegulator = ({
        name: 'Australian Prudential Regulation Authority (APRA)',
        acronym: 'APRA',
        jurisdiction: 'Australia',
        category: 'Financial Services & Capital Markets',
        themes: ['Prudential and capital requirements'],
      } as any);
    } else if (cleanUrl.includes('fatf')) {
      matchedRegulator = ({
        name: 'Financial Action Task Force (FATF)',
        acronym: 'FATF',
        jurisdiction: 'International',
        category: 'Compliance, Risk & Enforcement',
        themes: ['AML/CFT and sanctions'],
      } as any);
    } else if (cleanUrl.includes('bis.org')) {
      matchedRegulator = ({
        name: 'Bank for International Settlements (BIS)',
        acronym: 'BIS',
        jurisdiction: 'International',
        category: 'Financial Services & Capital Markets',
        themes: ['Prudential and capital requirements'],
      } as any);
    } else if (cleanUrl.includes('pcpd')) {
      matchedRegulator = ({
        name: 'Privacy Commissioner for Personal Data (PCPD)',
        acronym: 'PCPD',
        jurisdiction: 'Hong Kong',
        category: 'Compliance, Risk & Enforcement',
        themes: ['Data protection and cybersecurity'],
      } as any);
    }
  }

  if (matchedRegulator) {
    newRegulator.value = matchedRegulator.name;
    regulatorComboboxSearch.value = matchedRegulator.name;
    if (matchedRegulator.jurisdiction) {
      newJurisdiction.value = matchedRegulator.jurisdiction;
    }
    if (matchedRegulator.category) {
      newCategory.value = matchedRegulator.category;
    }
    if (matchedRegulator.themes && matchedRegulator.themes.length > 0) {
      newThemes.value = [...matchedRegulator.themes];
    }
  } else {
    // Generate intelligent entity name & jurisdiction from domain
    try {
      const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
      const host = urlObj.hostname.replace(/^www\./, '');
      const domainParts = host.split('.');
      const entityName = domainParts[0].toUpperCase();
      newRegulator.value = `${entityName} Regulatory Authority`;
      regulatorComboboxSearch.value = `${entityName} Regulatory Authority`;

      if (cleanUrl.includes('.hk')) newJurisdiction.value = 'Hong Kong';
      else if (cleanUrl.includes('.sg')) newJurisdiction.value = 'Singapore';
      else if (cleanUrl.includes('.uk')) newJurisdiction.value = 'United Kingdom';
      else if (cleanUrl.includes('.us') || cleanUrl.includes('.gov')) newJurisdiction.value = 'United States';
      else if (cleanUrl.includes('.au')) newJurisdiction.value = 'Australia';
      else if (cleanUrl.includes('.eu')) newJurisdiction.value = 'European Union';
      else if (cleanUrl.includes('.ch')) newJurisdiction.value = 'Switzerland';
      else if (cleanUrl.includes('.de')) newJurisdiction.value = 'Germany';
      else if (cleanUrl.includes('.jp')) newJurisdiction.value = 'Japan';
      else if (cleanUrl.includes('.cn')) newJurisdiction.value = 'China';
      else if (cleanUrl.includes('.ca')) newJurisdiction.value = 'Canada';
      else newJurisdiction.value = 'International';
    } catch {
      newRegulator.value = 'Custom Regulatory Authority';
      regulatorComboboxSearch.value = 'Custom Regulatory Authority';
      newJurisdiction.value = 'International';
    }
  }

  // 2. Infer Source Type
  if (
    cleanUrl.includes('rss') ||
    cleanUrl.includes('feed') ||
    cleanUrl.includes('.xml') ||
    cleanUrl.includes('atom')
  ) {
    newSourceType.value = 'Circulars RSS';
  } else if (
    cleanUrl.includes('gazette') ||
    cleanUrl.includes('act') ||
    cleanUrl.includes('law') ||
    cleanUrl.includes('order') ||
    cleanUrl.includes('legal')
  ) {
    newSourceType.value = 'Official Gazette';
  } else if (
    cleanUrl.includes('press') ||
    cleanUrl.includes('news') ||
    cleanUrl.includes('media') ||
    cleanUrl.includes('release')
  ) {
    newSourceType.value = 'Press Releases';
  } else if (
    cleanUrl.includes('consult') ||
    cleanUrl.includes('paper') ||
    cleanUrl.includes('public') ||
    cleanUrl.includes('comment')
  ) {
    newSourceType.value = 'Consultation Portal';
  } else {
    newSourceType.value = 'Circulars RSS';
  }

  // 3. Infer Category & Themes if not matched by official regulator
  if (!matchedRegulator) {
    if (cleanUrl.includes('bank') || cleanUrl.includes('deposit') || cleanUrl.includes('credit')) {
      newCategory.value = 'Financial Services & Capital Markets';
      newThemes.value = ['Prudential and capital requirements', 'Operational resilience and incident reporting'];
    } else if (
      cleanUrl.includes('securit') ||
      cleanUrl.includes('market') ||
      cleanUrl.includes('stock') ||
      cleanUrl.includes('invest') ||
      cleanUrl.includes('fund')
    ) {
      newCategory.value = 'Financial Services & Capital Markets';
      newThemes.value = ['Market conduct and listing rules', 'Conduct and consumer protection'];
    } else if (
      cleanUrl.includes('aml') ||
      cleanUrl.includes('cft') ||
      cleanUrl.includes('crime') ||
      cleanUrl.includes('sanction')
    ) {
      newCategory.value = 'Compliance, Risk & Enforcement';
      newThemes.value = ['AML/CFT and sanctions'];
    } else if (cleanUrl.includes('privacy') || cleanUrl.includes('cyber') || cleanUrl.includes('data')) {
      newCategory.value = 'Compliance, Risk & Enforcement';
      newThemes.value = ['Data protection and cybersecurity'];
    } else if (
      cleanUrl.includes('crypto') ||
      cleanUrl.includes('token') ||
      cleanUrl.includes('fintech') ||
      cleanUrl.includes('digital') ||
      cleanUrl.includes('ai')
    ) {
      newCategory.value = 'Financial Services & Capital Markets';
      newThemes.value = ['AI governance and model risk', 'Operational resilience and incident reporting'];
    } else if (cleanUrl.includes('corp') || cleanUrl.includes('cosec') || cleanUrl.includes('registry')) {
      newCategory.value = 'Corporate Governance & CoSec';
      newThemes.value = ['Market conduct and listing rules'];
    } else if (cleanUrl.includes('legal') || cleanUrl.includes('court') || cleanUrl.includes('judic')) {
      newCategory.value = 'Legal & Judicial';
      newThemes.value = ['Conduct and consumer protection'];
    } else {
      newCategory.value = 'Financial Services & Capital Markets';
      newThemes.value = [REGULATORY_THEMES[0]];
    }
  }

  newPriority.value =
    newSourceType.value === 'Official Gazette' || newSourceType.value === 'Circulars RSS'
      ? 'High'
      : 'Standard';

  isAutoDetected.value = true;
  autoDetectedSummary.value = `${newRegulator.value} • ${newJurisdiction.value} • ${newCategory.value}`;
};

watch(newUrl, (val) => {
  if (val && val.trim().length > 7) {
    detectSettingsFromUrl(val);
  } else {
    isAutoDetected.value = false;
    autoDetectedSummary.value = '';
  }
});

// Filtered regulators
const filteredRegulators = computed(() => {
  return props.regulators.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.acronym.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesJurisdiction =
      selectedJurisdictions.value.length === 0 ||
      selectedJurisdictions.value.includes(r.jurisdiction);

    const matchesCategory =
      selectedCategories.value.length === 0 ||
      selectedCategories.value.includes(r.category);

    const matchesTheme =
      selectedThemes.value.length === 0 ||
      (r.themes && r.themes.some((th) => selectedThemes.value.includes(th)));

    return matchesSearch && matchesJurisdiction && matchesCategory && matchesTheme;
  });
});

const allFilteredAreFollowed = computed(() => {
  return (
    filteredRegulators.value.length > 0 &&
    filteredRegulators.value.every((r) => r.isFollowed)
  );
});

const handleToggleFollowAll = () => {
  const targetState = !allFilteredAreFollowed.value;
  const targetIds = filteredRegulators.value.map((r) => r.id);
  emit('toggleFollowAll', targetIds, targetState);
};

const handleStartEdit = (r: RegulatorInScope) => {
  editingRegulatorId.value = r.id;
  editCadence.value = r.cadence;
  editThemes.value = [...(r.themes || [])];
  editCategory.value = r.category;
};

const handleSaveEdit = (regulatorId: string) => {
  emit('updateRegulatorSettings', regulatorId, editCadence.value, editThemes.value, editCategory.value);
  editingRegulatorId.value = null;
};

const handleToggleEditTheme = (theme: string) => {
  if (editThemes.value.includes(theme)) {
    editThemes.value = editThemes.value.filter((t) => t !== theme);
  } else {
    editThemes.value = [...editThemes.value, theme];
  }
};

const handleToggleNewSourceTheme = (theme: string) => {
  if (newThemes.value.includes(theme)) {
    newThemes.value = newThemes.value.filter((t) => t !== theme);
  } else {
    newThemes.value = [...newThemes.value, theme];
  }
};

const handleTestAndRegisterSource = () => {
  if (!newUrl.value.trim()) return;

  isVerifying.value = true;
  probeResult.value = { status: null };

  setTimeout(() => {
    isVerifying.value = false;
    const isFailed =
      newUrl.value.toLowerCase().includes('fail') ||
      newUrl.value.toLowerCase().includes('blocked');
    if (isFailed) {
      probeResult.value = {
        status: 'Unreachable / Blocked',
        message:
          'Endpoint returned access restriction or DNS lookup failure. Verification requires client review.',
      };
    } else {
      probeResult.value = {
        status: 'Verified & Reachable',
        latencyMs: 142,
        message:
          'Regulatory endpoint verified. Publication feeds successfully cataloged for continuous surveillance.',
      };

      const todayStr = new Date().toISOString().split('T')[0];
      emit('addCustomSource', {
        url: newUrl.value,
        sourceType: newSourceType.value,
        regulator: newRegulator.value,
        jurisdiction: newJurisdiction.value,
        category: newCategory.value,
        themes: newThemes.value,
        priority: newPriority.value,
        status: 'Verified & Reachable',
        isFollowed: true,
        createdDate: todayStr,
      });

      newUrl.value = '';
    }
  }, 800);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-40 overflow-hidden">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
      @click="emit('close')"
    />

    <div class="fixed inset-y-0 right-0 max-w-full flex">
      <div
        id="scope-configuration-drawer"
        class="w-screen sm:w-[70vw] sm:max-w-[70vw] bg-white shadow-2xl flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-300 transition-all ease-out"
      >
        <!-- Header -->
        <div class="p-6 border-b border-neutral-200 bg-neutral-50 flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <SlidersHorizontal class="w-5 h-5 text-neutral-800" />
              <h2 class="text-base font-bold text-neutral-900">
                Watchlist Search
              </h2>
            </div>
            <p class="text-xs text-neutral-500 mt-1">
              Configure tracked regulatory authorities, monitoring cadences, and custom input sources.
            </p>
          </div>

          <button
            @click="emit('close')"
            class="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Sub Navigation Tabs -->
        <div class="flex border-b border-neutral-200 bg-white px-6">
          <button
            @click="activeTab = 'directory'"
            :class="`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'directory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`"
          >
            <Shield class="w-4 h-4" />
            <span>Regulator Directory & Cadence</span>
            <span class="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px]">
              {{ regulators.length }}
            </span>
          </button>

          <button
            @click="activeTab = 'customSource'"
            :class="`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'customSource'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`"
          >
            <Globe class="w-4 h-4" />
            <span>Custom Input Sources</span>
            <span class="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px]">
              {{ customSources.length }}
            </span>
          </button>
        </div>

        <!-- Body Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Tab 1: Directory -->
          <div v-if="activeTab === 'directory'" class="space-y-4">
            <!-- Search & Multi-Select Taxonomy Filters Header -->
            <div class="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
              <div class="relative w-full">
                <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-scope-search-regulators"
                  type="text"
                  v-model="searchQuery"
                  placeholder="Search authorities by name or acronym (e.g., HKMA, SFC, PCPD, MAS)..."
                  class="w-full pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <!-- 3 Dedicated Multi-Select Combobox Filters -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <ComboboxFilter
                    label="Themes Taxonomy"
                    :options="REGULATORY_THEMES"
                    :selectedValues="selectedThemes"
                    @change="selectedThemes = $event"
                    placeholder="All Themes"
                    badgeColor="blue"
                  />
                </div>

                <div>
                  <ComboboxFilter
                    label="Jurisdiction / Region"
                    :options="availableJurisdictions"
                    :selectedValues="selectedJurisdictions"
                    @change="selectedJurisdictions = $event"
                    placeholder="All Jurisdictions"
                    badgeColor="emerald"
                  />
                </div>

                <div>
                  <ComboboxFilter
                    label="Regulatory Category"
                    :options="REGULATORY_CATEGORIES"
                    :selectedValues="selectedCategories"
                    @change="selectedCategories = $event"
                    placeholder="All Sectors"
                    badgeColor="blue"
                  />
                </div>
              </div>

              <!-- Action row with Follow All toggle & Filter Reset -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-2 border-t border-neutral-200 gap-2 text-xs">
                <div class="flex items-center gap-2">
                  <span class="text-neutral-500 text-[11px]">
                    Showing <strong class="text-neutral-800">{{ filteredRegulators.length }}</strong> of
                    {{ regulators.length }} authorities
                  </span>
                  <button
                    v-if="
                      selectedJurisdictions.length > 0 ||
                      selectedCategories.length > 0 ||
                      selectedThemes.length > 0 ||
                      searchQuery
                    "
                    @click="
                      () => {
                        selectedJurisdictions = [];
                        selectedCategories = [];
                        selectedThemes = [];
                        searchQuery = '';
                      }
                    "
                    class="text-blue-600 hover:text-blue-800 font-semibold text-[11px] underline ml-1 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>

                <button
                  @click="handleToggleFollowAll"
                  :disabled="filteredRegulators.length === 0"
                  :class="`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                    allFilteredAreFollowed
                      ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-40`"
                >
                  <CheckCheck class="w-3.5 h-3.5" />
                  <span>
                    {{
                      allFilteredAreFollowed
                        ? `Unfollow All Filtered (${filteredRegulators.length})`
                        : `Follow All (${filteredRegulators.length})`
                    }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Directory List -->
            <div class="space-y-3">
              <div
                v-if="filteredRegulators.length === 0"
                class="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-xs text-neutral-500 space-y-2"
              >
                <Filter class="w-6 h-6 mx-auto text-neutral-400 stroke-[1.5]" />
                <p class="font-semibold text-neutral-700">No regulatory authorities match your criteria</p>
                <p class="text-[11px] text-neutral-400">
                  Try resetting or expanding your Themes, Jurisdictions, or Categories filters.
                </p>
              </div>

              <div
                v-for="reg in filteredRegulators"
                :key="reg.id"
                :id="`regulator-scope-card-${reg.id}`"
                :class="`p-4 rounded-2xl border transition-all ${
                  reg.isFollowed
                    ? 'bg-white border-neutral-300 shadow-2xs'
                    : 'bg-neutral-50/70 border-neutral-200 opacity-90'
                }`"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                      {{ reg.acronym.slice(0, 3) }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="text-xs sm:text-sm font-bold text-neutral-900">
                          {{ reg.name }}
                        </h4>
                        <button
                          type="button"
                          @click="handleStartEdit(reg)"
                          class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors border border-blue-200 cursor-pointer"
                          title="Edit regulator settings"
                        >
                          <Edit class="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span class="text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                          {{ reg.jurisdiction }}
                        </span>
                        <span class="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {{ reg.category }}
                        </span>
                        <span class="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Clock class="w-3 h-3 text-neutral-400" />
                          {{ reg.cadence }}
                        </span>
                      </div>

                      <!-- Themes pills -->
                      <div class="flex flex-wrap gap-1 mt-2">
                        <span
                          v-for="(th, idx) in reg.themes"
                          :key="`${th}-${idx}`"
                          class="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md"
                        >
                          {{ th }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      v-if="reg.isFollowed && editingRegulatorId !== reg.id"
                      @click="handleStartEdit(reg)"
                      class="text-xs text-blue-600 hover:underline font-medium px-2 py-1 cursor-pointer"
                    >
                      Configure Rules
                    </button>

                    <button
                      @click="
                        () => {
                          if (!reg.isFollowed) {
                            emit('triggerBackfill', reg);
                          } else {
                            emit('toggleFollow', reg.id);
                          }
                        }
                      "
                      :class="`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        reg.isFollowed
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                          : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`"
                    >
                      {{ reg.isFollowed ? 'Following' : '+ Follow' }}
                    </button>
                  </div>
                </div>

                <!-- Sub-Scopes & Cadence Hierarchy -->
                <div v-if="reg.subScopes && reg.subScopes.length > 0" class="mt-3 pt-3 border-t border-neutral-200/80">
                  <div class="flex items-center justify-between">
                    <button
                      type="button"
                      @click="handleToggleExpand(reg.id)"
                      class="flex items-center gap-2 text-xs font-bold text-neutral-700 hover:text-blue-600 cursor-pointer transition-colors"
                    >
                      <ChevronDown v-if="expandedRegulatorIds.has(reg.id)" class="w-4 h-4 text-blue-600" />
                      <ChevronRight v-else class="w-4 h-4 text-neutral-400" />
                      <span>Cadence Hierarchy & Child Entities ({{ reg.subScopes.length }})</span>
                      <span
                        :class="`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-1 ${
                          reg.subScopes.every((s) => s.isFollowed)
                            ? 'bg-blue-100 text-blue-800'
                            : reg.subScopes.some((s) => s.isFollowed)
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`"
                      >
                        {{ reg.subScopes.filter((s) => s.isFollowed).length }}/{{ reg.subScopes.length }} Followed
                      </span>
                    </button>
                    <span class="text-[11px] text-neutral-400 hidden sm:inline">
                      Granular child follow / unfollow control
                    </span>
                  </div>

                  <div v-if="expandedRegulatorIds.has(reg.id)" class="mt-2.5 space-y-2 pl-2 sm:pl-3 border-l-2 border-blue-300 animate-in fade-in">
                    <div
                      v-for="sub in reg.subScopes"
                      :key="sub.id"
                      :class="`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        sub.isFollowed
                          ? 'bg-blue-50/60 border-blue-200 shadow-2xs'
                          : 'bg-neutral-50/80 border-neutral-200 opacity-75'
                      }`"
                    >
                      <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-xs font-bold text-neutral-900">{{ sub.name }}</span>
                          <span class="font-mono text-[10px] bg-white border border-neutral-200 text-neutral-700 font-bold px-1.5 py-0.5 rounded">
                            {{ sub.code }}
                          </span>
                          <span class="text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                            <Clock class="w-3 h-3 text-neutral-400" />
                            {{ sub.cadence }} Cadence
                          </span>
                          <span v-if="sub.openAlertsCount > 0" class="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            {{ sub.openAlertsCount }} Open Alerts
                          </span>
                        </div>
                        <p class="text-[11px] text-neutral-600 leading-snug">
                          {{ sub.description }}
                        </p>
                        <div class="flex flex-wrap gap-1 pt-0.5">
                          <span
                            v-for="(th, idx) in sub.themes"
                            :key="`${th}-${idx}`"
                            class="text-[9px] font-medium bg-white border border-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded"
                          >
                            {{ th }}
                          </span>
                        </div>
                      </div>

                      <div class="shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          @click="emit('toggleSubScopeFollow', reg.id, sub.id)"
                          :class="`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            sub.isFollowed
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                          }`"
                        >
                          {{ sub.isFollowed ? 'Following' : '+ Follow' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Inline Edit Panel -->
                <div v-if="editingRegulatorId === reg.id" class="mt-4 pt-4 border-t border-neutral-200 bg-blue-50/40 p-4 rounded-xl border space-y-3.5 animate-in fade-in">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-bold text-neutral-800 block mb-1.5">
                        Execution Cadence
                      </label>
                      <div class="flex items-center gap-2">
                        <button
                          v-for="c in (['Daily', 'Weekly', 'Monthly'] as const)"
                          :key="c"
                          type="button"
                          @click="editCadence = c"
                          :class="`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            editCadence === c
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                          }`"
                        >
                          {{ c }}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label class="text-xs font-bold text-neutral-800 block mb-1.5">
                        Regulatory Sector
                      </label>
                      <select
                        v-model="editCategory"
                        class="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none"
                      >
                        <option v-for="cat in REGULATORY_CATEGORIES" :key="cat" :value="cat">
                          {{ cat }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <!-- Hierarchical Checkbox Tree for Themes -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between flex-wrap gap-1">
                      <label class="text-xs font-bold text-neutral-800">
                        Bound Themes (Hierarchical Selection Tree)
                      </label>
                      <div class="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          @click="editThemes = [...REGULATORY_THEMES]"
                          class="text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Select All
                        </button>
                        <span class="text-neutral-300">|</span>
                        <button
                          type="button"
                          @click="editThemes = ['AML/CFT and Sanctions']"
                          class="text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          AML Focus Only
                        </button>
                        <span class="text-neutral-300">|</span>
                        <button
                          type="button"
                          @click="editThemes = []"
                          class="text-neutral-500 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div class="space-y-2 bg-white p-3 rounded-xl border border-neutral-200 max-h-72 overflow-y-auto">
                      <div
                        v-for="grp in HIERARCHICAL_THEME_GROUPS"
                        :key="grp.id"
                        class="border border-neutral-100 rounded-lg p-2.5 bg-neutral-50/60"
                      >
                        <div
                          @click="
                            () => {
                              const allSelected = grp.items.every((it) => editThemes.includes(it.id));
                              if (allSelected) {
                                const itemIds = grp.items.map((it) => it.id);
                                editThemes = editThemes.filter((t) => !itemIds.includes(t));
                              } else {
                                const toAdd = grp.items
                                  .map((it) => it.id)
                                  .filter((id) => !editThemes.includes(id));
                                editThemes = [...editThemes, ...toAdd];
                              }
                            }
                          "
                          class="flex items-center gap-2 cursor-pointer select-none font-bold text-xs text-neutral-800 pb-1.5 border-b border-neutral-100"
                        >
                          <input
                            type="checkbox"
                            :checked="grp.items.every((it) => editThemes.includes(it.id))"
                            @click.stop
                            @change="
                              (e: any) => {
                                if (e.target.checked) {
                                  const toAdd = grp.items
                                    .map((it) => it.id)
                                    .filter((id) => !editThemes.includes(id));
                                  editThemes = [...editThemes, ...toAdd];
                                } else {
                                  const itemIds = grp.items.map((it) => it.id);
                                  editThemes = editThemes.filter((t) => !itemIds.includes(t));
                                }
                              }
                            "
                            class="rounded text-blue-600 focus:ring-blue-500 border-neutral-300 w-3.5 h-3.5"
                          />
                          <span>{{ grp.title }}</span>
                        </div>

                        <div class="mt-2 pl-4 space-y-1.5">
                          <label
                            v-for="sub in grp.items"
                            :key="sub.id"
                            class="flex items-start gap-2 cursor-pointer select-none hover:bg-neutral-100/70 p-1.5 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              :checked="editThemes.includes(sub.id)"
                              @change="handleToggleEditTheme(sub.id)"
                              class="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 w-3.5 h-3.5"
                            />
                            <div class="space-y-0.5">
                              <div class="text-xs font-semibold text-neutral-900 leading-none">
                                {{ sub.name }}
                              </div>
                              <p class="text-[10px] text-neutral-500 leading-tight">
                                {{ sub.desc }}
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-end gap-2 pt-2 border-t border-blue-100">
                    <button
                      type="button"
                      @click="editingRegulatorId = null"
                      class="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      @click="handleSaveEdit(reg.id)"
                      class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 2: Custom Input Sources -->
          <div v-else-if="activeTab === 'customSource'" class="space-y-6">
            <div class="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div>
                <div class="flex items-center gap-2">
                  <Globe class="w-4 h-4 text-blue-600" />
                  <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    Register Custom Input Source
                  </h3>
                </div>
                <p class="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Only need to input the <strong>Endpoint URL</strong> — we will automatically choose the authority entity, jurisdiction, and taxonomy classifications, and you can edit any detail below.
                </p>
              </div>

              <form @submit.prevent="handleTestAndRegisterSource" class="space-y-4 text-xs">
                <!-- Endpoint URL Input -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-neutral-800 flex items-center gap-1.5">
                      <span>Endpoint URL *</span>
                      <span class="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Primary Input
                      </span>
                    </label>
                  </div>
                  <input
                    type="url"
                    required
                    v-model="newUrl"
                    placeholder="https://www.hkma.gov.hk/rss/circulars.xml or https://www.mas.gov.sg/notices"
                    class="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs shadow-2xs"
                  />

                  <!-- Auto-Selection Assistant Banner -->
                  <div
                    v-if="newUrl.trim() && isAutoDetected"
                    class="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/90 rounded-xl text-xs space-y-1.5 animate-in fade-in"
                  >
                    <div class="flex items-center justify-between flex-wrap gap-2">
                      <span class="font-bold text-blue-900 flex items-center gap-1.5">
                        <Sparkles class="w-4 h-4 text-blue-600 animate-pulse" />
                        <span>Information Auto-Selected from URL</span>
                      </span>
                      <span class="text-[10px] text-blue-700 bg-white/80 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                        Review or edit below
                      </span>
                    </div>
                    <div class="text-[11px] text-blue-800 flex items-center gap-2 flex-wrap pt-0.5">
                      <span>Authority: <strong>{{ newRegulator }}</strong></span>
                      <span>•</span>
                      <span>Jurisdiction: <strong>{{ newJurisdiction }}</strong></span>
                      <span>•</span>
                      <span>Category: <strong>{{ newCategory }}</strong></span>
                      <span>•</span>
                      <span>Type: <strong>{{ newSourceType }}</strong></span>
                    </div>
                  </div>
                  <div v-else class="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-0.5 pl-1">
                    <Sparkles class="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Type or paste any URL above — we will automatically suggest and select all fields below for you.</span>
                  </div>
                </div>

                <!-- Editable Fields Auto-Chosen by System -->
                <div class="pt-2 border-t border-neutral-100 space-y-3.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                      Configuration Details (Auto-Chosen & Fully Editable)
                    </span>
                    <span class="text-[10px] text-neutral-400">
                      Modify any field if needed
                    </span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <!-- Assign Regulator Entity -->
                    <div class="relative">
                      <div class="flex items-center justify-between mb-1">
                        <label class="font-semibold text-neutral-700">
                          Regulator Entity *
                        </label>
                        <span v-if="isAutoDetected" class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Auto-selected
                        </span>
                      </div>
                      <input
                        type="text"
                        v-model="regulatorComboboxSearch"
                        @input="() => { newRegulator = regulatorComboboxSearch; isRegulatorDropdownOpen = true; }"
                        @focus="isRegulatorDropdownOpen = true"
                        placeholder="Search or enter entity (e.g., HKMA, MAS, VARA...)"
                        class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 focus:outline-none focus:bg-white text-xs"
                      />

                      <!-- Dropdown -->
                      <div
                        v-if="isRegulatorDropdownOpen"
                        class="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20 divide-y divide-neutral-100"
                      >
                        <div
                          v-for="r in regulators.filter(
                            (item) =>
                              item.name.toLowerCase().includes(regulatorComboboxSearch.toLowerCase()) ||
                              item.acronym.toLowerCase().includes(regulatorComboboxSearch.toLowerCase())
                          )"
                          :key="r.id"
                          @click="
                            () => {
                              newRegulator = r.name;
                              regulatorComboboxSearch = r.name;
                              newJurisdiction = r.jurisdiction;
                              isRegulatorDropdownOpen = false;
                            }
                          "
                          class="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span class="font-bold text-neutral-900">{{ r.name }}</span>
                            <span class="text-[10px] text-neutral-500 ml-1.5 font-mono">({{ r.acronym }})</span>
                          </div>
                          <span class="text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                            {{ r.jurisdiction }}
                          </span>
                        </div>

                        <div
                          v-if="regulatorComboboxSearch.trim()"
                          @click="
                            () => {
                              newRegulator = regulatorComboboxSearch.trim();
                              isRegulatorDropdownOpen = false;
                            }
                          "
                          class="p-2.5 hover:bg-blue-50/60 cursor-pointer text-xs text-blue-700 font-semibold bg-blue-50/30 flex items-center gap-1.5"
                        >
                          <span>Use custom entity: "{{ regulatorComboboxSearch.trim() }}"</span>
                        </div>
                      </div>
                    </div>

                    <!-- Assign Jurisdiction -->
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="font-semibold text-neutral-700">Jurisdiction *</label>
                        <span v-if="isAutoDetected" class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Auto-selected
                        </span>
                      </div>
                      <select
                        v-model="newJurisdiction"
                        class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 focus:outline-none focus:bg-white"
                      >
                        <option v-for="j in availableJurisdictions" :key="j" :value="j">
                          {{ j }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="font-semibold text-neutral-700">Regulatory Category *</label>
                        <span v-if="isAutoDetected" class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Auto-selected
                        </span>
                      </div>
                      <select
                        v-model="newCategory"
                        class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 focus:outline-none focus:bg-white"
                      >
                        <option v-for="cat in REGULATORY_CATEGORIES" :key="cat" :value="cat">
                          {{ cat }}
                        </option>
                      </select>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="font-semibold text-neutral-700 block mb-1">Source Type</label>
                        <select
                          v-model="newSourceType"
                          class="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 focus:outline-none focus:bg-white"
                        >
                          <option value="Circulars RSS">Circulars RSS</option>
                          <option value="Official Gazette">Official Gazette</option>
                          <option value="Press Releases">Press Releases</option>
                          <option value="Consultation Portal">Consultation</option>
                        </select>
                      </div>
                      <div>
                        <label class="font-semibold text-neutral-700 block mb-1">Priority</label>
                        <select
                          v-model="newPriority"
                          class="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 focus:outline-none focus:bg-white"
                        >
                          <option value="High">High</option>
                          <option value="Standard">Standard</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <label class="font-semibold text-neutral-700">
                        Themes (Standard Taxonomy) *
                      </label>
                      <span v-if="isAutoDetected" class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Auto-assigned • Click to toggle
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                      <button
                        v-for="theme in REGULATORY_THEMES"
                        :key="theme"
                        type="button"
                        @click="handleToggleNewSourceTheme(theme)"
                        :class="`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                          newThemes.includes(theme)
                            ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                        }`"
                      >
                        <Check v-if="newThemes.includes(theme)" class="w-3 h-3" />
                        <span>{{ theme }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  :disabled="isVerifying"
                  class="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  <RefreshCw v-if="isVerifying" class="w-4 h-4 animate-spin" />
                  <Activity v-else class="w-4 h-4" />
                  <span>
                    {{ isVerifying ? 'Probing Endpoint & Verifying Digest...' : 'Test Connectivity & Register Input Source' }}
                  </span>
                </button>
              </form>

              <div
                v-if="probeResult.status"
                :class="`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1 ${
                  probeResult.status === 'Verified & Reachable'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`"
              >
                <div class="font-bold flex items-center gap-1.5">
                  <CheckCircle2 v-if="probeResult.status === 'Verified & Reachable'" class="w-4 h-4 text-emerald-600" />
                  <AlertCircle v-else class="w-4 h-4 text-rose-600" />
                  <span>{{ probeResult.status }}</span>
                  <span v-if="probeResult.latencyMs" class="text-[10px] font-mono font-normal">
                    ({{ probeResult.latencyMs }}ms latency)
                  </span>
                </div>
                <p>{{ probeResult.message }}</p>
              </div>
            </div>

            <!-- Active Custom Sources Table -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Active Custom Sources ({{ customSources.length }})
                </h4>
                <span class="text-[11px] text-neutral-400">Managed by Compliance Engineering</span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="src in customSources"
                  :key="src.id"
                  :class="`p-4 rounded-2xl border space-y-2.5 text-xs transition-all ${
                    src.isFollowed !== false
                      ? 'bg-white border-neutral-200 shadow-2xs hover:border-neutral-300'
                      : 'bg-neutral-50/70 border-neutral-200 opacity-80'
                  }`"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-neutral-900 text-xs sm:text-sm">{{ src.regulator }}</span>
                        <span class="text-[10px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                          {{ src.jurisdiction }}
                        </span>
                        <span class="text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                          {{ src.category || 'Financial Services & Capital Markets' }}
                        </span>
                      </div>
                      <p class="font-mono text-[11px] text-neutral-600 truncate mt-1">{{ src.url }}</p>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <span
                        :class="`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          src.status === 'Verified & Reachable'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`"
                      >
                        {{ src.status }}
                      </span>

                      <button
                        type="button"
                        @click.stop="emit('toggleCustomSourceFollow', src.id)"
                        :class="`group px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          src.isFollowed !== false
                            ? 'bg-blue-600 hover:bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                        }`"
                        :title="src.isFollowed !== false ? 'Click to unfollow this source' : 'Click to follow this source'"
                      >
                        <template v-if="src.isFollowed !== false">
                          <span class="group-hover:hidden">Following</span>
                          <span class="hidden group-hover:inline">Unfollow</span>
                        </template>
                        <template v-else>
                          + Follow
                        </template>
                      </button>
                    </div>
                  </div>

                  <div v-if="src.themes && src.themes.length > 0" class="flex flex-wrap gap-1">
                    <span
                      v-for="(th, idx) in src.themes"
                      :key="`${th}-${idx}`"
                      class="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md font-medium"
                    >
                      {{ th }}
                    </span>
                  </div>

                  <div class="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                    <div class="flex items-center gap-1">
                      <Calendar class="w-3 h-3 text-neutral-400" />
                      <span>Registered: <strong>{{ src.createdDate || '2026-08-14' }}</strong></span>
                    </div>
                    <div
                      v-if="src.isFollowed !== false"
                      class="flex items-center gap-1 text-emerald-600 font-sans font-medium"
                    >
                      <CheckCircle2 class="w-3 h-3" />
                      <span>Surveillance Active</span>
                    </div>
                    <div
                      v-else
                      class="flex items-center gap-1 text-neutral-400 font-sans font-medium"
                    >
                      <Clock class="w-3 h-3 text-neutral-400" />
                      <span>Surveillance Paused (Unfollowed)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
          <span class="text-neutral-500">
            Active configuration applies live to alert triage & feed filters.
          </span>
          <button
            @click="emit('close')"
            class="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
