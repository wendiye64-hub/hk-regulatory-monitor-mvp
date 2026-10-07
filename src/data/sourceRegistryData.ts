import type {
  RegulatorInScope,
  HealthStatus,
  SectorGroup,
  SourceCategory,
} from '@/types';

/**
 * Standard Raw Record Interface conforming directly to global_source_registry (13 Columns)
 * Example from Registry:
 * Source ID: DEDUP-00001
 * Jurisdiction: Hong Kong
 * Authority Name: Hong Kong Monetary Authority
 * Authority Type: regulator
 * Authority Abbreviation: HKMA
 * Sector: Banking and Financial Stability (Sector Group: Financial Services & Capital Markets)
 * Source Category: banking_prudential_regulator
 * Source System: Registry / Searchable Database
 * URL: https://www.hkma.gov.hk/eng/regulatory-resources/registers/
 * URL Host: www.hkma.gov.hk
 * Access Pattern: search_listing
 * Quality Status: usable_source
 * Summary: Official source from Hong Kong Monetary Authority covering banking and financial stability...
 */
export interface GlobalSourceRegistryRecord {
  'Source ID': string;
  'Jurisdiction': string;
  'Authority Name': string;
  'Authority Type': string;
  'Authority Abbreviation': string;
  'Sector': string;
  'Source Category': SourceCategory | string;
  'Source System': string;
  'URL': string;
  'URL Host': string;
  'Access Pattern': string;
  'Quality Status': string;
  'Summary': string;
  // Dynamic Ingestion Telemetry
  endpointLatencyMs?: number;
  openAlertsCount?: number;
}

export const GLOBAL_SOURCE_REGISTRY_MOCK: GlobalSourceRegistryRecord[] = [
  {
    'Source ID': 'DEDUP-00001',
    'Jurisdiction': 'Hong Kong',
    'Authority Name': 'Hong Kong Monetary Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'HKMA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Registry / Searchable Database',
    'URL': 'https://www.hkma.gov.hk/eng/regulatory-resources/registers/',
    'URL Host': 'www.hkma.gov.hk',
    'Access Pattern': 'search_listing',
    'Quality Status': 'usable_source',
    'Summary': 'Official source from Hong Kong Monetary Authority covering banking and financial stability in Hong Kong, provided through registry and searchable database with search listing access and classified as banking prudential regulator.',
    endpointLatencyMs: 142,
    openAlertsCount: 3,
  },
  {
    'Source ID': 'DEDUP-00002',
    'Jurisdiction': 'Hong Kong',
    'Authority Name': 'Securities and Futures Commission',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'SFC',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'securities_regulator',
    'Source System': 'Official Regulatory Repository',
    'URL': 'https://www.sfc.hk/en/regulatory-functions/rules-and-standards',
    'URL Host': 'www.sfc.hk',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Statutory securities and futures market regulator safeguarding market integrity, virtual asset trading platform (VATP) licensing, and takeover codes in Hong Kong.',
    endpointLatencyMs: 185,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00003',
    'Jurisdiction': 'Hong Kong',
    'Authority Name': 'Companies Registry',
    'Authority Type': 'company_registry',
    'Authority Abbreviation': 'CRHK',
    'Sector': 'Corporate Governance & CoSec',
    'Source Category': 'company_registry',
    'Source System': 'Statutory Register',
    'URL': 'https://www.cr.gov.hk/en/legislation/companies-ordinance.htm',
    'URL Host': 'www.cr.gov.hk',
    'Access Pattern': 'search_listing',
    'Quality Status': 'usable_source',
    'Summary': 'Administers the Companies Ordinance, incorporation filing obligations, Significant Controllers Register (SCR), and corporate secretarial governance in Hong Kong.',
    endpointLatencyMs: 210,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00004',
    'Jurisdiction': 'Hong Kong',
    'Authority Name': 'Hong Kong Institute of Chartered Secretaries (HKCGI)',
    'Authority Type': 'professional_body',
    'Authority Abbreviation': 'HKCGI',
    'Sector': 'Corporate Governance & CoSec',
    'Source Category': 'company_secretary_official_source',
    'Source System': 'Professional Support & Guidance',
    'URL': 'https://www.hkcgi.org.hk/technical-guidance',
    'URL Host': 'www.hkcgi.org.hk',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Official technical guidelines, corporate governance principles, and best practice notes for Chartered Secretaries and Governance Professionals.',
    endpointLatencyMs: 195,
    openAlertsCount: 0,
  },
  {
    'Source ID': 'DEDUP-00005',
    'Jurisdiction': 'Singapore',
    'Authority Name': 'Monetary Authority of Singapore',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'MAS',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Regulatory Portal & Feeds',
    'URL': 'https://www.mas.gov.sg/regulation',
    'URL Host': 'www.mas.gov.sg',
    'Access Pattern': 'rss_feed',
    'Quality Status': 'usable_source',
    'Summary': 'Integrated central bank and financial regulatory authority supervising banking, capital markets, insurance, payments, and technology risk (Notice 655).',
    endpointLatencyMs: 320,
    openAlertsCount: 4,
  },
  {
    'Source ID': 'DEDUP-00006',
    'Jurisdiction': 'Singapore',
    'Authority Name': 'Accounting and Corporate Regulatory Authority',
    'Authority Type': 'company_registry',
    'Authority Abbreviation': 'ACRA',
    'Sector': 'Corporate Governance & CoSec',
    'Source Category': 'business_registry_financial_reporting_regulator',
    'Source System': 'BizFile / Corporate Portal',
    'URL': 'https://www.acra.gov.sg/legislation',
    'URL Host': 'www.acra.gov.sg',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Regulator of business registration, financial reporting compliance, public accountants, and corporate secretarial service providers in Singapore.',
    endpointLatencyMs: 240,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00007',
    'Jurisdiction': 'United Kingdom',
    'Authority Name': 'Financial Conduct Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'FCA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'securities_regulator',
    'Source System': 'FCA Handbook Portal',
    'URL': 'https://www.handbook.fca.org.uk/',
    'URL Host': 'www.handbook.fca.org.uk',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Conduct regulator for financial markets and firms, enforcing the Consumer Duty, operational resilience, and market integrity in the UK.',
    endpointLatencyMs: 280,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00008',
    'Jurisdiction': 'United Kingdom',
    'Authority Name': 'Companies House UK',
    'Authority Type': 'company_registry',
    'Authority Abbreviation': 'CHUK',
    'Sector': 'Corporate Governance & CoSec',
    'Source Category': 'company_registry',
    'Source System': 'Companies House Public API',
    'URL': 'https://www.gov.uk/government/organisations/companies-house',
    'URL Host': 'www.gov.uk',
    'Access Pattern': 'api',
    'Quality Status': 'usable_source',
    'Summary': 'Registrar of companies in the United Kingdom, enforcing identity verification under the Economic Crime and Corporate Transparency Act (ECCTA).',
    endpointLatencyMs: 160,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00009',
    'Jurisdiction': 'United Kingdom',
    'Authority Name': 'Prudential Regulation Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'PRA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Bank of England Repository',
    'URL': 'https://www.bankofengland.co.uk/prudential-regulation',
    'URL Host': 'www.bankofengland.co.uk',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Prudential regulator responsible for the regulation and supervision of banks, building societies, credit unions, insurers, and major investment firms.',
    endpointLatencyMs: 290,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00010',
    'Jurisdiction': 'United States',
    'Authority Name': 'Securities and Exchange Commission',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'SEC',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'securities_regulator',
    'Source System': 'EDGAR / Official Portal',
    'URL': 'https://www.sec.gov/regulatory-actions',
    'URL Host': 'www.sec.gov',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Primary capital markets regulator enforcing federal securities laws, public company disclosure mandates, and investment adviser fiduciary duties.',
    endpointLatencyMs: 220,
    openAlertsCount: 3,
  },
  {
    'Source ID': 'DEDUP-00011',
    'Jurisdiction': 'United States',
    'Authority Name': 'Federal Reserve Board',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'Fed',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'SR Letters Portal',
    'URL': 'https://www.federalreserve.gov/supervisionreg.htm',
    'URL Host': 'www.federalreserve.gov',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Supervises bank holding companies, payment rails, state member banks, and systemic enterprise risk management in the US financial architecture.',
    endpointLatencyMs: 215,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00012',
    'Jurisdiction': 'European Union',
    'Authority Name': 'European Banking Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'EBA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Official RTS Repository',
    'URL': 'https://www.eba.europa.eu/regulation-and-policy',
    'URL Host': 'www.eba.europa.eu',
    'Access Pattern': 'rss_feed',
    'Quality Status': 'usable_source',
    'Summary': 'Maintains European single rulebook for banking, issuing DORA regulatory technical standards, stress test guidelines, and AML/CFT supervisory mandates.',
    endpointLatencyMs: 310,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00013',
    'Jurisdiction': 'European Union',
    'Authority Name': 'European Securities and Markets Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'ESMA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'securities_regulator',
    'Source System': 'Directives & Q&A Database',
    'URL': 'https://www.esma.europa.eu/databases-library',
    'URL Host': 'www.esma.europa.eu',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Independent EU authority safeguarding stability of the financial system through MiCA, MiFID II, sustainability reporting (CSRD), and market surveillance.',
    endpointLatencyMs: 305,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00014',
    'Jurisdiction': 'Global/Offshore',
    'Authority Name': 'Financial Action Task Force',
    'Authority Type': 'international_body',
    'Authority Abbreviation': 'FATF',
    'Sector': 'Compliance, Risk & Enforcement',
    'Source Category': 'rules_guidelines_regulatory_repository',
    'Source System': 'Publications Library',
    'URL': 'https://www.fatf-gafi.org/en/publications.html',
    'URL Host': 'www.fatf-gafi.org',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Global money laundering and terrorist financing watchdog setting international standards, travel rule benchmarks, and mutual evaluations.',
    endpointLatencyMs: 340,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00015',
    'Jurisdiction': 'Hong Kong',
    'Authority Name': 'Office of the Privacy Commissioner for Personal Data',
    'Authority Type': 'data_protection_authority',
    'Authority Abbreviation': 'PCPD',
    'Sector': 'Commerce, Safety & Public Administration',
    'Source Category': 'data_protection_authority',
    'Source System': 'Enforcement & Guidance Repository',
    'URL': 'https://www.pcpd.org.hk/english/regulatory/regulatory.html',
    'URL Host': 'www.pcpd.org.hk',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Independent statutory body overseeing compliance with Personal Data (Privacy) Ordinance (PDPO), AI governance ethical frameworks, and cross-border data flows.',
    endpointLatencyMs: 190,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00016',
    'Jurisdiction': 'Hong Kong',
    'Authority Name': 'Judiciary of Hong Kong (Legal Judgments)',
    'Authority Type': 'judiciary',
    'Authority Abbreviation': 'HKJUD',
    'Sector': 'Legal & Judicial',
    'Source Category': 'court_judgments_database',
    'Source System': 'Judgments Database',
    'URL': 'https://legalref.judiciary.hk/lrs/common/ju/judgment.jsp',
    'URL Host': 'legalref.judiciary.hk',
    'Access Pattern': 'search_listing',
    'Quality Status': 'usable_source',
    'Summary': 'Official law reports, Court of Final Appeal judgments, Commercial List decisions, and winding-up/insolvency precedents in Hong Kong.',
    endpointLatencyMs: 380,
    openAlertsCount: 0,
  },
  {
    'Source ID': 'DEDUP-00017',
    'Jurisdiction': 'Australia',
    'Authority Name': 'Australian Prudential Regulation Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'APRA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Prudential Standards Portal',
    'URL': 'https://www.apra.gov.au/prudential-standards-and-guidance',
    'URL Host': 'www.apra.gov.au',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Prudential regulator establishing CPS 230 Operational Risk Management, liquidity buffers, and governance standards across banks and insurers in Australia.',
    endpointLatencyMs: 330,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00018',
    'Jurisdiction': 'Germany',
    'Authority Name': 'Federal Financial Supervisory Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'BaFin',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Circulars & Guidance Portal',
    'URL': 'https://www.bafin.de/EN/Aufsicht/BankenFinanzdienstleister/bankenaufsicht_node.html',
    'URL Host': 'www.bafin.de',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Federal regulator supervising banks, financial services, insurers, and securities trading under MaRisk and DORA implementation mandates in Germany.',
    endpointLatencyMs: 360,
    openAlertsCount: 2,
  },
  {
    'Source ID': 'DEDUP-00019',
    'Jurisdiction': 'Switzerland',
    'Authority Name': 'Swiss Financial Market Supervisory Authority',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'FINMA',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'banking_prudential_regulator',
    'Source System': 'Circulars (RS) Portal',
    'URL': 'https://www.finma.ch/en/regulation/circulars/',
    'URL Host': 'www.finma.ch',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Swiss statutory regulatory authority overseeing banks, securities firms, asset managers, and crypto financial market infrastructures.',
    endpointLatencyMs: 350,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00020',
    'Jurisdiction': 'International',
    'Authority Name': 'International Organization for Standardization',
    'Authority Type': 'standards_body',
    'Authority Abbreviation': 'ISO',
    'Sector': 'Commerce, Safety & Public Administration',
    'Source Category': 'standards_and_certification_body',
    'Source System': 'ISO Standards Catalogue',
    'URL': 'https://www.iso.org/standards.html',
    'URL Host': 'www.iso.org',
    'Access Pattern': 'search_listing',
    'Quality Status': 'usable_source',
    'Summary': 'International standard-setting body developing voluntary consensus standards including ISO/IEC 42001 (AIMS) and ISO 27001 cybersecurity frameworks.',
    endpointLatencyMs: 180,
    openAlertsCount: 1,
  },
  {
    'Source ID': 'DEDUP-00021',
    'Jurisdiction': 'Australia',
    'Authority Name': 'Australian Securities and Investments Commission',
    'Authority Type': 'regulator',
    'Authority Abbreviation': 'ASIC',
    'Sector': 'Financial Services & Capital Markets',
    'Source Category': 'securities_regulator',
    'Source System': 'Regulatory Documents Portal',
    'URL': 'https://asic.gov.au/regulatory-resources/',
    'URL Host': 'asic.gov.au',
    'Access Pattern': 'html_scraper',
    'Quality Status': 'usable_source',
    'Summary': 'Australia integrated corporate, markets, financial services and consumer credit regulator supervising financial market integrity and consumer protection.',
    endpointLatencyMs: 310,
    openAlertsCount: 2,
  },
];

// Adapter Interface for Raw Excel / Database Row Ingestion
export interface RawGlobalSourceRow {
  'Source ID'?: string;
  source_id?: string;
  id?: string;
  'Jurisdiction'?: string;
  jurisdiction?: string;
  'Authority Name'?: string;
  authority_name?: string;
  name?: string;
  'Authority Type'?: string;
  authority_type?: string;
  'Authority Abbreviation'?: string;
  authority_abbreviation?: string;
  acronym?: string;
  'Sector'?: string;
  sector?: string;
  'Source Category'?: string;
  source_category?: string;
  'Source System'?: string;
  source_system?: string;
  'URL'?: string;
  url?: string;
  officialEndpoint?: string;
  'URL Host'?: string;
  url_host?: string;
  'Access Pattern'?: string;
  access_pattern?: string;
  'Quality Status'?: string;
  quality_status?: string;
  health?: string;
  endpointLatencyMs?: number;
  latency_ms?: number;
  'Summary'?: string;
  summary?: string;
  description?: string;
  isFollowed?: boolean;
  openAlertsCount?: number;
}

/**
 * Transforms raw Excel/DB rows from global_source_registry into the standard RegulatorInScope type.
 * Located here in data layer to avoid circular dependency with services/api.
 */
export function mapSourceRegistryRowToRegulator(raw: RawGlobalSourceRow): RegulatorInScope {
  const acronym = (
    raw['Authority Abbreviation'] ||
    raw.authority_abbreviation ||
    raw.acronym ||
    (raw['Authority Name'] || raw.name || 'REG').slice(0, 4)
  ).toUpperCase().trim();

  const name =
    raw['Authority Name'] ||
    raw.authority_name ||
    raw.name ||
    acronym;

  const jurisdiction =
    raw['Jurisdiction'] ||
    raw.jurisdiction ||
    'Global';

  /**
   * IMPORTANT: "Quality Status" is NOT a static UI badge.
   * It reflects dynamic connection health (HTTP reachability, latency & ingestion validation)
   * calculated upon each ingestion/crawl cycle.
   */
  const dynamicHealth: HealthStatus = (() => {
    // 1. Explicit telemetry latency check
    if (typeof raw.endpointLatencyMs === 'number' && raw.endpointLatencyMs > 4000) {
      return 'Degraded';
    }
    // 2. Telemetry / connection health string
    const statusStr = (
      raw['Quality Status'] ||
      raw.quality_status ||
      raw.health ||
      'Healthy'
    ).toLowerCase();

    if (statusStr.includes('fail') || statusStr.includes('broken') || statusStr.includes('error') || statusStr.includes('timeout')) {
      return 'Failed';
    }
    if (statusStr.includes('degrad') || statusStr.includes('warn') || statusStr.includes('slow')) {
      return 'Degraded';
    }
    return 'Healthy';
  })();

  const rawSector = raw['Sector'] || raw.sector || '';

  // Standardize into 5 official Sector Groups
  let sectorGroup: SectorGroup = 'Financial Services & Capital Markets';
  if (
    rawSector.includes('Corporate') ||
    rawSector.includes('CoSec') ||
    rawSector.includes('Company Secretary') ||
    rawSector.includes('Beneficial Ownership') ||
    rawSector.includes('Company Registry')
  ) {
    sectorGroup = 'Corporate Governance & CoSec';
  } else if (
    rawSector.includes('Compliance') ||
    rawSector.includes('Risk') ||
    rawSector.includes('Enforcement') ||
    rawSector.includes('AML') ||
    rawSector.includes('Sanctions') ||
    rawSector.includes('Penalties')
  ) {
    sectorGroup = 'Compliance, Risk & Enforcement';
  } else if (
    rawSector.includes('Legal') ||
    rawSector.includes('Judicial') ||
    rawSector.includes('Judiciary') ||
    rawSector.includes('Insolvency') ||
    rawSector.includes('Restructuring')
  ) {
    sectorGroup = 'Legal & Judicial';
  } else if (
    rawSector.includes('Commerce') ||
    rawSector.includes('Safety') ||
    rawSector.includes('Public') ||
    rawSector.includes('Privacy') ||
    rawSector.includes('Cyber') ||
    rawSector.includes('Maritime') ||
    rawSector.includes('Labour') ||
    rawSector.includes('ESG')
  ) {
    sectorGroup = 'Commerce, Safety & Public Administration';
  }

  // Standardize category directly as sectorGroup (Single Source of Truth)
  const category = sectorGroup;

  const sourceCat = (raw['Source Category'] || raw.source_category || '').trim();

  const officialEndpoint =
    raw['URL'] ||
    raw.url ||
    raw.officialEndpoint ||
    (raw['URL Host'] ? `https://${raw['URL Host']}` : 'https://www.google.com');

  const themes: string[] = [
    sectorGroup,
    sourceCat,
    'Supervisory Policy',
  ].filter(Boolean);

  const subScopeName = sourceCat || `${acronym} Primary Releases`;
  const subScopeCode = raw['Source ID'] || raw.source_id || `${acronym}-PUB`;

  // Standard primary ID from Source ID, with fallback to acronym
  const primaryId = raw['Source ID'] || raw.source_id || raw.id || `src-${acronym.toLowerCase()}`;

  return {
    id: primaryId,
    name,
    acronym,
    jurisdiction,
    category,
    isFollowed: raw.isFollowed ?? true,
    cadence: 'Daily',
    themes,
    lastChecked: 'Active sync (dynamic telemetry)',
    latestPublication: raw['Summary'] || raw.summary || 'Official regulatory guidance and circular updates',
    health: dynamicHealth,
    openAlertsCount: raw.openAlertsCount ?? 0,
    owner: 'Automated Registry Ingestion',
    officialEndpoint,
    endpointLatencyMs: raw.endpointLatencyMs ?? 240,
    subScopes: [
      {
        id: `sub-${subScopeCode.toLowerCase()}`,
        name: subScopeName,
        code: subScopeCode,
        description: raw['Summary'] || raw.summary || `Source Category: ${sourceCat || 'official_institutional_website'} | Access: ${raw['Access Pattern'] || 'crawler'}`,
        isFollowed: raw.isFollowed ?? true,
        cadence: 'Daily',
        themes,
        openAlertsCount: 0,
      },
    ],
  };
}
