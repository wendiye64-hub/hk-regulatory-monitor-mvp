<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'radix-vue';
import {
  Sparkles,
  Check,
  CheckCircle2,
  Building2,
  Globe,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  SlidersHorizontal,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  Search,
  CheckCheck,
  FileText,
  Layers,
  HelpCircle,
  Tag,
  Zap,
} from 'lucide-vue-next';
import { useWizardStore } from '@/stores/wizardStore';
import type { RegulatorInScope } from '@/types';

const wizardStore = useWizardStore();

const props = withDefaults(
  defineProps<{
    isOpen?: boolean;
    existingRegulators?: RegulatorInScope[];
  }>(),
  {
    isOpen: false,
    existingRegulators: () => [],
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', payload: { followedRegulatorIds: string[]; selectedMarkets: string[] }): void;
}>();

// Target Markets & Jurisdictions Catalog
interface MarketCountry {
  name: string;
  code: string;
  flag: string;
  continent: 'Asia-Pacific' | 'Europe' | 'North America' | 'Middle East & Others';
}

const ALL_MARKETS: MarketCountry[] = [
  // Asia-Pacific
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰', continent: 'Asia-Pacific' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', continent: 'Asia-Pacific' },
  { name: 'China', code: 'CN', flag: '🇨🇳', continent: 'Asia-Pacific' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', continent: 'Asia-Pacific' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', continent: 'Asia-Pacific' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', continent: 'Asia-Pacific' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', continent: 'Asia-Pacific' },
  { name: 'India', code: 'IN', flag: '🇮🇳', continent: 'Asia-Pacific' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', continent: 'Asia-Pacific' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', continent: 'Asia-Pacific' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', continent: 'Asia-Pacific' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', continent: 'Asia-Pacific' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', continent: 'Asia-Pacific' },
  // Europe
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', continent: 'Europe' },
  { name: 'European Union', code: 'EU', flag: '🇪🇺', continent: 'Europe' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', continent: 'Europe' },
  { name: 'France', code: 'FR', flag: '🇫🇷', continent: 'Europe' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', continent: 'Europe' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', continent: 'Europe' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', continent: 'Europe' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', continent: 'Europe' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', continent: 'Europe' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', continent: 'Europe' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹', continent: 'Europe' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', continent: 'Europe' },
  // North America
  { name: 'United States', code: 'US', flag: '🇺🇸', continent: 'North America' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', continent: 'North America' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', continent: 'North America' },
  // Middle East & Others
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', continent: 'Middle East & Others' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', continent: 'Middle East & Others' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱', continent: 'Middle East & Others' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', continent: 'Middle East & Others' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', continent: 'Middle East & Others' },
];

const CONTINENT_TABS = ['All', 'Asia-Pacific', 'Europe', 'North America', 'Middle East & Others'] as const;
const activeContinentTab = ref<(typeof CONTINENT_TABS)[number]>('All');
const marketSearchQuery = ref('');

// Step 1 Inputs State
const localCompanyBusiness = ref(wizardStore.companyBusiness || '');
const localRegulatoryFocus = ref(wizardStore.regulatoryFocus || '');
const localSelectedMarkets = ref<string[]>(
  wizardStore.selectedMarkets && wizardStore.selectedMarkets.length > 0
    ? [...wizardStore.selectedMarkets]
    : ['Hong Kong', 'Singapore']
);

// Keep synchronized if store updates
watch(
  () => wizardStore.companyBusiness,
  (val) => {
    if (val && !localCompanyBusiness.value) localCompanyBusiness.value = val;
  }
);
watch(
  () => wizardStore.regulatoryFocus,
  (val) => {
    if (val && !localRegulatoryFocus.value) localRegulatoryFocus.value = val;
  }
);
watch(
  () => wizardStore.selectedMarkets,
  (val) => {
    if (val && val.length > 0 && localSelectedMarkets.value.length === 0) {
      localSelectedMarkets.value = [...val];
    }
  }
);

// Quick presets for Company Business
const BUSINESS_PRESETS = [
  {
    label: '💎 虛擬資產交易與託管 (Licensed VASP)',
    text: '我們是一家持牌虛擬資產交易與託管機構，提供機構級數字資產託管、OTC大額結算以及場外衍生品流動性服務，受主要金融監管機構監察。',
  },
  {
    label: '🏦 商業銀行與財富管理 (Banking & Wealth)',
    text: '我們是跨國商業銀行與私人財富管理機構，涵蓋零售與機構存款、跨境理財通、結構性資產配置與基金代銷，受中央銀行及證監機構全面審慎監管。',
  },
  {
    label: '💳 跨境支付清算與FinTech (Payments Rail)',
    text: '我們是跨境支付與多幣種清算基礎設施平台，提供全球商戶收單、外匯結算 API 以及跨境錢包互通通道，遵循牌照與反洗錢標準。',
  },
  {
    label: '🤖 AI 金融科技與演算法 (AI Trading & SaaS)',
    text: '我們是一家高頻演算法交易與AI合規分析技術提供商，採用機器學習模型進行即時市場數據分析、自動化做市以及合規風險監測。',
  },
];

// Quick presets for Regulatory Focus
const FOCUS_KEYWORDS = [
  '運營韌性 (DORA / SPM OR-2)',
  'AI 模型風險與治理 (SPM AI-1)',
  '反洗錢與制裁名單 (AML/CFT)',
  '客戶資產隔離與託管標準',
  '重大事件通報時限 (SLA 4h-24h)',
  '第三方雲端外包與供應商審計',
  '消費者保護與市場行為 (Consumer Duty)',
  '氣候與 ESG 永續資訊披露',
];

const appendBusinessPreset = (text: string) => {
  if (!localCompanyBusiness.value.trim()) {
    localCompanyBusiness.value = text;
  } else {
    localCompanyBusiness.value = `${localCompanyBusiness.value.trim()}\n${text}`;
  }
};

const appendFocusKeyword = (keyword: string) => {
  if (!localRegulatoryFocus.value.trim()) {
    localRegulatoryFocus.value = keyword;
  } else if (!localRegulatoryFocus.value.includes(keyword)) {
    localRegulatoryFocus.value = `${localRegulatoryFocus.value.trim()}、${keyword}`;
  }
};

// Filtered Markets
const filteredMarkets = computed(() => {
  let list = ALL_MARKETS;
  if (activeContinentTab.value !== 'All') {
    list = list.filter((m) => m.continent === activeContinentTab.value);
  }
  if (marketSearchQuery.value.trim()) {
    const q = marketSearchQuery.value.toLowerCase().trim();
    list = list.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
  }
  return list;
});

const toggleMarket = (marketName: string) => {
  if (localSelectedMarkets.value.includes(marketName)) {
    localSelectedMarkets.value = localSelectedMarkets.value.filter((m) => m !== marketName);
  } else {
    localSelectedMarkets.value.push(marketName);
  }
};

const selectAllInTab = (continent: string) => {
  let targetMarkets: string[] = [];
  if (continent === 'All') {
    targetMarkets = ALL_MARKETS.map((m) => m.name);
  } else {
    targetMarkets = ALL_MARKETS.filter((m) => m.continent === continent).map((m) => m.name);
  }
  const currentSet = new Set(localSelectedMarkets.value);
  targetMarkets.forEach((m) => currentSet.add(m));
  localSelectedMarkets.value = Array.from(currentSet);
};

const deselectAllInTab = (continent: string) => {
  let targetMarkets: Set<string>;
  if (continent === 'All') {
    targetMarkets = new Set(ALL_MARKETS.map((m) => m.name));
  } else {
    targetMarkets = new Set(
      ALL_MARKETS.filter((m) => m.continent === continent).map((m) => m.name)
    );
  }
  localSelectedMarkets.value = localSelectedMarkets.value.filter((m) => !targetMarkets.has(m));
};

const selectQuickMarketBundle = (bundle: 'apac' | 'west' | 'global') => {
  if (bundle === 'apac') {
    localSelectedMarkets.value = Array.from(
      new Set([...localSelectedMarkets.value, 'Hong Kong', 'Singapore'])
    );
  } else if (bundle === 'west') {
    localSelectedMarkets.value = Array.from(
      new Set([...localSelectedMarkets.value, 'United States', 'United Kingdom', 'European Union'])
    );
  } else if (bundle === 'global') {
    localSelectedMarkets.value = [
      'Hong Kong',
      'Singapore',
      'United States',
      'United Kingdom',
      'European Union',
      'Australia',
      'Japan',
      'Switzerland',
    ];
  }
};

// ==================== SUGGESTED REGULATORS CATALOG (ALL 23 AUTHORITIES) ====================
export interface SuggestedRegulator {
  id: string;
  name: string;
  acronym: string;
  jurisdiction: string;
  region: 'Hong Kong' | 'Singapore' | 'United States' | 'United Kingdom' | 'European Union' | 'Global / Other';
  flag: string;
  category: string;
  reason: string;
  keyThemes: string[];
  isHighRelevance?: boolean;
}

const ALL_REGULATORS: SuggestedRegulator[] = [
  {
    id: 'regl-001',
    name: 'Hong Kong Monetary Authority',
    acronym: 'HKMA',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Banking & Macroprudential',
    reason: 'Crucial for AI model governance (SPM AI-1), customer data isolation, and statutory banking supervision.',
    keyThemes: ['AI Governance', 'Operational Resilience', 'AML/CFT'],
    isHighRelevance: true,
  },
  {
    id: 'regl-002',
    name: 'Securities and Futures Commission',
    acronym: 'SFC',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Securities & Derivatives',
    reason: 'Primary regulator for algorithmic trading, client asset segregation, and virtual asset trading platforms (VATP).',
    keyThemes: ['Market Conduct', 'Client Protection', 'Crypto VASP'],
    isHighRelevance: true,
  },
  {
    id: 'regl-003',
    name: 'Monetary Authority of Singapore',
    acronym: 'MAS',
    jurisdiction: 'Singapore',
    region: 'Singapore',
    flag: '🇸🇬',
    category: 'Integrated Banking & Capital Markets',
    reason: 'High surveillance priority for FinTech sandboxes, cross-border payment mandates, and FEAT principles.',
    keyThemes: ['FinTech Licensing', 'Cyber Resilience', 'Prudential Standards'],
    isHighRelevance: true,
  },
  {
    id: 'regl-004',
    name: 'Financial Conduct Authority',
    acronym: 'FCA',
    jurisdiction: 'United Kingdom',
    region: 'United Kingdom',
    flag: '🇬🇧',
    category: 'Market Conduct & Consumer Oversight',
    reason: 'Essential for Consumer Duty compliance, operational vulnerability tolerances, and systemic audit access.',
    keyThemes: ['Consumer Duty', 'Vendor Outsourcing', 'Operational Resilience'],
    isHighRelevance: true,
  },
  {
    id: 'regl-005',
    name: 'Securities and Exchange Commission',
    acronym: 'SEC',
    jurisdiction: 'United States',
    region: 'United States',
    flag: '🇺🇸',
    category: 'Securities & Capital Markets',
    reason: 'Key enforcement tracker for public climate disclosures, cybersecurity incident 4-day filing, and digital assets.',
    keyThemes: ['Disclosure Rules', 'Cyber Incident SLA', 'Securities'],
    isHighRelevance: true,
  },
  {
    id: 'regl-007',
    name: 'Privacy Commissioner for Personal Data',
    acronym: 'PCPD',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Data, AML & Integrity',
    reason: 'Ethical application of AI models, personal data privacy principles, and cross-border data transfer security.',
    keyThemes: ['Data Privacy', 'AI Ethics', 'Cross-Border Data'],
    isHighRelevance: true,
  },
  {
    id: 'regl-012',
    name: 'European Banking Authority',
    acronym: 'EBA',
    jurisdiction: 'European Union',
    region: 'European Union',
    flag: '🇪🇺',
    category: 'Banking & Prudential Supervision',
    reason: 'Direct supervisory rulebook for EU DORA (Digital Operational Resilience Act), ICT incident reporting, and prudential capital.',
    keyThemes: ['EU DORA', 'ICT Risk', 'Prudential Standards'],
    isHighRelevance: true,
  },
  {
    id: 'regl-014',
    name: 'Federal Reserve Board',
    acronym: 'Fed',
    jurisdiction: 'United States',
    region: 'United States',
    flag: '🇺🇸',
    category: 'Central Banking & Systemic Oversight',
    reason: 'Macroprudential bank holding supervision, synthetic identity fraud surveillance, and payment system rules.',
    keyThemes: ['Systemic Risk', 'Payment Rails', 'Bank Supervision'],
    isHighRelevance: true,
  },
  {
    id: 'regl-015',
    name: 'Prudential Regulation Authority',
    acronym: 'PRA',
    jurisdiction: 'United Kingdom',
    region: 'United Kingdom',
    flag: '🇬🇧',
    category: 'Prudential Capital & Solvency',
    reason: 'Critical third-party supplier concentration rules, Basel capital adequacy, and MREL loss-absorbing buffers.',
    keyThemes: ['Prudential Buffer', 'Critical Suppliers', 'Capital Adequacy'],
    isHighRelevance: true,
  },
  {
    id: 'regl-016',
    name: 'Federal Financial Supervisory Authority',
    acronym: 'BaFin',
    jurisdiction: 'Germany / EU',
    region: 'European Union',
    flag: '🇪🇺',
    category: 'Banking, Securities & Insurance',
    reason: 'Comprehensive supervisory enforcement across EU banking, insurance, IT governance, and digital asset markets.',
    keyThemes: ['EU DORA', 'IT Governance', 'Sustainable Finance'],
    isHighRelevance: true,
  },
  {
    id: 'regl-017',
    name: 'Australian Securities and Investments Commission',
    acronym: 'ASIC',
    jurisdiction: 'Australia',
    region: 'Global / Other',
    flag: '🇦🇺',
    category: 'Securities & Market Integrity',
    reason: 'Enforces market integrity, consumer credit codes, and digital asset regulatory sandboxes in Australia.',
    keyThemes: ['Market Conduct', 'Crypto VASP', 'Client Protection'],
    isHighRelevance: true,
  },
  {
    id: 'regl-018',
    name: 'Australian Prudential Regulation Authority',
    acronym: 'APRA',
    jurisdiction: 'Australia',
    region: 'Global / Other',
    flag: '🇦🇺',
    category: 'Banking & Prudential Supervision',
    reason: 'Prudential supervision standards (CPS 234 Information Security, CPS 230 Operational Resilience).',
    keyThemes: ['Operational Resilience', 'ICT Risk', 'Prudential Standards'],
    isHighRelevance: false,
  },
  {
    id: 'regl-019',
    name: 'Financial Services Agency',
    acronym: 'JFSA',
    jurisdiction: 'Japan',
    region: 'Global / Other',
    flag: '🇯🇵',
    category: 'Banking, Securities & Insurance',
    reason: 'Comprehensive supervision of Japanese financial institutions, Payment Services Act, and crypto asset custody.',
    keyThemes: ['Payment Rails', 'Crypto VASP', 'FinTech Licensing'],
    isHighRelevance: false,
  },
  {
    id: 'regl-020',
    name: "People's Bank of China",
    acronym: 'PBOC',
    jurisdiction: 'China',
    region: 'Global / Other',
    flag: '🇨🇳',
    category: 'Central Banking & Macroprudential',
    reason: 'Cross-border RMB clearing, systemic risk surveillance, and financial institution cybersecurity.',
    keyThemes: ['Cross-Border Data', 'AML/CFT', 'Prudential Standards'],
    isHighRelevance: false,
  },
  {
    id: 'regl-021',
    name: 'Swiss Financial Market Supervisory Authority',
    acronym: 'FINMA',
    jurisdiction: 'Switzerland',
    region: 'Global / Other',
    flag: '🇨🇭',
    category: 'Banking & Securities Supervision',
    reason: 'Prudential supervision, anti-money laundering enforcement, and DLT / blockchain licensing guidance.',
    keyThemes: ['AML/CFT', 'Crypto VASP', 'Operational Resilience'],
    isHighRelevance: false,
  },
  {
    id: 'regl-022',
    name: 'Dubai Financial Services Authority',
    acronym: 'DFSA',
    jurisdiction: 'United Arab Emirates',
    region: 'Global / Other',
    flag: '🇦🇪',
    category: 'Financial Services & Capital Markets',
    reason: 'DIFC independent financial regulatory regime, crypto token regulations, and cross-border commercial supervision.',
    keyThemes: ['Crypto VASP', 'Market Conduct', 'FinTech Licensing'],
    isHighRelevance: false,
  },
  {
    id: 'regl-023',
    name: 'Financial Action Task Force',
    acronym: 'FATF',
    jurisdiction: 'International',
    region: 'Global / Other',
    flag: '🌐',
    category: 'Compliance, Risk & Enforcement',
    reason: 'Global AML/CFT recommendations, Travel Rule enforcement, and virtual asset service provider standards.',
    keyThemes: ['AML/CFT', 'Travel Rule', 'Sanctions'],
    isHighRelevance: true,
  },
  {
    id: 'regl-006',
    name: 'Companies Registry',
    acronym: 'CR',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Corporate Registration & Governance',
    reason: 'Statutory registers, beneficial ownership disclosures, and corporate governance filing transparency.',
    keyThemes: ['Corporate Governance', 'Beneficial Ownership', 'Statutory Filing'],
    isHighRelevance: false,
  },
  {
    id: 'regl-008',
    name: 'Insurance Authority',
    acronym: 'IA',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Insurance & Pensions',
    reason: 'Enterprise risk management (GL21), risk-based capital standards, and cybersecurity in insurance.',
    keyThemes: ['Enterprise Risk', 'Solvency Margin', 'InsurTech'],
    isHighRelevance: false,
  },
  {
    id: 'regl-009',
    name: 'Inland Revenue Department',
    acronym: 'IRD',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Tax & Business Filing',
    reason: 'Automatic Exchange of Financial Account Information (AEOI/CRS), FATCA compliance, and transfer pricing.',
    keyThemes: ['AEOI / CRS', 'Tax Compliance', 'Financial Accounts'],
    isHighRelevance: false,
  },
  {
    id: 'regl-010',
    name: 'Competition Commission',
    acronym: 'HKCC',
    jurisdiction: 'Hong Kong',
    region: 'Hong Kong',
    flag: '🇭🇰',
    category: 'Competition & Consumer Protection',
    reason: 'Algorithmic pricing collusion, digital platform competition oversight, and market conduct antitrust enforcement.',
    keyThemes: ['Competition Law', 'Algorithmic Pricing', 'Market Conduct'],
    isHighRelevance: false,
  },
  {
    id: 'regl-011',
    name: 'Accounting and Corporate Regulatory Authority',
    acronym: 'ACRA',
    jurisdiction: 'Singapore',
    region: 'Singapore',
    flag: '🇸🇬',
    category: 'Corporate Registration & Governance',
    reason: 'Mandatory climate reporting roadmaps, beneficial ownership registers, and statutory corporate filings.',
    keyThemes: ['Climate Reporting', 'Corporate Registers', 'Governance'],
    isHighRelevance: false,
  },
  {
    id: 'regl-013',
    name: 'International Organization for Standardization',
    acronym: 'ISO',
    jurisdiction: 'International',
    region: 'Global / Other',
    flag: '🌐',
    category: 'Telecoms, Media & Critical Infrastructure',
    reason: 'ISO/IEC 42001 Artificial Intelligence Management System (AIMS) and global information security audit standards.',
    keyThemes: ['ISO 42001 AI', 'Information Security', 'Global Standards'],
    isHighRelevance: false,
  },
];

// ==================== DYNAMIC HIGH-RELATION CALCULATION ====================
// Determines if a regulator has high relation based on selected jurisdictions & business/focus text
const checkRegulatorHighRelation = (r: SuggestedRegulator): boolean => {
  const selected = wizardStore.selectedMarkets;
  const businessLower = (wizardStore.companyBusiness || '').toLowerCase();
  const focusLower = (wizardStore.regulatoryFocus || '').toLowerCase();
  const fullText = `${businessLower} ${focusLower}`;

  const jurLower = r.jurisdiction.toLowerCase();
  const regionLower = r.region.toLowerCase();

  const isJurSelected = selected.some((m) => {
    const ml = m.toLowerCase();
    return jurLower.includes(ml) || ml.includes(jurLower) || regionLower.includes(ml);
  });

  // If in user's selected markets, check tier-1 authorities
  if (isJurSelected) {
    const tier1Acronyms = [
      'HKMA', 'SFC', 'MAS', 'FCA', 'SEC', 'EBA', 'Fed', 'PRA', 'BaFin', 'ASIC', 'APRA', 'JFSA', 'PBOC', 'FINMA', 'DFSA'
    ];
    if (tier1Acronyms.includes(r.acronym)) return true;

    // PCPD in HK if AI, data, cyber or privacy mentioned
    if (
      r.acronym === 'PCPD' &&
      (fullText.includes('data') ||
        fullText.includes('privacy') ||
        fullText.includes('ai') ||
        fullText.includes('cyber') ||
        fullText.includes('ethics') ||
        fullText.includes('personal'))
    ) {
      return true;
    }

    // ACRA in SG if governance, corporate or climate
    if (
      r.acronym === 'ACRA' &&
      (fullText.includes('climate') ||
        fullText.includes('governance') ||
        fullText.includes('corporate') ||
        fullText.includes('esg'))
    ) {
      return true;
    }
  }

  // International bodies
  if (r.jurisdiction === 'International' || r.region === 'Global / Other') {
    if (
      r.acronym === 'FATF' &&
      (fullText.includes('aml') ||
        fullText.includes('sanction') ||
        fullText.includes('kyc') ||
        fullText.includes('laundering') ||
        fullText.includes('travel rule') ||
        fullText.includes('cft'))
    ) {
      return true;
    }
    if (
      r.acronym === 'ISO' &&
      (fullText.includes('ai') ||
        fullText.includes('iso') ||
        fullText.includes('cyber') ||
        fullText.includes('security') ||
        fullText.includes('standard') ||
        fullText.includes('42001'))
    ) {
      return true;
    }
  }

  // Cross-border theme triggers
  if (
    (fullText.includes('crypto') ||
      fullText.includes('virtual asset') ||
      fullText.includes('vasp') ||
      fullText.includes('token') ||
      fullText.includes('web3')) &&
    ['SFC', 'MAS', 'FINMA', 'ASIC', 'DFSA', 'SEC'].includes(r.acronym) &&
    (isJurSelected || ['SFC', 'MAS'].includes(r.acronym))
  ) {
    return true;
  }

  if (
    (fullText.includes('resilience') ||
      fullText.includes('dora') ||
      fullText.includes('incident') ||
      fullText.includes('outage') ||
      fullText.includes('bcp')) &&
    ['HKMA', 'EBA', 'PRA', 'APRA', 'FCA'].includes(r.acronym) &&
    (isJurSelected || ['HKMA', 'EBA'].includes(r.acronym))
  ) {
    return true;
  }

  return isJurSelected ? (r.isHighRelevance ?? false) : false;
};

// Evaluated Regulators Catalog with dynamic isHighRelation flag
const evaluatedRegulators = computed(() => {
  return ALL_REGULATORS.map((reg) => ({
    ...reg,
    isHighRelation: checkRegulatorHighRelation(reg),
  }));
});

// High-Relation Regulators (Recommended for User to Follow)
const highRelationRegulators = computed(() => {
  return evaluatedRegulators.value.filter((r) => r.isHighRelation);
});

// Dynamic Jurisdiction Filter Tabs in Step 2
const dynamicJurisdictionTabs = computed(() => {
  const base = [
    'All',
    'Hong Kong',
    'Singapore',
    'United States',
    'United Kingdom',
    'European Union',
    'Australia',
    'Japan',
    'China',
    'Switzerland',
    'United Arab Emirates',
    'International',
  ];
  const fromSelected = wizardStore.selectedMarkets.filter((m) => !base.includes(m));
  return [...base, ...fromSelected];
});

// Filtered catalog for Step 2 Search & Jurisdictions
const step2Catalog = computed(() => {
  return evaluatedRegulators.value.filter((r) => {
    if (wizardStore.selectedJurisdictionFilter !== 'All') {
      const target = wizardStore.selectedJurisdictionFilter.toLowerCase().trim();
      const matchJur =
        r.jurisdiction.toLowerCase() === target ||
        r.jurisdiction.toLowerCase().includes(target) ||
        target.includes(r.jurisdiction.toLowerCase());
      const matchRegion = r.region.toLowerCase() === target;
      if (!matchJur && !matchRegion) {
        return false;
      }
    }
    if (wizardStore.searchQuery.trim()) {
      const q = wizardStore.searchQuery.toLowerCase().trim();
      const match =
        r.name.toLowerCase().includes(q) ||
        r.acronym.toLowerCase().includes(q) ||
        r.jurisdiction.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.keyThemes.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
});

// Followed & Unfollowed lists in Step 2
const followedRegulators = computed(() => {
  return step2Catalog.value.filter((r) =>
    wizardStore.followedRegulatorIds.includes(r.id)
  );
});

const unfollowedRegulators = computed(() => {
  return step2Catalog.value.filter(
    (r) => !wizardStore.followedRegulatorIds.includes(r.id)
  );
});

// Other available authorities that are NOT in High-Relation
const otherAvailableRegulators = computed(() => {
  return step2Catalog.value.filter((r) => !r.isHighRelation);
});

// Follow Actions
const handleFollowAllHighRelation = () => {
  const highIds = highRelationRegulators.value.map((r) => r.id);
  wizardStore.followedRegulatorIds = Array.from(
    new Set([...wizardStore.followedRegulatorIds, ...highIds])
  );
};

const handleClearAllFollowed = () => {
  wizardStore.followedRegulatorIds = [];
};

// Transition from Step 1 to Step 2
const handleConfirmStep1AndGenerate = () => {
  // Sync local inputs into store
  wizardStore.companyBusiness = localCompanyBusiness.value;
  wizardStore.regulatoryFocus = localRegulatoryFocus.value;
  wizardStore.selectedMarkets =
    localSelectedMarkets.value.length > 0
      ? [...localSelectedMarkets.value]
      : ['Hong Kong', 'Singapore'];

  // Calculate high relation IDs based on current inputs
  const highIds = ALL_REGULATORS.filter((r) =>
    checkRegulatorHighRelation(r)
  ).map((r) => r.id);

  // Trigger store transition and pre-recommend all high-relation institutions
  wizardStore.confirmScopingAndOpenRecommendations(
    localCompanyBusiness.value,
    localRegulatoryFocus.value,
    localSelectedMarkets.value,
    highIds
  );
};

const handleFinishWizard = () => {
  emit('complete', {
    followedRegulatorIds: wizardStore.followedRegulatorIds,
    selectedMarkets: wizardStore.selectedMarkets,
  });
  wizardStore.finishWizard();
  emit('close');
};

const handleClose = () => {
  wizardStore.closeWizard();
  emit('close');
};
</script>

<template>
  <DialogRoot
    :open="wizardStore.isOpen || props.isOpen"
    @update:open="(val: boolean) => !val && handleClose()"
  >
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[96vw] max-w-5xl lg:max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-2xl duration-200 animate-in zoom-in-95 focus:outline-none max-h-[92vh] flex flex-col"
      >
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-neutral-100 pb-3 shrink-0">
          <div class="space-y-1">
            <div
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold tracking-wide uppercase"
            >
              <Sparkles class="w-3.5 h-3.5 text-blue-600" />
              <span>Interactive Scoping Wizard &bull; Dual-Step</span>
            </div>
            <DialogTitle class="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
              {{
                wizardStore.currentStep === 1
                  ? 'Step 1: 公司業務、監管重點與關注地區 (Business Profile & Jurisdictions)'
                  : 'Step 2: 高關聯度推薦機構與關注清單 (Recommended Regulators & Scope)'
              }}
            </DialogTitle>
            <DialogDescription class="text-xs text-neutral-500">
              {{
                wizardStore.currentStep === 1
                  ? '填入貴機構的業務內容、想重點留意的合規範疇，並選擇關注營運地區。系統將即時智慧配對高關聯度的監管機構。'
                  : '已為您自動識別並推薦所有高關聯度的監管機構，您可以一鍵關注或自定義調整，並同步至系統監管雷達。'
              }}
            </DialogDescription>
          </div>

          <DialogClose
            @click="handleClose"
            class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="關閉 / 在後台執行"
          >
            <X class="w-4 h-4" />
            <span class="sr-only">Close</span>
          </DialogClose>
        </div>

        <!-- Dual-Step Stepper -->
        <div class="py-3 border-b border-neutral-100 shrink-0">
          <div class="flex items-center justify-between relative max-w-lg mx-auto">
            <div class="absolute left-10 right-10 top-3.5 -translate-y-1/2 h-0.5 bg-neutral-200 -z-0" />
            <div
              class="absolute left-10 top-3.5 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
              :style="{ width: wizardStore.currentStep === 1 ? '0%' : '100%' }"
            />

            <!-- Step 1 Tab -->
            <div
              @click="wizardStore.currentStep = 1"
              class="relative z-10 flex flex-col items-center gap-1 cursor-pointer select-none"
            >
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs"
                :class="
                  wizardStore.currentStep > 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white ring-4 ring-blue-100'
                "
              >
                <Check v-if="wizardStore.currentStep > 1" class="w-3.5 h-3.5 stroke-[3]" />
                <span v-else>1</span>
              </div>
              <span
                class="text-[11px] font-semibold"
                :class="wizardStore.currentStep === 1 ? 'text-blue-700 font-bold' : 'text-neutral-700'"
              >
                業務詳情、監管重點與關注地區
              </span>
            </div>

            <!-- Step 2 Tab -->
            <div
              @click="wizardStore.hasCompletedScoping ? (wizardStore.currentStep = 2) : null"
              class="relative z-10 flex flex-col items-center gap-1 select-none"
              :class="wizardStore.hasCompletedScoping ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
            >
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs"
                :class="
                  wizardStore.currentStep === 2
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : wizardStore.hasCompletedScoping
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-100 text-neutral-400 border border-neutral-300'
                "
              >
                <Check
                  v-if="wizardStore.hasCompletedScoping && wizardStore.currentStep !== 2"
                  class="w-3.5 h-3.5 stroke-[3]"
                />
                <span v-else>2</span>
              </div>
              <span
                class="text-[11px] font-semibold"
                :class="wizardStore.currentStep === 2 ? 'text-blue-700 font-bold' : 'text-neutral-400'"
              >
                高關聯度推薦機構與關注清單
              </span>
            </div>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto py-3 px-1 space-y-4 text-neutral-800">
          <!-- ==================== STEP 1: BUSINESS INPUT + FOCUS INPUT + JURISDICTIONS ==================== -->
          <div v-if="wizardStore.currentStep === 1" class="space-y-4">
            <!-- 1. 第一個輸入框：詳細填入自己公司的業務 -->
            <div class="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 class="w-4 h-4 text-blue-600" />
                      <span>公司核心業務與營運架構 (Company Core Business & Operations)</span>
                    </h4>
                    <p class="text-[11px] text-slate-500">
                      請詳細填寫貴機構的業務領域、金融/科技服務、持牌狀況、核心客群或營運模式。
                    </p>
                  </div>
                </div>
                <span class="text-[11px] font-mono text-neutral-400">
                  {{ localCompanyBusiness.length }} 字元
                </span>
              </div>

              <!-- Textarea for Business Description -->
              <textarea
                v-model="localCompanyBusiness"
                rows="3"
                placeholder="例如：我們是一家跨國金融科技與數字資產平台，在香港及新加坡持有牌照，提供機構級虛擬資產託管、高頻演算法交易清算與 B2B SaaS 企業解決方案，採用混合雲端架構..."
                class="w-full p-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-neutral-400 transition-all shadow-2xs resize-y"
              />

              <!-- Quick Presets for Business -->
              <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span class="text-[11px] text-neutral-400 font-medium shrink-0 flex items-center gap-1">
                  <Zap class="w-3 h-3 text-amber-500" />
                  <span>快捷填入範本：</span>
                </span>
                <button
                  v-for="preset in BUSINESS_PRESETS"
                  :key="preset.label"
                  type="button"
                  @click="appendBusinessPreset(preset.text)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 border border-neutral-200 hover:border-blue-300 text-neutral-600 transition-colors cursor-pointer shadow-2xs"
                  :title="preset.text"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <!-- 2. 額外增加一個輸入框：詳細填入想留意的部份 -->
            <div class="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-2.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 class="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                      <ShieldCheck class="w-4 h-4 text-indigo-600" />
                      <span>想重點留意的合規領域與監管重點 (Regulatory Focus & Key Areas to Monitor)</span>
                    </h4>
                    <p class="text-[11px] text-indigo-700/80">
                      請詳細填寫您最關切或需優先監控的法規、業務風險、申報要求或合規標準。
                    </p>
                  </div>
                </div>
                <span class="text-[11px] font-mono text-neutral-400">
                  {{ localRegulatoryFocus.length }} 字元
                </span>
              </div>

              <!-- Textarea for Regulatory Focus -->
              <textarea
                v-model="localRegulatoryFocus"
                rows="3"
                placeholder="例如：重大運營中斷事件通報 SLA (HKMA SPM OR-2 / EU DORA)、AI 演算法模型治理與倫理風險 (SPM AI-1)、反洗錢制裁名單審查 (AML/CFT)、客戶資產隔離託管標準、第三方雲端外包審計條款..."
                class="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs text-neutral-900 leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-neutral-400 transition-all shadow-2xs resize-y"
              />

              <!-- Quick Focus Keyword Chips -->
              <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span class="text-[11px] text-neutral-400 font-medium shrink-0 flex items-center gap-1">
                  <Tag class="w-3 h-3 text-indigo-500" />
                  <span>快捷加入關鍵字：</span>
                </span>
                <button
                  v-for="kw in FOCUS_KEYWORDS"
                  :key="kw"
                  type="button"
                  @click="appendFocusKeyword(kw)"
                  class="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white hover:bg-indigo-100/70 hover:text-indigo-800 border border-indigo-200 text-neutral-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <Plus class="w-2.5 h-2.5 text-indigo-500" />
                  <span>{{ kw }}</span>
                </button>
              </div>
            </div>

            <!-- 3. 關注地區選擇 (Target Operating Jurisdictions) -->
            <div class="p-4 bg-white border border-neutral-200 rounded-xl space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 class="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <Globe class="w-4 h-4 text-emerald-600" />
                      <span>選擇關注地區與營運法域 (Select Focus Jurisdictions)</span>
                    </h4>
                    <p class="text-[11px] text-neutral-500">
                      選擇貴機構持有牌照、營運覆蓋或需要追蹤監管動態的國家與地區。
                    </p>
                  </div>
                </div>

                <!-- Quick Market Bundles -->
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="selectQuickMarketBundle('apac')"
                    class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    🇭🇰 🇸🇬 亞太雙核心
                  </button>
                  <button
                    type="button"
                    @click="selectQuickMarketBundle('west')"
                    class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    🇺🇸 🇬🇧 🇪🇺 歐美市場
                  </button>
                  <button
                    type="button"
                    @click="selectQuickMarketBundle('global')"
                    class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer"
                  >
                    🌐 全球主要樞紐
                  </button>
                </div>
              </div>

              <!-- Continent Tabs & Search -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-neutral-100">
                <div class="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                  <button
                    v-for="tab in CONTINENT_TABS"
                    :key="tab"
                    type="button"
                    @click="activeContinentTab = tab"
                    :class="`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      activeContinentTab === tab
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`"
                  >
                    {{ tab }}
                  </button>
                </div>

                <div class="relative w-full sm:w-56">
                  <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    v-model="marketSearchQuery"
                    type="text"
                    placeholder="搜尋地區或國家代碼..."
                    class="w-full pl-8 pr-3 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <!-- Select / Deselect actions bar -->
              <div class="flex items-center justify-between gap-2 flex-wrap text-xs pt-0.5">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="selectAllInTab(activeContinentTab)"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors cursor-pointer text-[11px]"
                  >
                    <Check class="w-3 h-3 stroke-[2.5]" />
                    <span>全選本區 ({{ activeContinentTab === 'All' ? '全部' : activeContinentTab }})</span>
                  </button>
                  <button
                    type="button"
                    @click="deselectAllInTab(activeContinentTab)"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-medium border border-neutral-200 transition-colors cursor-pointer text-[11px]"
                  >
                    <X class="w-3 h-3" />
                    <span>清除本區</span>
                  </button>
                </div>

                <div class="text-[11px] text-neutral-500">
                  已選關注地區：
                  <strong class="text-blue-600 font-bold font-mono text-xs">
                    {{ localSelectedMarkets.length }}
                  </strong>
                  / {{ ALL_MARKETS.length }}
                </div>
              </div>

              <!-- Jurisdiction Pills Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 bg-neutral-50/50 rounded-xl border border-neutral-100">
                <button
                  v-for="m in filteredMarkets"
                  :key="m.code"
                  type="button"
                  @click="toggleMarket(m.name)"
                  :class="`p-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    localSelectedMarkets.includes(m.name)
                      ? 'bg-blue-50/90 border-blue-500 ring-1 ring-blue-500/30 text-blue-950 font-bold shadow-2xs'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                  }`"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-base shrink-0">{{ m.flag }}</span>
                    <span class="text-xs truncate">{{ m.name }}</span>
                  </div>
                  <Check
                    v-if="localSelectedMarkets.includes(m.name)"
                    class="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0"
                  />
                </button>
              </div>
            </div>

            <!-- Generate Recommendations CTA Card -->
            <div class="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div class="space-y-0.5 text-center sm:text-left">
                <p class="text-xs sm:text-sm font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <Sparkles class="w-4 h-4 text-amber-300" />
                  <span>已就緒：填妥業務詳情、監管重點與 {{ localSelectedMarkets.length }} 個關注法域</span>
                </p>
                <p class="text-[11px] text-blue-100">
                  系統將即時結合您的業務輪廓，為您篩選並直接呈現高關聯度推薦機構供您一鍵關注。
                </p>
              </div>

              <button
                type="button"
                id="btn-generate-recommendations"
                @click="handleConfirmStep1AndGenerate"
                :disabled="localSelectedMarkets.length === 0 || wizardStore.isAnalyzing"
                class="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0 disabled:opacity-50"
              >
                <Loader2 v-if="wizardStore.isAnalyzing" class="w-4 h-4 animate-spin text-blue-600" />
                <Sparkles v-else class="w-4 h-4 text-amber-500" />
                <span>{{ wizardStore.isAnalyzing ? '智能配對推薦中...' : '確認並生成推薦機構 (Generate) ➔' }}</span>
              </button>
            </div>
          </div>

          <!-- ==================== STEP 2: HIGH RELATION REGULATORS & WATCHLIST ==================== -->
          <div v-else-if="wizardStore.currentStep === 2" class="space-y-4">
            <!-- 1. 專屬亮眼推薦區：🌟 高關聯度推薦機構 (High-Relation Recommended Authorities) -->
            <div class="p-4 bg-gradient-to-br from-amber-50/70 via-blue-50/50 to-indigo-50/40 border-2 border-blue-400/80 rounded-2xl shadow-sm space-y-3">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-blue-200/60 pb-3">
                <div class="space-y-0.5">
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    <Star class="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>AI 智能推薦 &bull; 高關聯度監管機構 (High Relation Authorities)</span>
                  </div>
                  <h3 class="text-sm sm:text-base font-bold text-slate-900">
                    依據您的業務範疇與關注地區，強烈建議追蹤以下重點機構
                  </h3>
                  <p class="text-xs text-slate-600">
                    已自動識別
                    <strong class="text-blue-700 font-bold">{{ highRelationRegulators.length }}</strong>
                    所與您的業務（{{ wizardStore.selectedMarkets.join('、') || '全球市場' }}）高度關聯之主管機構。
                  </p>
                </div>

                <!-- Follow All High Relation CTA -->
                <div class="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
                    type="button"
                    id="btn-follow-all-high-relation"
                    @click="handleFollowAllHighRelation"
                    class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck class="w-4 h-4 stroke-[2.5]" />
                    <span>🌟 一鍵關注所有高關聯機構</span>
                  </button>
                  <button
                    type="button"
                    @click="handleClearAllFollowed"
                    class="px-2.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
                    title="全部清除"
                  >
                    清除
                  </button>
                </div>
              </div>

              <!-- High Relation Regulators Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                <div
                  v-for="reg in highRelationRegulators"
                  :key="reg.id"
                  @click="wizardStore.toggleFollowRegulator(reg.id)"
                  :class="`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    wizardStore.followedRegulatorIds.includes(reg.id)
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/30 shadow-xs'
                      : 'bg-white border-blue-200/80 hover:border-blue-400 hover:bg-blue-50/30 shadow-2xs'
                  }`"
                >
                  <div class="space-y-1.5">
                    <div class="flex items-start justify-between gap-1.5">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-2xl shrink-0">{{ reg.flag }}</span>
                        <div class="min-w-0">
                          <div class="flex items-center gap-1.5">
                            <span class="font-bold text-sm text-neutral-900">{{ reg.acronym }}</span>
                            <span class="text-[10px] px-1.5 py-0.2 rounded bg-white text-neutral-700 border border-neutral-200 font-medium">
                              {{ reg.jurisdiction }}
                            </span>
                          </div>
                          <p class="text-[11px] text-neutral-500 truncate" :title="reg.name">{{ reg.name }}</p>
                        </div>
                      </div>

                      <!-- High Relation Badge -->
                      <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0 flex items-center gap-1">
                        <Star class="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span>High Match</span>
                      </span>
                    </div>

                    <!-- Match Reason -->
                    <p class="text-[11px] text-neutral-600 line-clamp-2 leading-relaxed">
                      {{ reg.reason }}
                    </p>

                    <!-- Key Themes Chips -->
                    <div class="flex items-center gap-1 flex-wrap pt-0.5">
                      <span
                        v-for="theme in reg.keyThemes.slice(0, 2)"
                        :key="theme"
                        class="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600"
                      >
                        {{ theme }}
                      </span>
                    </div>
                  </div>

                  <!-- Follow / Unfollow Button Status -->
                  <div class="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <span class="text-[10px] text-neutral-400 truncate">{{ reg.category }}</span>
                    <button
                      type="button"
                      :class="`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        wizardStore.followedRegulatorIds.includes(reg.id)
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-neutral-100 hover:bg-blue-50 text-neutral-700 hover:text-blue-700 border border-neutral-200'
                      }`"
                    >
                      <Check v-if="wizardStore.followedRegulatorIds.includes(reg.id)" class="w-3 h-3 stroke-[3]" />
                      <Plus v-else class="w-3 h-3" />
                      <span>{{ wizardStore.followedRegulatorIds.includes(reg.id) ? '已關注' : '關注' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. AI 合規全貌分析卡片 (AI Scoping Rationale & Priority Analysis) -->
            <div class="border border-blue-200 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white shadow-2xs">
              <div class="p-3 sm:p-3.5 flex items-center justify-between bg-blue-50/90 border-b border-blue-100">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="wizardStore.isRationaleExpanded = !wizardStore.isRationaleExpanded"
                    class="p-1 rounded-md text-blue-700 hover:bg-blue-200/50 transition-colors cursor-pointer"
                    :title="wizardStore.isRationaleExpanded ? '收合分析' : '展開分析'"
                  >
                    <ChevronUp v-if="wizardStore.isRationaleExpanded" class="w-4 h-4" />
                    <ChevronDown v-else class="w-4 h-4" />
                  </button>
                  <div class="flex items-center gap-2">
                    <Sparkles class="w-4 h-4 text-blue-600" />
                    <span class="text-xs sm:text-sm font-bold text-blue-950">
                      AI 合規全貌分析與邊界診斷 (AI Scoping Rationale)
                    </span>
                  </div>
                </div>

                <div class="text-[11px] text-blue-800 font-semibold">
                  依據關注地區 ({{ wizardStore.selectedMarkets.join(', ') || 'Global' }}) 智慧合成
                </div>
              </div>

              <!-- 4 Paragraphs of Analysis -->
              <div
                v-if="wizardStore.isRationaleExpanded"
                class="p-4 space-y-3 text-xs leading-relaxed text-slate-700 animate-in fade-in duration-200"
              >
                <div class="p-2.5 bg-white/80 rounded-lg border border-blue-100 space-y-1">
                  <div class="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <Building2 class="w-3.5 h-3.5 text-blue-600" />
                    <span>1. 核心業務實體定位 (Core Entity Positioning)</span>
                  </div>
                  <p>{{ wizardStore.aiRationale.coreEntity }}</p>
                </div>

                <div class="p-2.5 bg-white/80 rounded-lg border border-blue-100 space-y-1">
                  <div class="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck class="w-3.5 h-3.5 text-blue-600" />
                    <span>2. 重點監管邊界與通報標準 (Core Regulatory Perimeter)</span>
                  </div>
                  <p>{{ wizardStore.aiRationale.coreBoundary }}</p>
                </div>

                <div class="p-2.5 bg-white/80 rounded-lg border border-blue-100 space-y-1">
                  <div class="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <Globe class="w-3.5 h-3.5 text-blue-600" />
                    <span>3. 跨法域監管聯動與協作 (Jurisdictional Interplay)</span>
                  </div>
                  <p>{{ wizardStore.aiRationale.jurisdictionInterplay }}</p>
                </div>

                <div class="p-2.5 bg-white/80 rounded-lg border border-blue-100 space-y-1">
                  <div class="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Star class="w-3.5 h-3.5 text-amber-600" />
                    <span>4. 潛在合規盲點與防範建議 (Supervisory Blindspots & Advisory)</span>
                  </div>
                  <p>{{ wizardStore.aiRationale.blindspots }}</p>
                </div>
              </div>
            </div>

            <!-- 3. 其他可選機構與搜尋瀏覽 (Other Available Authorities) -->
            <div class="space-y-3 pt-2">
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <!-- Search input -->
                <div class="relative flex-1">
                  <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    v-model="wizardStore.searchQuery"
                    type="text"
                    placeholder="搜尋機構名稱、縮寫、法域或類別 (例如 HKMA, SEC, MAS, DORA)..."
                    class="w-full pl-8 pr-7 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                  <button
                    v-if="wizardStore.searchQuery"
                    @click="wizardStore.searchQuery = ''"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs cursor-pointer"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Jurisdiction Filter Tabs -->
                <div class="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
                  <button
                    v-for="tab in dynamicJurisdictionTabs"
                    :key="tab"
                    type="button"
                    @click="wizardStore.selectedJurisdictionFilter = tab"
                    :class="`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      wizardStore.selectedJurisdictionFilter === tab
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`"
                  >
                    {{ tab }}
                  </button>
                </div>
              </div>

              <!-- Other Available Regulators Section -->
              <div class="space-y-2 pt-1 border-t border-neutral-100">
                <div class="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <div class="flex items-center gap-1.5">
                    <SlidersHorizontal class="w-3.5 h-3.5 text-neutral-500" />
                    <span>其他可選監管機構 (Other Available Authorities &bull; {{ otherAvailableRegulators.length }})</span>
                  </div>
                  <span class="text-[11px] font-normal text-neutral-400">
                    點擊任何卡片即可添加至您的關注範圍
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <div
                    v-for="reg in otherAvailableRegulators"
                    :key="reg.id"
                    @click="wizardStore.toggleFollowRegulator(reg.id)"
                    :class="`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                      wizardStore.followedRegulatorIds.includes(reg.id)
                        ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-2xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60 shadow-2xs text-neutral-700'
                    }`"
                  >
                    <div>
                      <div class="flex items-start justify-between gap-1.5">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-xl shrink-0">{{ reg.flag }}</span>
                          <div class="min-w-0">
                            <div class="flex items-center gap-1">
                              <span class="font-bold text-xs text-neutral-900">{{ reg.acronym }}</span>
                              <span class="text-[9px] px-1 py-0.2 rounded bg-neutral-100 text-neutral-600">
                                {{ reg.jurisdiction }}
                              </span>
                            </div>
                            <p class="text-[10px] text-neutral-500 truncate">{{ reg.name }}</p>
                          </div>
                        </div>

                        <!-- Follow badge / button -->
                        <span
                          :class="`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 shrink-0 ${
                            wizardStore.followedRegulatorIds.includes(reg.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-neutral-100 hover:bg-blue-50 text-neutral-600 hover:text-blue-700 border border-neutral-200'
                          }`"
                        >
                          <Check v-if="wizardStore.followedRegulatorIds.includes(reg.id)" class="w-2.5 h-2.5 stroke-[3]" />
                          <Plus v-else class="w-2.5 h-2.5" />
                          <span>{{ wizardStore.followedRegulatorIds.includes(reg.id) ? '已關注' : '關注' }}</span>
                        </span>
                      </div>

                      <p class="text-[11px] text-neutral-500 line-clamp-2 leading-tight mt-1.5">
                        {{ reg.reason }}
                      </p>
                    </div>

                    <div class="flex items-center justify-between text-[9px] text-neutral-400 pt-1 border-t border-neutral-100">
                      <span class="truncate">{{ reg.category }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Controls -->
        <div class="pt-3 border-t border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <button
              v-if="wizardStore.currentStep === 1"
              type="button"
              @click="handleClose"
              class="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer px-2 py-1.5"
            >
              稍後設定 / 在後台運行
            </button>
            <button
              v-else
              type="button"
              @click="wizardStore.currentStep = 1"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft class="w-3.5 h-3.5" />
              <span>&larr; 返回修改業務與地區 (Back to Step 1)</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="wizardStore.currentStep === 1"
              type="button"
              id="btn-next-step"
              @click="handleConfirmStep1AndGenerate"
              :disabled="localSelectedMarkets.length === 0 || wizardStore.isAnalyzing"
              class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Loader2 v-if="wizardStore.isAnalyzing" class="w-3.5 h-3.5 animate-spin" />
              <Sparkles v-else class="w-3.5 h-3.5" />
              <span>下一步：生成高關聯推薦機構 ➔</span>
            </button>

            <button
              v-else
              type="button"
              id="btn-apply-watchlist-finish"
              @click="handleFinishWizard"
              class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>套用關注清單並進入系統 (Apply to Watchlist & Complete)</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
