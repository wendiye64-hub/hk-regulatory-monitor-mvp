/**
 * Backend Ingestion Types & Adapters
 * Directly maps raw JSON outputs from the Hong Kong Regulatory Crawler / Monitor Engine
 */

import type {
  RegulatorInScope,
  RegulatorSubScope,
  RegulationItem,
  PriorityAlert,
  SectorGroup,
  MaterialityLevel,
  DocumentType,
  HealthStatus,
} from '@/types';

// =========================================================================
// 1. Raw Backend Contracts (Zero Modification on Backend Side)
// =========================================================================

export interface RawBackendSourceCatalogItem {
  source_id: string;
  authority: string;
  authority_type: string;
  sector: string;
  source_category: string;
  source_system: string;
  url: string;
  access_pattern: string;
  activation_state: string; // e.g. "profile_required" | "active_verified"
  onboarding_route: string;
  alert_eligible: boolean;
}

export interface RawBackendSourceCatalogResponse {
  catalog_id?: string;
  generated_at?: string;
  scope?: string;
  summary?: {
    candidates: number;
    active_verified: number;
    profile_required: number;
    by_authority?: [string, number][];
  };
  safety_rule?: string;
  sources: RawBackendSourceCatalogItem[];
}

export interface RawBackendMonitorFeedItem {
  publication_date: string;
  official_url: string;
  title: string;
  source_id: string;
  source_label: string;
  detection: string;
  regulatory_domain: string;
  change_type: string;
  impact_status: string; // "potential_impact" | "review_required" | "no_clear_impact"
  summary: string;
  evidence: string[];
  human_review_required?: boolean;
}

export interface RawBackendMonitorFeedResponse {
  generated_at?: string;
  monitor_request?: string;
  sources_checked?: number;
  source_runs?: {
    source_id: string;
    label: string;
    status: string;
    duration_ms?: number;
    count?: number;
    error?: string;
  }[];
  items: RawBackendMonitorFeedItem[];
}

// =========================================================================
// 2. Normalization Dictionaries & Mappings
// =========================================================================

/**
 * Authority Full Name -> Standard Acronym
 */
export const AUTHORITY_ACRONYM_MAP: Record<string, string> = {
  'Hong Kong Monetary Authority': 'HKMA',
  'Securities and Futures Commission': 'SFC',
  'Companies Registry': 'CR',
  'Hong Kong Exchanges and Clearing': 'HKEX',
  'Insurance Authority': 'IA',
  'Customs and Excise Department': 'C&ED',
  'Independent Commission Against Corruption': 'ICAC',
  'The Government of the Hong Kong Special Administrative Region Gazette': 'GLD',
  'Labour Department': 'LD',
  'The Law Society of Hong Kong': 'HKLS',
  'Office of the Communications Authority': 'OFCA',
  'Equal Opportunities Commission': 'EOC',
  'Fire Services Department': 'FSD',
  'Food and Environmental Hygiene Department': 'FEHD',
  'Drug Office, Department of Health': 'DH',
  'Hong Kong Institute of Certified Public Accountants': 'HKICPA',
  'Hong Kong Bar Association': 'HKBA',
};

/**
 * Backend raw sector string -> Standard 5 Sector Groups
 */
export function normalizeSectorToGroup(rawSector: string): SectorGroup {
  if (!rawSector) return 'Financial Services & Capital Markets';
  const s = rawSector.toLowerCase();

  if (s.includes('company') || s.includes('beneficial') || s.includes('corporate') || s.includes('cosech')) {
    return 'Corporate Governance & CoSec';
  }
  if (
    s.includes('banking') ||
    s.includes('securities') ||
    s.includes('futures') ||
    s.includes('financial') ||
    s.includes('insurance') ||
    s.includes('capital')
  ) {
    return 'Financial Services & Capital Markets';
  }
  if (
    s.includes('trade') ||
    s.includes('customs') ||
    s.includes('enforcement') ||
    s.includes('anti-corruption') ||
    s.includes('integrity') ||
    s.includes('aml') ||
    s.includes('sanction')
  ) {
    return 'Compliance, Risk & Enforcement';
  }
  if (s.includes('legal') || s.includes('bar') || s.includes('judicial') || s.includes('court') || s.includes('ordinance')) {
    return 'Legal & Judicial';
  }
  // Employment, safety, public hygiene, telecom, etc.
  return 'Commerce, Safety & Public Administration';
}

/**
 * Backend change_type -> DocumentType
 */
export function mapChangeTypeToDocType(changeType: string): DocumentType {
  const ct = (changeType || '').toLowerCase();
  if (ct.includes('consultation')) return 'Consultation Paper';
  if (ct.includes('guideline') || ct.includes('guide')) return 'Guideline';
  if (ct.includes('rule') || ct.includes('code')) return 'Rulebook';
  if (ct.includes('enforcement') || ct.includes('disciplinary')) return 'Enforcement';
  if (ct.includes('policy')) return 'Policy';
  if (ct.includes('standard')) return 'Standard';
  if (ct.includes('ordinance') || ct.includes('legislation')) return 'Primary Legislation';
  return 'Circular';
}

/**
 * Backend impact_status -> RelevanceLevel (formerly Materiality)
 * Direct / Highly Relevant, Relevant, Partially Relevant
 */
export function mapImpactStatusToMateriality(impactStatus: string, title: string): MaterialityLevel {
  const is = (impactStatus || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (is === 'potential_impact' || t.includes('disciplinary') || t.includes('enforcement')) {
    return 'Direct / Highly Relevant';
  }
  if (t.includes('consultation') || is.includes('review') || is === 'review_required') {
    return 'Relevant';
  }
  if (is === 'no_clear_impact') {
    return 'Partially Relevant';
  }
  return 'Relevant';
}

// =========================================================================
// 3. Ingestion Adapter: Catalog -> Regulators In Scope (with SubScopes)
// =========================================================================

/**
 * Transforms raw backend source catalog (135 endpoints) into aggregated Regulators in Scope.
 */
export function adaptBackendCatalogToRegulators(
  catalog: RawBackendSourceCatalogResponse | RawBackendSourceCatalogItem[]
): RegulatorInScope[] {
  const sources: RawBackendSourceCatalogItem[] = Array.isArray(catalog)
    ? catalog
    : catalog.sources || [];

  if (!sources || sources.length === 0) return [];

  // Group by Authority Full Name
  const authorityGroups = new Map<string, RawBackendSourceCatalogItem[]>();

  for (const src of sources) {
    const authName = src.authority ? src.authority.trim() : 'Unknown Authority';
    if (!authorityGroups.has(authName)) {
      authorityGroups.set(authName, []);
    }
    authorityGroups.get(authName)!.push(src);
  }

  const result: RegulatorInScope[] = [];

  authorityGroups.forEach((srcList, authName) => {
    const primary = srcList[0];
    const acronym = AUTHORITY_ACRONYM_MAP[authName] || authName.slice(0, 4).toUpperCase();
    const id = `reg-${acronym.toLowerCase()}`;
    const category = normalizeSectorToGroup(primary.sector);

    // Any active verified source implies healthy; otherwise degraded/profiling
    const hasActive = srcList.some((s) => s.activation_state === 'active_verified');
    const health: HealthStatus = hasActive ? 'Healthy' : 'Degraded';

    // Map sub-sources into subScopes
    const subScopes: RegulatorSubScope[] = srcList.map((s, idx) => ({
      id: `${id}-sub-${idx + 1}`,
      name: s.source_system || s.source_category || `Endpoint ${idx + 1}`,
      code: s.source_id,
      description: `URL: ${s.url} (${s.access_pattern}, ${s.activation_state})`,
      isFollowed: s.alert_eligible || false,
      cadence: 'Daily',
      themes: [s.source_category, s.access_pattern],
      openAlertsCount: s.alert_eligible ? 1 : 0,
    }));

    result.push({
      id,
      name: authName,
      acronym,
      jurisdiction: 'Hong Kong',
      category,
      isFollowed: srcList.some((source) => source.alert_eligible),
      cadence: 'Daily',
      themes: Array.from(new Set(srcList.map((s) => s.source_category))).slice(0, 4),
      lastChecked: 'Active sync (dynamic crawler stream)',
      latestPublication: `${srcList.length} monitored official endpoint(s) mapped`,
      health,
      openAlertsCount: srcList.filter((s) => s.alert_eligible).length,
      owner: 'Ivan Choy (Lead)',
      officialEndpoint: primary.url,
      endpointLatencyMs: hasActive ? 220 : 410,
      subScopes,
    });
  });

  return result;
}

// =========================================================================
// 4. Ingestion Adapter: Monitor Feed Items -> PriorityAlerts & Regulations
// =========================================================================

export interface IngestedMonitorFeedResult {
  alerts: PriorityAlert[];
  regulations: RegulationItem[];
}

/**
 * Transforms raw backend monitor feed items into prioritized alerts and in-scope regulations.
 */
export function adaptBackendMonitorFeed(
  feed: RawBackendMonitorFeedResponse | RawBackendMonitorFeedItem[]
): IngestedMonitorFeedResult {
  const items: RawBackendMonitorFeedItem[] = Array.isArray(feed)
    ? feed
    : feed.items || [];

  const alerts: PriorityAlert[] = [];
  const regulations: RegulationItem[] = [];

  items.forEach((item, index) => {
    const regId = `reg-hk-${item.source_id.toLowerCase()}-${index + 1}`;
    const alertId = `alt-hk-${item.source_id.toLowerCase()}-${index + 1}`;

    // Determine Authority and Acronym
    let authName = 'Hong Kong Regulatory Authority';
    let acronym = 'HK';
    if (item.source_label.includes('HKEX')) {
      authName = 'Hong Kong Exchanges and Clearing';
      acronym = 'HKEX';
    } else if (item.source_label.includes('HKMA')) {
      authName = 'Hong Kong Monetary Authority';
      acronym = 'HKMA';
    } else if (item.source_label.includes('SFC')) {
      authName = 'Securities and Futures Commission';
      acronym = 'SFC';
    } else {
      authName = item.source_label.replace(/Press Releases|Announcements|Regulatory/gi, '').trim() || authName;
      acronym = AUTHORITY_ACRONYM_MAP[authName] || 'HK';
    }

    const materiality = mapImpactStatusToMateriality(item.impact_status, item.title);
    const docType = mapChangeTypeToDocType(item.change_type);
    const category = normalizeSectorToGroup(item.regulatory_domain);
    const authenticExcerpt = Array.isArray(item.evidence) && item.evidence.length > 0
      ? item.evidence.join('\n\n')
      : item.summary;

    const isPendingAlert = item.human_review_required !== false && item.impact_status !== 'no_clear_impact';

    // 1. Create Regulation Item
    const reg: RegulationItem = {
      id: regId,
      title: item.title,
      referenceNumber: `${acronym}-${item.publication_date.replace(/-/g, '')}-${index + 1}`,
      docType,
      regulator: authName,
      regulatorAcronym: acronym,
      jurisdiction: 'Hong Kong',
      category,
      themes: [item.regulatory_domain, item.change_type],
      publishDate: item.publication_date,
      effectiveDate: item.publication_date,
      aiRelevanceScore:
        materiality === 'Direct / Highly Relevant' ? 95 : materiality === 'Relevant' ? 85 : 70,
      materiality,
      diligenceStatus: isPendingAlert ? 'Not Imported' : 'Monitored',
      owner: 'Ivan Choy (Lead)',
      officialUrl: item.official_url,
      executiveSummary: item.summary,
      operationalImpact:
        item.impact_status === 'potential_impact'
          ? 'Requires comprehensive impact assessment on existing compliance controls and transaction disclosures.'
          : 'Supervisory informational release; routine monitoring and team notification.',
      affectedBusinessUnits: ['Compliance', 'Legal', 'Risk Management'],
      authenticExcerpt,
      auditTimeline: [
        {
          id: `audit-${Date.now()}-${index}`,
          timestamp: `${item.publication_date} 09:00:00 UTC`,
          action: 'Detected via Official Regulatory Crawler Engine',
          performedBy: 'System Ingestion Agent',
          details: `Source: ${item.source_label} (${item.official_url}) with detection mode: ${item.detection}.`,
        },
      ],
      whyRelevantExplanation: `Automated detection tagged with regulatory domain: ${item.regulatory_domain} (${item.change_type}).`,
    };
    regulations.push(reg);

    // 2. Create Priority Alert if review required or potential impact
    if (isPendingAlert) {
      alerts.push({
        id: alertId,
        title: item.title,
        regulator: authName,
        regulatorAcronym: acronym,
        jurisdiction: 'Hong Kong',
        category,
        themes: [item.regulatory_domain, item.change_type],
        materiality,
        aiRelevanceSummary: item.summary,
        publishDate: item.publication_date,
        effectiveDate: item.publication_date,
        slaDeadline: '48h from detection',
        isOverdueSLA: false,
        status: 'pending',
        regulationId: regId,
      });
    }
  });

  return { alerts, regulations };
}
