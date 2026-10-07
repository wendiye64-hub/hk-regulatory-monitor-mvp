import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PriorityAlert, RegulationItem, RegulatorInScope } from '@/types';

export interface RetrievedUrlItem {
  id: string;
  title: string;
  url: string;
  authority: string;
  jurisdiction: string;
  publishDate?: string;
  relevanceTag?: string;
  isBookmarked?: boolean;
  isFollowed?: boolean;
  rationale?: string;
  excerpt?: string;
  docType?: string;
}

export interface CitationItem {
  pin: string;
  sourceTitle: string;
  url: string;
  clause?: string;
  excerpt: string;
}

export interface TaskQuestion {
  id: string;
  questionText: string;
  status: 'Answered' | 'Generating' | 'Pending';
  retrievedUrls: RetrievedUrlItem[];
  llmAnswer: string;
  citations: CitationItem[];
  summary?: string;
}

export interface ComplianceTask {
  id: string;
  title: string;
  topic?: string;
  jurisdiction: string;
  homeJurisdiction?: string;
  targetJurisdiction?: string;
  targetJurisdictions?: string[];
  summary?: string;
  consolidatedSummary?: string;
  status: 'Completed' | 'Running' | 'Action Required' | 'Draft';
  createdAt: string;
  updatedAt: string;
  owner: string;
  questions: TaskQuestion[];
  linkedNewsIds: string[];
  linkedRegulatorIds: string[];
  notes?: string;
}

const STORAGE_KEY = 'wizpresso_compliance_tasks_v3';

const DEFAULT_INITIAL_TASKS: ComplianceTask[] = [
  {
    id: 'task-101',
    title: 'Operational Resilience & Third-Party Outsourcing Benchmark',
    topic: 'Operational Resilience & Incident Reporting',
    jurisdiction: 'Hong Kong ➔ Singapore',
    homeJurisdiction: 'Hong Kong',
    targetJurisdiction: 'Singapore',
    targetJurisdictions: ['Singapore'],
    summary: 'Evaluation of mandatory incident response and cloud outsourcing audit rights across HKMA and MAS dual-licensed operations.',
    consolidatedSummary: `### Consolidated Compliance Summary (Hong Kong ➔ Singapore)
1. **Incident Notification Discrepancy**:
   Under **HKMA SPM OR-2 §4.2**, authorized institutions must report any critical cyber or operational outage within **2 hours** of assessment. In contrast, **MAS Notice 655 §3.1** requires notification within **1 hour** upon confirming an unscheduled outage exceeding 4 hours cumulative.
2. **Third-Party & Cloud Audit Rights**:
   Both HKMA and MAS prohibit contracts lacking direct regulatory audit and inspection rights. Standard cloud terms must be supplemented with localized supervisory addendums granting direct on-site access to data centers.
3. **Action Items**:
   - Establish a dual-jurisdiction incident notification matrix reflecting the tighter 1-hour MAS window.
   - Review ongoing AWS/Azure master agreements for regulator-specific audit and penetration testing clauses.`,
    status: 'Completed',
    createdAt: '2026-09-28 09:30 UTC',
    updatedAt: '2026-10-02 14:15 UTC',
    owner: 'Ivan Choy',
    linkedNewsIds: ['alert-001', 'alert-002', 'dir-hkma-001'],
    linkedRegulatorIds: ['reg-hkma', 'reg-mas'],
    notes: 'Supervisory alignment across HKMA SPM OR-2 and MAS Guidelines on Outsourcing.',
    questions: [
      {
        id: 'q-101-1',
        questionText: 'What are the mandatory statutory notification timelines for severe cybersecurity or operational disruption incidents?',
        status: 'Answered',
        summary: 'Both HKMA and MAS mandate immediate notification within hours for critical incidents.',
        retrievedUrls: [
          {
            id: 'url-1',
            title: 'HKMA Supervisory Policy Manual OR-2: Operational Resilience',
            url: 'https://www.hkma.gov.hk/eng/regulatory-resources/supervisory-policy-manual/',
            authority: 'HKMA',
            jurisdiction: 'Hong Kong',
            publishDate: '2026-03-24',
            relevanceTag: 'Mandatory Directive',
            isBookmarked: true,
            isFollowed: true,
            rationale: 'Directly mandates HKMA authorized institutions to establish operational disruption tolerance metrics and report severe outages within 2 hours.',
            excerpt: 'Authorized Institutions must notify the HKMA as soon as practicable and in any event within 2 hours of detecting any incident that severely impacts critical operations.',
            docType: 'Guideline',
          },
          {
            id: 'url-2',
            title: 'MAS Technology Risk Management (TRM) Guidelines Notice 655',
            url: 'https://www.mas.gov.sg/regulation/guidelines/technology-risk-management-guidelines',
            authority: 'MAS',
            jurisdiction: 'Singapore',
            publishDate: '2026-02-18',
            relevanceTag: 'Statutory Notice',
            isBookmarked: false,
            isFollowed: true,
            rationale: 'Governs Singapore IT risk and incident reporting, establishing mandatory 1-hour notice requirement for material system failure.',
            excerpt: 'A financial institution must notify MAS immediately and no later than 1 hour upon becoming aware of any system unavailability affecting customer services.',
            docType: 'Circular',
          },
        ],
        llmAnswer: `Under **HKMA SPM OR-2 §4.2**, authorized institutions must report any critical cyber or operational outage within **2 hours** of initial assessment. Materiality criteria include loss of core banking functions or customer data exposure.

In comparison, **MAS Notice 655 §3.1** prescribes incident reporting to MAS within **1 hour** upon confirming an unscheduled system downtime exceeding 4 hours cumulative over any 12-month period, followed by a formal root-cause analysis within 14 calendar days.`,
        citations: [
          {
            pin: 'HKMA SPM OR-2 §4.2',
            sourceTitle: 'HKMA SPM OR-2 Operational Resilience (2026)',
            url: 'https://www.hkma.gov.hk/eng/regulatory-resources/supervisory-policy-manual/',
            clause: 'Section 4.2 Incident Reporting Protocol',
            excerpt: 'Authorized Institutions must notify the HKMA as soon as practicable and in any event within 2 hours of detecting any incident that severely impacts critical operations.',
          },
          {
            pin: 'MAS Notice 655 §3.1',
            sourceTitle: 'MAS Technology Risk Management Guidelines Notice 655',
            url: 'https://www.mas.gov.sg/regulation/guidelines/technology-risk-management-guidelines',
            clause: 'Notice 655 Paragraph 3.1 Unscheduled Outages',
            excerpt: 'A financial institution must notify MAS immediately and no later than 1 hour upon becoming aware of any system unavailability affecting customer services.',
          },
        ],
      },
      {
        id: 'q-101-2',
        questionText: 'Are financial institutions required to impose audit and inspection rights in third-party cloud service contracts?',
        status: 'Answered',
        summary: 'Direct audit rights, sub-contractor visibility, and supervisory access clauses are non-negotiable requirements.',
        retrievedUrls: [
          {
            id: 'url-3',
            title: 'HKMA Circular on Cloud Computing and Third-Party Vendor Risk',
            url: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/',
            authority: 'HKMA',
            jurisdiction: 'Hong Kong',
            publishDate: '2026-01-15',
            relevanceTag: 'Supervisory Circular',
            isBookmarked: false,
            isFollowed: true,
            rationale: 'Establishes clear statutory expectation for direct supervisory and internal audit access in all cloud and third-party contracts.',
            excerpt: 'The outsourcing agreement must explicitly recognize the right of the HKMA and its appointed agents to conduct on-site inspections of the service provider.',
            docType: 'Circular',
          },
        ],
        llmAnswer: `Yes. **HKMA Circular (Jan 2026)** stipulates that financial institutions must legally secure unhindered access and audit rights—including direct access for HKMA examiners—to cloud facilities, data centers, and multi-tenant security logs.

Contractual safeguards must also mandate annual SOC 2 Type II or ISO 27001 third-party attestation certifications and prompt notification of material sub-outsourcing modifications.`,
        citations: [
          {
            pin: 'HKMA Circular §6.3',
            sourceTitle: 'HKMA Circular on Cloud Computing Guidelines',
            url: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/',
            clause: 'Paragraph 6.3 Supervisory and Internal Audit Access',
            excerpt: 'The outsourcing agreement must explicitly recognize the right of the HKMA and its appointed agents to conduct on-site inspections of the service provider.',
          },
        ],
      },
    ],
  },
  {
    id: 'task-102',
    title: 'Cross-Border Corporate Secretarial & Beneficial Ownership Compliance',
    topic: 'Corporate Governance & AML/CFT',
    jurisdiction: 'Hong Kong ➔ United Kingdom',
    homeJurisdiction: 'Hong Kong',
    targetJurisdiction: 'United Kingdom',
    targetJurisdictions: ['United Kingdom'],
    summary: 'Comparison of register of significant controllers cap. 622 vs UK PSC register reforms for international holding structures.',
    consolidatedSummary: `### Consolidated Compliance Summary (Hong Kong ➔ United Kingdom)
1. **Officer & Natural Person Director Requirement**:
   Both Hong Kong and the United Kingdom require at least one natural person director. Hong Kong strictly prohibits a sole director from acting as company secretary under Companies Ordinance Cap. 622.
2. **Beneficial Ownership Transparency**:
   Hong Kong Significant Controllers Register (SCR) mandates keeping designated representative records at a registered Hong Kong address, while UK Economic Crime and Corporate Transparency Act introduces mandatory identity verification for all PSCs.
3. **Action Items**:
   - Audit corporate secretarial mandates to ensure sole directors do not hold dual officer roles.
   - Verify beneficial ownership identification and documentation readiness for cross-border entities.`,
    status: 'Action Required',
    createdAt: '2026-09-30 11:20 UTC',
    updatedAt: '2026-10-03 16:40 UTC',
    owner: 'Ivan Choy',
    linkedNewsIds: ['alert-004'],
    linkedRegulatorIds: ['reg-cr', 'reg-fca'],
    notes: 'Comparison of register of significant controllers cap. 622 vs UK PSC register reforms.',
    questions: [
      {
        id: 'q-102-1',
        questionText: 'Can a corporate body serve as sole director or secretary, and what residency requirements apply?',
        status: 'Answered',
        summary: 'Hong Kong requires at least one natural person director; sole director cannot act as secretary.',
        retrievedUrls: [
          {
            id: 'url-4',
            title: 'Companies Registry (Cap. 622) Companies Ordinance FAQ',
            url: 'https://www.cr.gov.hk/en/legislation/companies-ordinance/',
            authority: 'Companies Registry',
            jurisdiction: 'Hong Kong',
            publishDate: '2026-02-10',
            relevanceTag: 'Statute & Guidance',
            isBookmarked: true,
            isFollowed: true,
            rationale: 'Primary statutory provision governing corporate officer composition and anti-avoidance restrictions on dual directorships.',
            excerpt: 'The sole director of a private company must not also be the company secretary of the company.',
            docType: 'Primary Legislation',
          },
        ],
        llmAnswer: `Under **Companies Ordinance (Cap. 622) §454 & §474**, a private company registered in Hong Kong must have at least one director who is a natural person. The sole director cannot concurrently serve as company secretary. 

Furthermore, if a body corporate acts as company secretary, its registered office or place of business must be located in Hong Kong.`,
        citations: [
          {
            pin: 'Cap. 622 §474',
            sourceTitle: 'Hong Kong Companies Ordinance (Cap. 622)',
            url: 'https://www.cr.gov.hk/en/legislation/companies-ordinance/',
            clause: 'Section 474 Restrictions on Sole Director',
            excerpt: 'The sole director of a private company must not also be the company secretary of the company.',
          },
        ],
      },
    ],
  },
];

function loadStoredTasks(): ComplianceTask[] {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored compliance tasks', e);
  }
  return DEFAULT_INITIAL_TASKS;
}

export interface DocumentAliasGroup {
  canonicalId: string;
  referenceNumber: string;
  titleKeywords: string[];
  aliases: string[];
}

export const KNOWN_DOCUMENT_ALIASES: DocumentAliasGroup[] = [
  {
    canonicalId: 'hkma-001',
    referenceNumber: 'HKMA-SPM-OR2-2026',
    titleKeywords: ['operational resilience', 'spm or-2', 'third-party risk', 'supervisory policy manual or-2'],
    aliases: ['alt-hkma-001', 'reg-hkma-001', 'dir-hkma-001', 'alert-001', 'hkma-001', 'url-1'],
  },
  {
    canonicalId: 'sfc-002',
    referenceNumber: 'SFC-CIR-2026-003',
    titleKeywords: ['virtual asset', 'intermediaries', 'custody arrangements'],
    aliases: ['alt-sfc-002', 'reg-sfc-002', 'dir-sfc-002', 'alert-002', 'sfc-002'],
  },
  {
    canonicalId: 'cr-003',
    referenceNumber: 'CR-GDL-SCR-2026',
    titleKeywords: ['significant controllers', 'cap. 622', 'companies registry', 'companies ordinance'],
    aliases: ['alt-cr-003', 'reg-cr-003', 'dir-cr-003', 'alert-003', 'cr-003', 'url-4'],
  },
  {
    canonicalId: 'mas-004',
    referenceNumber: 'MAS-TRM-2026-01',
    titleKeywords: ['technology risk management', 'mas notice 644', 'mas notice 655', 'trm guidelines'],
    aliases: ['alt-mas-004', 'reg-mas-004', 'dir-mas-004', 'alert-004', 'mas-004', 'url-2'],
  },
  {
    canonicalId: 'hkex-005',
    referenceNumber: 'HKEX-ESG-CC-2026',
    titleKeywords: ['climate-related disclosures', 'hkex consultation'],
    aliases: ['alt-hkex-005', 'reg-hkex-005', 'dir-hkex-005', 'alert-005', 'hkex-005'],
  },
  {
    canonicalId: 'fca-006',
    referenceNumber: 'FCA-PS22-9-REV',
    titleKeywords: ['consumer duty', 'ps22/9', 'fair value benchmarks'],
    aliases: ['alt-fca-006', 'reg-fca-006', 'dir-fca-006', 'alert-006', 'fca-006'],
  },
];

export function getDocCanonicalTokens(identifier?: string, title?: string, ref?: string): Set<string> {
  const tokens = new Set<string>();
  if (!identifier && !title && !ref) return tokens;

  const idNorm = (identifier || '').trim().toLowerCase();
  const refNorm = (ref || '').trim().toLowerCase();
  const titleNorm = (title || '').trim().toLowerCase();

  if (idNorm) tokens.add(idNorm);
  if (refNorm) tokens.add(refNorm);

  for (const doc of KNOWN_DOCUMENT_ALIASES) {
    const matchesId = idNorm && doc.aliases.some((a) => a === idNorm || idNorm.includes(a));
    const matchesRef = refNorm && doc.referenceNumber.toLowerCase() === refNorm;
    const matchesTitle = titleNorm && doc.titleKeywords.some((kw) => titleNorm.includes(kw));

    if (matchesId || matchesRef || matchesTitle) {
      tokens.add(doc.canonicalId);
      tokens.add(doc.referenceNumber.toLowerCase());
      doc.aliases.forEach((a) => tokens.add(a));
    }
  }

  if (idNorm) {
    const stripped = idNorm.replace(/^(?:alt|reg|dir|alert|src|doc)[-_]/, '');
    if (stripped && stripped !== idNorm) {
      tokens.add(stripped);
    }
  }

  return tokens;
}

function isTaskLinkedToNews(task: ComplianceTask, queryTokens: Set<string>): boolean {
  if (queryTokens.size === 0) return false;

  for (const newsId of task.linkedNewsIds) {
    const taskTokens = getDocCanonicalTokens(newsId);
    for (const t of taskTokens) {
      if (queryTokens.has(t)) return true;
    }
  }

  for (const q of task.questions) {
    for (const url of q.retrievedUrls || []) {
      const urlTokens = getDocCanonicalTokens(url.id, url.title);
      for (const t of urlTokens) {
        if (queryTokens.has(t)) return true;
      }
    }
  }

  return false;
}

export const useTaskStore = defineStore('taskStore', () => {
  const tasks = ref<ComplianceTask[]>(loadStoredTasks());
  const activeTaskId = ref<string | null>(null);

  const persist = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value));
    } catch (e) {
      console.warn('Failed to save compliance tasks', e);
    }
  };

  const activeTask = computed(() => {
    if (!activeTaskId.value) return null;
    return tasks.value.find((t) => t.id === activeTaskId.value) || null;
  });

  // Calculate linkage count for a news item with universal alias resolution
  const getNewsLinkageCount = (newsId: string, title?: string, referenceNumber?: string): number => {
    const queryTokens = getDocCanonicalTokens(newsId, title, referenceNumber);
    return tasks.value.filter((t) => isTaskLinkedToNews(t, queryTokens)).length;
  };

  // Get all tasks linked to a specific news item with universal alias resolution
  const getTasksForNews = (newsId: string, title?: string, referenceNumber?: string): ComplianceTask[] => {
    const queryTokens = getDocCanonicalTokens(newsId, title, referenceNumber);
    return tasks.value.filter((t) => isTaskLinkedToNews(t, queryTokens));
  };

  // Calculate linkage count for a regulator
  const getRegulatorLinkageCount = (regulatorIdOrAcronym: string): number => {
    const norm = regulatorIdOrAcronym.trim().toLowerCase();
    return tasks.value.filter((t) =>
      t.linkedRegulatorIds.some((id) => {
        const itemNorm = id.trim().toLowerCase();
        return itemNorm === norm || itemNorm === `reg-${norm}` || `reg-${itemNorm}` === norm;
      })
    ).length;
  };

  // Get all tasks linked to a specific regulator
  const getTasksForRegulator = (regulatorIdOrAcronym: string): ComplianceTask[] => {
    const norm = regulatorIdOrAcronym.trim().toLowerCase();
    return tasks.value.filter((t) =>
      t.linkedRegulatorIds.some((id) => {
        const itemNorm = id.trim().toLowerCase();
        return itemNorm === norm || itemNorm === `reg-${norm}` || `reg-${itemNorm}` === norm;
      })
    );
  };

  // Create a new task
  const createTask = (payload: {
    title: string;
    topic?: string;
    jurisdiction?: string;
    homeJurisdiction?: string;
    targetJurisdiction?: string;
    targetJurisdictions?: string[];
    summary?: string;
    rawQuestions?: string[];
    linkedNewsIds?: string[];
    linkedRegulatorIds?: string[];
    notes?: string;
  }): ComplianceTask => {
    const taskId = `task-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

    const homeJur = payload.homeJurisdiction || 'Hong Kong';
    const targetJurs: string[] =
      payload.targetJurisdictions && payload.targetJurisdictions.length > 0
        ? payload.targetJurisdictions
        : payload.targetJurisdiction
        ? payload.targetJurisdiction.split(/[,&➔/]+/).map((s) => s.trim()).filter(Boolean)
        : ['Singapore'];
    const targetJurStr = targetJurs.join(', ');
    const combinedJur = homeJur === targetJurStr ? homeJur : `${homeJur} ➔ ${targetJurStr}`;

    let questionsList: string[] = (payload.rawQuestions || [])
      .map((q) => q.trim())
      .filter(Boolean);

    // If user added no questions, handle cleanly under the hood by attaching a system-default trigger/query
    if (questionsList.length === 0) {
      questionsList = [
        'Conduct routine supervisory compliance monitoring and identify applicable statutory guidelines.',
      ];
    }

    const getAuthorityForJur = (jur: string) => {
      const j = jur.toLowerCase();
      if (j.includes('singapore')) return { code: 'MAS', name: 'Monetary Authority of Singapore', domain: 'mas.gov.sg' };
      if (j.includes('united kingdom') || j.includes('uk')) return { code: 'FCA', name: 'Financial Conduct Authority', domain: 'fca.org.uk' };
      if (j.includes('european union') || j.includes('eu')) return { code: 'EBA / ESMA', name: 'European Banking Authority', domain: 'eba.europa.eu' };
      if (j.includes('united states') || j.includes('us')) return { code: 'SEC / CFTC', name: 'US Securities & Exchange Commission', domain: 'sec.gov' };
      if (j.includes('japan')) return { code: 'JFSA', name: 'Financial Services Agency of Japan', domain: 'fsa.go.jp' };
      if (j.includes('australia')) return { code: 'APRA / ASIC', name: 'Australian Prudential Regulation Authority', domain: 'apra.gov.au' };
      if (j.includes('china')) return { code: 'NFRA / CSRC', name: 'National Financial Regulatory Administration', domain: 'nfra.gov.cn' };
      if (j.includes('hong kong')) return { code: 'HKMA', name: 'Hong Kong Monetary Authority', domain: 'hkma.gov.hk' };
      return { code: `${jur.slice(0, 3).toUpperCase()}-REG`, name: `${jur} Regulatory Authority`, domain: `${jur.toLowerCase().replace(/[^a-z]/g, '')}.gov` };
    };

    const constructedQuestions: TaskQuestion[] = questionsList.map((qText, idx) => {
      const qId = `q-${Date.now()}-${idx + 1}`;
      const isRoutineDefault = qText.toLowerCase().includes('routine supervisory');

      // Generate authoritative URLs across target jurisdictions
      const retrievedUrls: RetrievedUrlItem[] = [];
      const citations: CitationItem[] = [];

      // 1. Target Jurisdictions sources
      targetJurs.forEach((tJur, tIdx) => {
        const auth = getAuthorityForJur(tJur);
        const urlItem: RetrievedUrlItem = {
          id: `url-${qId}-target-${tIdx + 1}`,
          title: `${auth.code} Supervisory Standard & Regulatory Guidelines for ${tJur}`,
          url: `https://www.${auth.domain}/regulatory-guides/standards/`,
          authority: auth.code,
          jurisdiction: tJur,
          publishDate: '2026-03-20',
          relevanceTag: 'Authoritative Official Source',
          isBookmarked: false,
          isFollowed: true,
          rationale: `Directly mandates statutory compliance, supervisory notification protocols, and risk threshold parameters in ${tJur} in response to: "${qText.slice(0, 60)}..."`,
          excerpt: `Entities under the jurisdiction of ${auth.code} in ${tJur} must establish verifiable governance controls, periodic stress testing, and maintain audit records of compliance gap assessments.`,
          docType: 'Guideline',
        };
        retrievedUrls.push(urlItem);

        citations.push({
          pin: `${auth.code} Standard §1.${tIdx + 1}`,
          sourceTitle: `${auth.code} Supervisory Standards (${tJur})`,
          url: urlItem.url,
          clause: `Section 1.${tIdx + 1} Statutory Mandate`,
          excerpt: `Authorized institutions under ${auth.code} must enforce verifiable governance controls and maintain updated logs of regulatory compliance.`,
        });
      });

      // 2. Home jurisdiction baseline source (HKMA)
      const homeAuth = getAuthorityForJur(homeJur);
      const homeUrl: RetrievedUrlItem = {
        id: `url-${qId}-home`,
        title: `${homeAuth.code} Statutory Baseline & Circulars on ${payload.topic || 'Compliance'}`,
        url: `https://www.${homeAuth.domain}/circulars/supervisory-framework/`,
        authority: homeAuth.code,
        jurisdiction: homeJur,
        publishDate: '2026-02-15',
        relevanceTag: 'Home Baseline Reference',
        isBookmarked: false,
        isFollowed: true,
        rationale: `Provides legal definitions, baseline thresholds, and cross-border alignment obligations in ${homeJur} relevant to ${payload.title}.`,
        excerpt: `A financial institution must notify supervisory authorities immediately upon becoming aware of any material risk exposure or contractual non-compliance.`,
        docType: 'Circular',
      };
      retrievedUrls.push(homeUrl);

      citations.push({
        pin: `${homeAuth.code} Baseline §4.1`,
        sourceTitle: `${homeAuth.code} Statutory Code & Guidance Notes`,
        url: homeUrl.url,
        clause: 'Paragraph 4.1 Cross-Border Reciprocity',
        excerpt: `Supervisory authorities expect continuous monitoring of foreign group entities operating under shared infrastructure.`,
      });

      const llmAnswer = isRoutineDefault
        ? `### Automated Routine Multi-Jurisdictional Assessment
Based on official guidelines retrieved across **${homeJur}** and **${targetJurStr}**:
1. Regular surveillance has verified that no emergent disciplinary enforcement notices restrict operations.
2. Key compliance standards require ongoing audit documentation and quarterly policy reviews across all monitored jurisdictions.
3. Relevant statutory requirements remain aligned with current compliance controls.`
        : `### Multi-Jurisdictional Compliance Synthesis (${homeJur} ➔ ${targetJurStr})
Based directly on authoritative records retrieved across all selected jurisdictions:

1. **Home Baseline (${homeJur} - ${homeAuth.code}):**
   Under **${homeAuth.code} Baseline §4.1**, applicable regulated entities must enforce documented governance protocols, maintain clear officer accountability, and monitor cross-border exposure.

2. **Target Jurisdictions Assessment (${targetJurStr}):**
${targetJurs
  .map((tJur) => {
    const auth = getAuthorityForJur(tJur);
    return `   - **${tJur} (${auth.code})**: Regulated institutions subject to ${auth.name} must adhere to statutory notification rules, enforce direct cloud audit clauses, and conduct regular scenario testing.`;
  })
  .join('\n')}

3. **Jurisdictional Alignment & Safeguards:**
   Supervisory authorities across **${targetJurStr}** require active alignment with group compliance baselines established in **${homeJur}**, ensuring no regulatory vacuum exists between multi-licensed operating entities.`;

      return {
        id: qId,
        questionText: qText,
        status: 'Answered',
        summary: `Analysis synthesized from ${retrievedUrls.length} authoritative source documents across ${targetJurs.length + 1} jurisdictions.`,
        retrievedUrls,
        llmAnswer,
        citations,
      };
    });

    const consolidatedSummary = `### Consolidated Compliance Summary (${homeJur} ➔ ${targetJurStr})
1. **Harmonized Regulatory Baseline**:
   Across both **${homeJur}** and all target markets (**${targetJurStr}**), supervisory authorities mandate prompt incident notification, continuous third-party supplier governance, and documented compliance gap assessments.
2. **Multi-Jurisdictional Divergence & Priority Action**:
${targetJurs
  .map((tJur) => {
    const auth = getAuthorityForJur(tJur);
    return `   - **${tJur} (${auth.code})**: Discrepancies in notification timelines and statutory audit provisions require updating the dual-jurisdiction compliance matrix for operations in ${tJur}.`;
  })
  .join('\n')}
3. **Action Items**:
   - Establish cross-border notification escalation paths reconciling timeline differences across all target markets (${targetJurStr}).
   - Bookmark identified regulatory source circulars in the Directory for ongoing automated surveillance.
   - Review commercial agreements for mandatory supervisory audit clauses across each target regime.`;

    const newTask: ComplianceTask = {
      id: taskId,
      title: payload.title || `Compliance Task: ${payload.topic || 'Supervisory Research'}`,
      topic: payload.topic || 'General Compliance',
      jurisdiction: combinedJur,
      homeJurisdiction: homeJur,
      targetJurisdiction: targetJurStr,
      targetJurisdictions: targetJurs,
      summary:
        payload.summary ||
        `Compliance assessment evaluating supervisory obligations across ${homeJur} and ${targetJurStr}.`,
      consolidatedSummary,
      status: 'Completed',
      createdAt: nowStr,
      updatedAt: nowStr,
      owner: 'Ivan Choy',
      questions: constructedQuestions,
      linkedNewsIds: payload.linkedNewsIds || [],
      linkedRegulatorIds: payload.linkedRegulatorIds || [],
      notes: payload.notes || '',
    };

    tasks.value.unshift(newTask);
    persist();
    return newTask;
  };

  // Toggle URL Bookmark inside a task
  const toggleUrlBookmark = (taskId: string, questionId: string, urlId: string): boolean => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return false;
    const q = task.questions.find((qu) => qu.id === questionId);
    if (!q) return false;
    const targetUrl = q.retrievedUrls.find((u) => u.id === urlId);
    if (!targetUrl) return false;

    targetUrl.isBookmarked = !targetUrl.isBookmarked;
    persist();
    return targetUrl.isBookmarked;
  };

  // Toggle URL Authority Follow inside a task
  const toggleUrlFollow = (taskId: string, questionId: string, urlId: string): boolean => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return false;
    const q = task.questions.find((qu) => qu.id === questionId);
    if (!q) return false;
    const targetUrl = q.retrievedUrls.find((u) => u.id === urlId);
    if (!targetUrl) return false;

    targetUrl.isFollowed = !targetUrl.isFollowed;
    persist();
    return targetUrl.isFollowed;
  };

  // Link news to task
  const linkNewsToTask = (taskId: string, newsId: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    if (!task.linkedNewsIds.includes(newsId)) {
      task.linkedNewsIds.push(newsId);
      task.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
      persist();
    }
  };

  // Unlink news from task (removes any alias representation of that document)
  const unlinkNewsFromTask = (taskId: string, newsId: string, title?: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    const queryTokens = getDocCanonicalTokens(newsId, title);
    task.linkedNewsIds = task.linkedNewsIds.filter((id) => {
      const idTokens = getDocCanonicalTokens(id);
      for (const t of idTokens) {
        if (queryTokens.has(t)) return false;
      }
      return true;
    });
    task.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    persist();
  };

  // Link regulator to task
  const linkRegulatorToTask = (taskId: string, regulatorId: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    if (!task.linkedRegulatorIds.includes(regulatorId)) {
      task.linkedRegulatorIds.push(regulatorId);
      task.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
      persist();
    }
  };

  // Unlink regulator from task
  const unlinkRegulatorFromTask = (taskId: string, regulatorId: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    task.linkedRegulatorIds = task.linkedRegulatorIds.filter((id) => id !== regulatorId);
    task.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    persist();
  };

  // Delete a task
  const deleteTask = (taskId: string) => {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    if (activeTaskId.value === taskId) {
      activeTaskId.value = null;
    }
    persist();
  };

  return {
    tasks,
    activeTaskId,
    activeTask,
    getNewsLinkageCount,
    getTasksForNews,
    getRegulatorLinkageCount,
    getTasksForRegulator,
    createTask,
    linkNewsToTask,
    unlinkNewsFromTask,
    linkRegulatorToTask,
    unlinkRegulatorFromTask,
    toggleUrlBookmark,
    toggleUrlFollow,
    deleteTask,
  };
});
