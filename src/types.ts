export type RelevanceLevel =
  | 'Direct / Highly Relevant'
  | 'Relevant'
  | 'Partially Relevant'
  | 'Low'
  | 'Critical'
  | 'High'
  | 'Medium';

export type MaterialityLevel = RelevanceLevel;

export function normalizeRelevance(level?: string): 'Direct / Highly Relevant' | 'Relevant' | 'Partially Relevant' | 'Low' {
  if (!level) return 'Relevant';
  if (level === 'Critical' || level === 'Direct / Highly Relevant') return 'Direct / Highly Relevant';
  if (level === 'High' || level === 'Relevant') return 'Relevant';
  if (level === 'Medium' || level === 'Partially Relevant') return 'Partially Relevant';
  return 'Low';
}
export type MonitorStatus = 'Not Imported' | 'Imported' | 'In Progress' | 'Not Monitored' | 'Monitored' | 'None';
export type DiligenceStatus = MonitorStatus;
export type MonitoringCadence = 'Daily' | 'Weekly' | 'Monthly';
export type HealthStatus = 'Healthy' | 'Degraded' | 'Failed';
export type DocumentType =
  | 'Circular'
  | 'Guideline'
  | 'Rulebook'
  | 'Consultation Paper'
  | 'Policy'
  | 'Standard'
  | 'Enforcement'
  | 'Primary Legislation';

export const REGULATORY_THEMES = [
  'AML/CFT and sanctions',
  'Conduct and consumer protection',
  'Data protection and cybersecurity',
  'Outsourcing and third-party risk',
  'ESG and sustainability disclosure',
  'Prudential and capital requirements',
  'Market conduct and listing rules',
  'AI governance and model risk',
  'Operational resilience and incident reporting'
] as const;

export type RegulatoryTheme = typeof REGULATORY_THEMES[number];

/**
 * Standardized Comprehensive Jurisdictions matching Interactive Setup Wizard
 */
export const ALL_JURISDICTIONS = [
  'Hong Kong',
  'Singapore',
  'China',
  'Japan',
  'South Korea',
  'Australia',
  'New Zealand',
  'India',
  'Indonesia',
  'Malaysia',
  'Vietnam',
  'Philippines',
  'Thailand',
  'United Kingdom',
  'European Union',
  'Germany',
  'France',
  'Switzerland',
  'Netherlands',
  'Ireland',
  'Italy',
  'Spain',
  'Sweden',
  'Austria',
  'Belgium',
  'United States',
  'Canada',
  'Mexico',
  'United Arab Emirates',
  'Saudi Arabia',
  'Israel',
  'Brazil',
  'South Africa',
  'International',
  'Global/Offshore'
] as const;

export type JurisdictionName = typeof ALL_JURISDICTIONS[number];

/**
 * Standardized 5 Sector Groups
 * Derived from the official global_source_registry taxonomy
 */
export const SECTOR_GROUPS = [
  'Corporate Governance & CoSec',
  'Financial Services & Capital Markets',
  'Compliance, Risk & Enforcement',
  'Legal & Judicial',
  'Commerce, Safety & Public Administration'
] as const;

export type SectorGroup = typeof SECTOR_GROUPS[number];

// Standardized Category alias mapped directly to the 5 Sector Groups for single source of truth
export type RegulatoryCategory = SectorGroup;
export const REGULATORY_CATEGORIES: RegulatoryCategory[] = [...SECTOR_GROUPS];

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  avatarInitials: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  rationale?: string;
  previousValue?: string;
  newValue?: string;
}

export interface OverrideRecord {
  timestamp: string;
  user: string;
  field: 'materiality' | 'relevance';
  previousTier: string;
  newTier: string;
  justification: string;
}

export interface PriorityAlert {
  id: string;
  title: string;
  regulator: string;
  regulatorAcronym: string;
  jurisdiction: string;
  category?: RegulatoryCategory;
  themes?: string[];
  materiality: MaterialityLevel;
  aiRelevanceSummary: string;
  publishDate: string;
  effectiveDate: string;
  slaDeadline: string;
  isOverdueSLA: boolean;
  status: 'pending' | 'acknowledged' | 'dismissed' | 'imported';
  assignedTo?: string;
  regulationId: string;
  actionDate?: string;
  actionDetails?: string;
  isBackfillAlert?: boolean;
  isAcknowledged?: boolean;
  linkedTaskIds?: string[];
}

export interface RegulationItem {
  id: string;
  title: string;
  referenceNumber: string;
  docType: DocumentType;
  regulator: string;
  regulatorAcronym: string;
  jurisdiction: string;
  category?: RegulatoryCategory;
  themes: string[];
  publishDate: string;
  effectiveDate: string;
  aiRelevanceScore: number; // 0 - 100
  materiality: MaterialityLevel;
  diligenceStatus: DiligenceStatus;
  owner: string;
  officialUrl: string;
  executiveSummary: string;
  operationalImpact: string;
  affectedBusinessUnits: string[];
  authenticExcerpt: string;
  auditTimeline: AuditEntry[];
  overrides?: OverrideRecord[];
  whyRelevantExplanation?: string;
  isExceedingSLA?: boolean;
  isHistoricalImport?: boolean;
  isAcknowledged?: boolean;
  linkedTaskIds?: string[];
}

export type RegulatoryDirectoryStatus = 'Following' | 'None';

export interface RegulatoryDirectoryItem extends RegulationItem {
  status: RegulatoryDirectoryStatus;
  whyRelevantExplanation?: string;
  aiRelevanceTier?: 'High' | 'Med' | 'Low';
}

export interface DiligenceProject {
  id: string;
  name: string;
  code: string;
  lead: string;
  type: string;
  regulationsCount: number;
  status: 'Active' | 'Under Review' | 'Draft';
}

export interface DirectoryFilterState {
  datePreset: '30D' | 'All' | '6M' | '1Y' | 'Custom';
  startDate: string; // 'DD/MM/YYYY' or ISO
  endDate: string;   // 'DD/MM/YYYY' or ISO
  dateType?: 'publishDate' | 'effectiveDate';
  jurisdiction: string;
  theme: string;
  category: string;
  selectedJurisdictions?: string[];
  selectedThemes?: string[];
  selectedCategories?: string[];
  selectedLinkages?: string[];
  regulatorCandidates: string[];
  keywordCandidates: string[];
  keywordMode: 'OR' | 'AND';
}

export interface RegulatorSubScope {
  id: string;
  name: string;
  code: string;
  description: string;
  isFollowed: boolean;
  cadence: MonitoringCadence;
  themes: string[];
  openAlertsCount: number;
}

export interface RegulatorInScope {
  id: string;
  name: string;
  acronym: string;
  jurisdiction: string;
  category: RegulatoryCategory;
  isFollowed: boolean;
  cadence: MonitoringCadence;
  themes: string[];
  lastChecked: string;
  latestPublication: string;
  health: HealthStatus;
  openAlertsCount: number;
  owner: string;
  officialEndpoint: string;
  endpointLatencyMs?: number;
  subScopes?: RegulatorSubScope[];
  linkedTaskIds?: string[];
}

export interface FrameworkCardData {
  id: string;
  title: string;
  version?: string;
  authority?: string;
  completionPct: number;
  tagType: 'Operational' | 'Reporting' | 'Governance';
  reviewsCount?: number;
  suggestionsCount?: number;
  latestReviewName?: string;
  pendingReview?: {
    requirements: number;
    categories: number;
    fileName: string;
    pages: number;
  };
  outstandingItems: number;
  fulfillmentRate: number;
  lastModified: string;
  associatedRegulationRef?: string;
}

export interface CitationPin {
  pinId: string;
  label: string; // e.g., "HKMA §3.1", "MAS Notice 655"
  evidenceCardId: string;
  targetClause: string;
}

export interface EvidenceCardData {
  id: string;
  pinCode: string;
  regulator: string;
  jurisdiction: string;
  docType: DocumentType;
  docTitle: string;
  publishDate: string;
  effectiveDate: string;
  sourceUrl: string;
  sha256Hash: string;
  isVerified: boolean;
  excerptClause: string;
  fullExcerpt: string;
  relevanceExplanation: string;
  ambiguityWarning?: string;
}

export interface SubQueryItem {
  id: string;
  label: string; // e.g., "Q1", "Q2"
  question: string;
  summary: string;
  detailedHeading?: string;
  points?: string[];
  citationPins?: CitationPin[];
}

export interface CopilotSession {
  id: string;
  query: string;
  timestamp: string;
  executiveSummary: string;
  detailedFindings: {
    heading: string;
    points: string[];
    citationPins: CitationPin[];
    subQueryId?: string;
  }[];
  comparativeAnalysis: {
    jurisdictionA: string;
    jurisdictionB: string;
    divergencePoint: string;
    impactLevel: 'High' | 'Medium' | 'Low';
    citations: string[];
  }[];
  ambiguityWarning?: string;
  evidenceCardIds: string[];
  status: 'ready' | 'streamed';
  subQueries?: SubQueryItem[];
  isSaved?: boolean;
  savedDate?: string;
}

export interface CustomSourceRegistration {
  id: string;
  url: string;
  sourceType: 'Official Gazette' | 'Circulars RSS' | 'Press Releases' | 'Consultation Portal';
  regulator: string;
  jurisdiction: string;
  category?: RegulatoryCategory;
  themes?: string[];
  priority: 'High' | 'Standard';
  status: 'Verified & Reachable' | 'Unreachable / Blocked' | 'Testing...';
  lastChecked: string;
  isFollowed?: boolean;
  createdBy?: string;
  approver?: string | null;
  createdDate: string;
}

export interface CoverageGapDiagnostic {
  hasGaps: boolean;
  exceedingSlaCount: number;
  brokenEndpointsCount: number;
  summaryText: string;
  endpointDetails: string;
}
export type CoverageBannerData = CoverageGapDiagnostic;

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  message?: string;
}

// ==========================================
// Matrix Research Workspace & Dual-Pane Types (v2.0)
// ==========================================

export type MatrixComplianceStatus = 'compliant' | 'conditional' | 'prohibited' | 'inconclusive';

export type BackfillTimespan = 'none' | '30d' | '90d' | '1y' | 'full' | '';

export interface MatrixComplianceStatusInfo {
  status: MatrixComplianceStatus;
  label: string;
}

export interface MatrixQuestionItem {
  questionId: string;
  questionText: string;
  crossCountrySummary: string; // Bound to question; static across jurisdictions
  followUps?: MatrixFollowUpItem[];
}

export interface MatrixJurisdictionItem {
  code: string; // e.g. 'HK', 'SG', 'UK', 'US'
  name: string; // e.g. 'Hong Kong', 'Singapore'
  regulatorAcronym: string; // e.g. 'HKMA / CR', 'MAS'
  complianceStatus: MatrixComplianceStatus;
}

export interface MatrixCitationItem {
  citationId: string;
  sourceTitle: string;
  authority: string; // e.g. 'HKMA', 'MAS'
  regulatorAcronym: string;
  effectiveDate: string;
  sourceUrl: string;
  excerpt: string;
  highlightedTerms?: string[];
  sha256: string;
  relevanceScore: number;
  relevanceTag?: string; // e.g. 'Mandatory Statutory Condition'
}

export interface MatrixFollowUpItem {
  id: string;
  index: number;
  timestamp: string; // e.g. "11:39:18 AM"
  jurisdictionName?: string; // e.g. "Hong Kong"
  jurisdictionCode?: string; // e.g. "HK"
  questionNumber?: number;
  queryText: string;
  findingText: string;
  isStreaming?: boolean;
}

export interface MatrixCellData {
  answerMarkdown: string;
  complianceStatus: MatrixComplianceStatus;
  statusBadgeLabel: string;
  verifiedCitations: MatrixCitationItem[];
  keyTakeaways?: string[];
  followUps?: MatrixFollowUpItem[];
}

export interface MatrixSessionState {
  sessionId: string;
  sessionTitle: string;
  activeQuestionIndex: number; // Dimension 1 controller (0 ~ N-1)
  activeJurisdictionCode: string; // Dimension 2 controller ('HK' | 'SG' | 'UK' ...)
  questions: MatrixQuestionItem[];
  jurisdictions: MatrixJurisdictionItem[];
  matrixCells: {
    // Key format: `${questionId}_${jurisdictionCode}`
    [key: string]: MatrixCellData;
  };
  isLoading: boolean;
  createdAt: string;
  updatedAt: string;
  creator: string;
  isSaved?: boolean;
  pinnedRegulation?: {
    regulationTitle: string;
    referenceNumber: string;
    version?: string;
    effectiveDate?: string;
    authority: string;
  };
}

export interface JurisdictionPreset {
  id: string;
  name: string;
  description?: string;
  jurisdictionCodes: string[];
}

export type BackfillConfig = {
  regulatorId: string;
  regulatorName: string;
  acronym: string;
  timespan?: BackfillTimespan;
  criticalHighOnly: boolean;
  routingOption: 'direct_to_regulations' | 'route_to_triage';
};

// ==========================================
// Global Source Registry Standard Taxonomies
// ==========================================

export const SOURCE_CATEGORIES = [
  // Statutory Rules & Repositories
  'legislation_rules_codes',
  'guidelines_notices_consultations_repository',
  'rules_guidelines_regulatory_repository',
  // Registers & Licensing
  'licensing_register_filing',
  'company_registry',
  'business_registry_financial_reporting_regulator',
  // Enforcement & Judgments
  'enforcement_decisions_discipline',
  'court_judgments_database',
  'insolvency_bankruptcy_authority',
  // Official Institutional Portals
  'official_institutional_website',
  'banking_prudential_regulator',
  'securities_regulator',
  'data_protection_authority',
  // Professional Governance & Secretariat
  'company_secretary_official_source',
  'professional_body_official',
  'company_secretary_professional_support'
] as const;

export type SourceCategory = typeof SOURCE_CATEGORIES[number];

export interface SourceQualityTelemetry {
  lastCheckedTimestamp?: string;
  httpStatus?: number;
  latencyMs?: number;
  connectionHealth: HealthStatus;
  dataIntegrityPassed?: boolean;
  validationError?: string;
}

export type { ComplianceTask, TaskQuestion, RetrievedUrlItem, CitationItem } from './stores/taskStore';


