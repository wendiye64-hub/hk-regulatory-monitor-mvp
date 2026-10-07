import {
  MatrixSessionState,
  MatrixComplianceStatus,
  MatrixJurisdictionItem,
  MatrixQuestionItem,
  MatrixCellData,
  JurisdictionPreset,
  MatrixCitationItem
} from '../types';

export const ALL_AVAILABLE_JURISDICTIONS: MatrixJurisdictionItem[] = [
  { code: 'HK', name: 'Hong Kong', regulatorAcronym: 'HKMA / CR', complianceStatus: 'compliant' },
  { code: 'SG', name: 'Singapore', regulatorAcronym: 'MAS / ACRA', complianceStatus: 'conditional' },
  { code: 'UK', name: 'United Kingdom', regulatorAcronym: 'FCA / Companies House', complianceStatus: 'compliant' },
  { code: 'US', name: 'United States', regulatorAcronym: 'SEC / Delaware SOS', complianceStatus: 'conditional' },
  { code: 'AU', name: 'Australia', regulatorAcronym: 'ASIC / APRA', complianceStatus: 'conditional' },
  { code: 'JP', name: 'Japan', regulatorAcronym: 'FSA / MOJ', complianceStatus: 'prohibited' },
  { code: 'EU', name: 'European Union', regulatorAcronym: 'EBA / ESMA', complianceStatus: 'conditional' },
  { code: 'ID', name: 'Indonesia', regulatorAcronym: 'OJK / BI', complianceStatus: 'inconclusive' }
];

export const INITIAL_JURISDICTION_PRESETS: JurisdictionPreset[] = [
  {
    id: 'preset-sea-3',
    name: 'Singapore, Hong Kong, Indonesia',
    description: 'Covers Singapore, Hong Kong, and Indonesia',
    jurisdictionCodes: ['SG', 'HK', 'ID']
  },
  {
    id: 'preset-west-2',
    name: 'United States, United Kingdom',
    description: 'Covers United States and United Kingdom',
    jurisdictionCodes: ['US', 'UK']
  },
  {
    id: 'preset-core-4',
    name: 'Hong Kong, Singapore, United Kingdom, United States',
    description: 'Covers Hong Kong, Singapore, United Kingdom, and United States',
    jurisdictionCodes: ['HK', 'SG', 'UK', 'US']
  },
  {
    id: 'preset-apac-4',
    name: 'Hong Kong, Singapore, Australia, Japan',
    description: 'Covers Hong Kong, Singapore, Australia, and Japan',
    jurisdictionCodes: ['HK', 'SG', 'AU', 'JP']
  }
];

export const SAMPLE_QUESTION_SETS = [
  {
    category: 'Corporate Governance & Statutory Filings',
    questions: [
      'Can a body corporate serve as a company secretary in this jurisdiction? What registered office or local presence conditions apply?',
      'What are the anti-avoidance restrictions on sole directors concurrently acting as or appointing a corporate secretary?',
      'What statutory filing deadlines and regulatory licensing (e.g. TCSP/ACSP) apply to corporate secretarial service providers?'
    ]
  },
  {
    category: 'Cloud Outsourcing & Operational Resilience',
    questions: [
      'What are the mandatory contractual inspection and multi-tier subcontracting audit rights for cloud service providers?',
      'What explicit Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) are prescribed for critical banking operations?',
      'Does the supervisory authority require advance notification, approval, or independent SOC 2 Type II assurance prior to public cloud migration?'
    ]
  },
  {
    category: 'AI Governance & Model Risk',
    questions: [
      'What risk assessment frameworks and human-in-the-loop controls are required for high-risk generative AI deployment?',
      'What customer consent and data tokenization rules govern cross-border training data ingestion under financial secrecy laws?'
    ]
  }
];

// Session 1: Corporate Secretary & Body Corporate Eligibility
export const initialMatrixSession1: MatrixSessionState = {
  sessionId: 'matrix-sess-corp-sec',
  sessionTitle: 'Corporate Secretary Eligibility & Cross-Border Compliance Matrix',
  activeQuestionIndex: 0,
  activeJurisdictionCode: 'HK',
  createdAt: '2026-09-17 14:30:00 UTC',
  updatedAt: '2026-09-17 18:22:00 UTC',
  creator: 'Ivan Choy (Lead Compliance Officer)',
  isSaved: true,
  isLoading: false,
  questions: [
    {
      questionId: 'q-1',
      questionText: 'Can a body corporate serve as a company secretary in this jurisdiction? What registered office or local presence conditions apply?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] Permissibility of corporate secretaries reflects a clear jurisdictional divide: Hong Kong (Cap. 622 §474(4)) and the UK (Companies Act 2006 §270-271) expressly permit corporate entities to act as secretaries, provided a registered office or place of business is maintained locally. Conversely, Singapore (Companies Act 1967 §171(1AA)) strictly prohibits body corporate secretaries, mandating an ordinarily resident natural person. In the US (e.g. Delaware DGCL §142), corporate officers are typically individuals, while commercial registered agents can be corporate bodies.'
    },
    {
      questionId: 'q-2',
      questionText: 'What are the anti-avoidance restrictions on sole directors concurrently acting as or appointing a corporate secretary?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] Preventing sole-individual circumvention is a shared priority across jurisdictions. Hong Kong strictly prohibits a sole director from appointing a corporate secretary where they are also the sole director (Cap. 622 §475(2)). The UK prohibits execution of deeds by the same individual in dual capacities under CA 2006 §280. Singapore strictly bars sole directors from acting as natural person secretary under §171(1E). In Delaware, while state law allows multiple offices, public entities are constrained by SEC and Sarbanes-Oxley internal control requirements.'
    },
    {
      questionId: 'q-3',
      questionText: 'What statutory filing deadlines and regulatory licensing (e.g. TCSP/ACSP) apply to corporate secretarial service providers?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] Service provider licensing and AML/CFT supervision are universal requirements. Hong Kong enforces TCSP licensing (Cap. 615) with a 15-day Form ND2A filing requirement; Singapore enforces Registered CSP certification and a 14-day BizFile+ window; the UK mandates Authorised Corporate Service Provider (ACSP) registration under ECCTA 2023 with a 14-day AP04 filing; and the US mandates Beneficial Ownership Information (BOI) reporting via FinCEN.'
    }
  ],
  jurisdictions: [
    { code: 'HK', name: 'Hong Kong', regulatorAcronym: 'HKMA / CR', complianceStatus: 'compliant' },
    { code: 'SG', name: 'Singapore', regulatorAcronym: 'MAS / ACRA', complianceStatus: 'prohibited' },
    { code: 'UK', name: 'United Kingdom', regulatorAcronym: 'FCA / Companies House', complianceStatus: 'compliant' },
    { code: 'US', name: 'United States', regulatorAcronym: 'SEC / Delaware SOS', complianceStatus: 'conditional' }
  ],
  matrixCells: {
    // Q1 x HK
    'q-1_HK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: 'Fully Permitted (Subject to Local Presence)',
      answerMarkdown: `### Hong Kong SAR: Corporate Body Fully Permitted (Subject to Local Presence Condition)

Pursuant to Section 474(4) of the Companies Ordinance (Cap. 622) [Cap. 622 §474(4)], **a body corporate is explicitly eligible to be appointed as the company secretary of a Hong Kong incorporated company**, subject to local nexus criteria:

1. **Registered Office / Place of Business Nexus**: The body corporate must maintain its registered office or an established place of business in Hong Kong. Offshore incorporated entities (e.g., Cayman or BVI entities) must be registered under Part 16 as a registered non-Hong Kong company and possess a valid Business Registration Certificate.
2. **Statutory Powers & Signature Authority**: A corporate secretary owes identical statutory fiduciary duties as an individual. Regulatory filings (such as Annual Return Form NAR1) must be signed by an authorized director or designated representative under corporate seal [CR Circular 2024/02].
3. **TCSP Licensing Prerequisite**: If the body corporate offers company secretarial services to third parties by way of business, it must obtain and maintain a valid **Trust or Company Service Provider (TCSP) Licence** issued by the Registrar of Companies under Cap. 615 §53G.`,
      keyTakeaways: [
        'Under Cap. 622 §474(4), body corporate is permitted to act as company secretary.',
        'Registered office or place of business must be situated within Hong Kong.',
        'Providing commercial services requires a valid Cap. 615 TCSP licence.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-hk-cap622-474',
          sourceTitle: 'Companies Ordinance (Cap. 622) - Section 474: Company Secretary',
          authority: 'Hong Kong Companies Registry',
          regulatorAcronym: 'CR',
          effectiveDate: '2014-03-03 (Consolidated 2024)',
          sourceUrl: 'https://www.elegislation.gov.hk/hk/cap622!en@2024-01-01',
          excerpt: 'Section 474(4): If the company secretary is a body corporate, its registered office or a place of business must be in Hong Kong.',
          highlightedTerms: ['body corporate', 'registered office or a place of business must be in Hong Kong'],
          sha256: '9f83a41b2c5890e0b3d87e02315a67c4f4201bfa829104de0f9b69b82e3fa021',
          relevanceScore: 98,
          relevanceTag: 'Mandatory Statutory Condition'
        },
        {
          citationId: 'cit-hk-cap615-tcsp',
          sourceTitle: 'Anti-Money Laundering and Counter-Terrorist Financing Ordinance (Cap. 615) Part 5A',
          authority: 'Companies Registry / HKMA',
          regulatorAcronym: 'CR / HKMA',
          effectiveDate: '2018-03-01',
          sourceUrl: 'https://www.tcsp.cr.gov.hk/tcspls/index',
          excerpt: 'Section 53G: A person commits an offence if the person carries on a trust or company service business in Hong Kong without a licence granted under this Part.',
          highlightedTerms: ['carries on a trust or company service business', 'without a licence'],
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          relevanceScore: 94,
          relevanceTag: 'Licensing Prerequisite'
        }
      ],
      followUps: [
        {
          id: 'fu-init-1',
          index: 1,
          timestamp: '11:39:18 AM',
          jurisdictionName: 'Hong Kong',
          jurisdictionCode: 'HK',
          questionNumber: 1,
          queryText: 'Does this local presence exemption apply to overseas branches or subsidiary holding vehicles without full-time staff?',
          findingText: 'Under Cap. 622 §474(4) and Companies Registry Guideline GN-2024/01, maintaining a place of business requires demonstrable physical premises and record-keeping capability in Hong Kong. Mere postal registration without designated local authorized representatives fails statutory substance scrutiny, triggering mandatory supervisory inquiries under Cap. 615 §53Z.'
        }
      ]
    },

    // Q1 x SG
    'q-1_SG': {
      complianceStatus: 'prohibited',
      statusBadgeLabel: 'Strictly Prohibited (Natural Person Only)',
      answerMarkdown: `### Republic of Singapore: Corporate Body Strictly Prohibited (Natural Person Only)

Pursuant to Section 171(1AA) of the Singapore Companies Act 1967 [SG Companies Act §171(1AA)], **Singapore company law strictly bars corporate bodies from serving as company secretaries**:

1. **Natural Person Requirement**: The statute mandates that every company secretary must be a natural person who is ordinarily resident in Singapore (citizen, permanent resident, or EntrePass / valid employment pass holder).
2. **Void ab Initio Appointment**: Any board resolution or constitutional provision purporting to appoint a domestic corporate entity, offshore entity, or consultancy firm as company secretary is null and void ab initio.
3. **Qualified Professional Requirement**: For public companies, the appointed natural person must possess prescribed professional qualifications (e.g., SAICSA member, ISCA chartered accountant, or advocate/solicitor with 3+ years experience) [ACRA Practice Direction No. 2 of 2020].
4. **Third-Party Service Provider Structure**: Corporate Service Providers (CSPs) assign qualified individual employees to act as the registered secretary on behalf of client companies.`,
      keyTakeaways: [
        'Singapore strictly prohibits body corporate secretaries (Companies Act §171(1AA)).',
        'Secretary must be an ordinarily resident natural person in Singapore.',
        'CSPs must designate qualified natural person representatives for ACRA registration.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-sg-ca1967-171',
          sourceTitle: 'Singapore Companies Act 1967 (2020 Revised Edition) - Section 171: Secretary',
          authority: 'Accounting and Corporate Regulatory Authority (ACRA)',
          regulatorAcronym: 'ACRA',
          effectiveDate: '1967-12-29 (Rev. 2020)',
          sourceUrl: 'https://sso.agc.gov.sg/Act/CoA1967#pr171-',
          excerpt: 'Section 171(1AA): The secretary must be a natural person who has his or her principal or only place of residence in Singapore. A body corporate is not eligible to be appointed as secretary.',
          highlightedTerms: ['must be a natural person', 'A body corporate is not eligible to be appointed as secretary'],
          sha256: '84920485a0219483018247dbac29038294719283401928491823901928471928',
          relevanceScore: 99,
          relevanceTag: 'Express Statutory Prohibition'
        }
      ]
    },

    // Q1 x UK
    'q-1_UK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: 'Fully Permitted (Corporate Secretary Allowed)',
      answerMarkdown: `### United Kingdom: Corporate Body Permitted (Optional for Private Companies)

Under the UK Companies Act 2006 (CA 2006) Sections 270 to 276:

1. **Private Company Exemption**: Since April 2008, private limited companies are no longer statutorily required to appoint a company secretary unless explicitly mandated by their Articles of Association.
2. **Corporate Secretary Eligibility**: Where a secretary is appointed voluntarily (or for public PLCs), a **body corporate is legally eligible to act as company secretary**.
3. **Identity Verification (ECCTA 2023)**: Under the Economic Crime and Corporate Transparency Act 2023, corporate secretaries and their underlying officers must undergo identity verification (IDV) with Companies House to maintain registration validity.`,
      keyTakeaways: [
        'UK Companies Act 2006 permits body corporate secretaries.',
        'Private limited companies are exempt from mandatory secretarial appointment unless required by articles.',
        'Under ECCTA 2023, key corporate secretary officers must undergo identity verification.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-uk-ca2006-271',
          sourceTitle: 'UK Companies Act 2006 - Chapter 12: Company Secretaries (Section 271-276)',
          authority: 'Companies House / Insolvency Service',
          regulatorAcronym: 'Companies House',
          effectiveDate: '2006-11-08',
          sourceUrl: 'https://www.legislation.gov.uk/ukpga/2006/46/part/12',
          excerpt: 'Section 276: A body corporate may be appointed as a company secretary, provided its registered or principal office particulars are filed with the registrar under section 277.',
          highlightedTerms: ['A body corporate may be appointed as a company secretary', 'registered or principal office'],
          sha256: '4720194820193857102948271039482710394827103948271039482710394827',
          relevanceScore: 97,
          relevanceTag: 'Statutory Permission & Governance'
        }
      ]
    },

    // Q1 x US
    'q-1_US': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Conditional (Registered Agent vs. Corporate Officer)',
      answerMarkdown: `### United States (Delaware DGCL Baseline): Role Distinction & Legal Framework

Corporate governance in the United States is governed at the state level, with the Delaware General Corporation Law (DGCL) serving as the prevailing benchmark:

1. **Corporate Secretary (Executive Officer)**: Under DGCL §142, corporations must appoint officers with duties defined in corporate bylaws. The secretary position is customarily held by natural persons bound by personal fiduciary duties of loyalty and care.
2. **Registered Agent (DGCL §132)**: Foreign practitioners frequently conflate company secretarial roles with registered agents. Delaware law requires every entity to maintain a registered agent within the state; **qualified corporate bodies (corporations or LLCs) are widely permitted and customary as commercial registered agents**.
3. **LLC Flexibility**: For Delaware LLCs, operating agreements offer broad contractual freedom, allowing corporate managing members to execute secretarial and archival responsibilities.`,
      keyTakeaways: [
        'Corporate officers are typically natural persons bearing individual fiduciary duties.',
        'Commercial registered agents are legally authorized to be corporate bodies.',
        'Delaware LLCs enjoy broad contractual freedom to delegate secretarial tasks to corporate managers.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-us-dgcl-142',
          sourceTitle: 'Delaware General Corporation Law (Title 8, Chapter 1) - Subchapter IV: Officers §142',
          authority: 'Delaware Division of Corporations',
          regulatorAcronym: 'Delaware SOS',
          effectiveDate: 'Consolidated 2024',
          sourceUrl: 'https://delcode.delaware.gov/title8/c001/sc04/',
          excerpt: 'DGCL §142(a): Every corporation shall have such officers with such titles and duties as shall be stated in the bylaws or in a resolution of the board of directors... One of the officers shall have the duty to record the proceedings of the meetings of stockholders and directors.',
          highlightedTerms: ['duty to record the proceedings of the meetings', 'officers'],
          sha256: '9840192840192840192840192840192840192840192840192840192840192840',
          relevanceScore: 92,
          relevanceTag: 'State Statutory Standard'
        }
      ]
    },

    // Q2 x HK
    'q-2_HK': {
      complianceStatus: 'prohibited',
      statusBadgeLabel: 'Strict Prohibition (Anti-Avoidance Shield)',
      answerMarkdown: `### Hong Kong SAR: Sole Director Prohibited from Appointing Wholly-Owned Corporate Secretary

Under Section 475(2) of the Companies Ordinance (Cap. 622), an explicit anti-avoidance safeguard governs sole directorships:

1. **Anti-Avoidance Veil Piercing Rule**: A private company having only one director **must not have as secretary of the company a body corporate the sole director of which is the sole director of the company**.
2. **Legislative Intent**: Cap. 622 §475(1) already prevents a sole director from acting directly as company secretary. Subsection (2) closes the loophole of establishing a 100%-owned single-director corporate secretarial shell to circumvent governance checks.
3. **Consequences of Non-Compliance**: Any appointment violating this rule is legally invalid, exposing the entity and responsible officers to daily continuing criminal fines under Cap. 622 §474.`,
      keyTakeaways: [
        'Sole director cannot appoint a corporate secretary where they are the sole director (Cap. 622 §475(2)).',
        'Prevents sole directors from bypassing dual-signatory checks via single-member corporate vehicles.',
        'Violative appointments are void ab initio and subject to recurring statutory penalties.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-hk-cap622-475',
          sourceTitle: 'Companies Ordinance (Cap. 622) - Section 475: Restrictions on sole director being secretary',
          authority: 'Hong Kong Companies Registry',
          regulatorAcronym: 'CR',
          effectiveDate: '2014-03-03',
          sourceUrl: 'https://www.elegislation.gov.hk/hk/cap622!en@2024-01-01',
          excerpt: 'Section 475(2): A private company having only one director must not have as secretary of the company a body corporate the sole director of which is the sole director of the company.',
          highlightedTerms: ['must not have as secretary of the company a body corporate', 'the sole director of which is the sole director of the company'],
          sha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          relevanceScore: 99,
          relevanceTag: 'Strict Statutory Prohibition'
        }
      ]
    },

    // Q2 x SG
    'q-2_SG': {
      complianceStatus: 'prohibited',
      statusBadgeLabel: 'Double Layer Prohibition',
      answerMarkdown: `### Republic of Singapore: Dual Statutory Barrier Against Sole Director Self-Appointment

Singapore law establishes a comprehensive dual-layer statutory prohibition:

1. **First Barrier (Corporate Body Ineligibility)**: Because §171(1AA) prohibits corporate bodies from being appointed as secretaries, sole directors cannot circumvent the rules through an interposed corporate vehicle.
2. **Second Barrier (Natural Person Sole Director Restriction)**: Section 171(1E) expressly provides that a sole director of a company **shall not also act or be appointed as the secretary of the company**.
3. **Dual Execution Invalidation**: Under Section 171(2), any statutory document requiring concurrent execution by both a director and a secretary cannot be executed by the same individual acting in both capacities.`,
      keyTakeaways: [
        'Section 171(1AA) prevents body corporate appointments.',
        'Section 171(1E) expressly bars sole directors from acting as natural person secretary.',
        'Dual-signature documents executed in both capacities are legally ineffective.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-sg-ca1967-171-1e',
          sourceTitle: 'Singapore Companies Act 1967 Section 171(1E) & (2)',
          authority: 'ACRA',
          regulatorAcronym: 'ACRA',
          effectiveDate: 'Rev. 2020',
          sourceUrl: 'https://sso.agc.gov.sg/Act/CoA1967#pr171-',
          excerpt: 'Section 171(1E): A sole director of a company shall not also act or be appointed as the secretary of the company. Subsection (2): A provision requiring or authorising a thing to be done by or to a director and the secretary shall not be satisfied by its being done by or to the same person acting both as director and as, or in place of, the secretary.',
          highlightedTerms: ['shall not also act or be appointed as the secretary', 'shall not be satisfied by its being done by or to the same person'],
          sha256: '999888777666555444333222111000aaabbbcccdddeeefff1112223334445556',
          relevanceScore: 98,
          relevanceTag: 'Dual Mandatory Statutory Restriction'
        }
      ]
    },

    // Q2 x UK
    'q-2_UK': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Procedural Deed Invalidation Restriction',
      answerMarkdown: `### United Kingdom: Prohibition of Twin Acts on Deeds Execution

Section 280 of the UK Companies Act 2006 (CA 2006 §280) restricts dual-capacity legal execution:

1. **Statutory Deed Protection**: Where legal deeds or statutory documents require execution by both a director and a secretary, the requirement **is not satisfied by its being executed by the same person acting both as director and secretary** (or authorized signatory for a corporate secretary).
2. **Sole Director Execution Alternative**: Private companies with sole directors can bypass secretarial execution by executing deeds under Section 44(2)(b) (signed by the sole director in the presence of an independent witness).`,
      keyTakeaways: [
        'CA 2006 §280 prevents identical individual executing deeds concurrently as director and secretary.',
        'Sole directors may execute deeds under §44(2)(b) in the presence of an independent witness.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-uk-ca2006-280',
          sourceTitle: 'UK Companies Act 2006 - Section 280: Prohibition of twin acts',
          authority: 'Companies House',
          regulatorAcronym: 'Companies House',
          effectiveDate: '2006-11-08',
          sourceUrl: 'https://www.legislation.gov.uk/ukpga/2006/46/section/280',
          excerpt: 'Section 280: A provision requiring or authorising a thing to be done by or to a director and the secretary is not satisfied by its being done by or to the same person acting both as director and as, or in place of, the secretary.',
          highlightedTerms: ['is not satisfied by its being done by or to the same person', 'acting both as director and as secretary'],
          sha256: 'abc123def45678901234567890abcdef1234567890abcdef1234567890abcdef',
          relevanceScore: 95,
          relevanceTag: 'Procedural Invalidation'
        }
      ]
    },

    // Q2 x US
    'q-2_US': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Permitted in Delaware, Restrained in SOX',
      answerMarkdown: `### United States (Delaware DGCL): Permitted at State Law; Constrained by SEC & SOX

1. **State Corporate Law Flexibility (DGCL §142(a))**: Delaware General Corporation Law specifies that any number of offices may be held by the same person unless prohibited by corporate bylaws. Consequently, a sole director may serve simultaneously as President, Treasurer, and Secretary.
2. **Federal Securities & Exchange Governance**: For public reporting companies or institutions raising capital, Sarbanes-Oxley Act §404 and SEC/NYSE listing rules mandate segregation of key functions and independent oversight, effectively precluding single-person governance.`,
      keyTakeaways: [
        'DGCL §142(a) permits one person to hold multiple executive offices.',
        'Public entities remain bound by SEC and Sarbanes-Oxley governance separation rules.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-us-dgcl-142a',
          sourceTitle: 'Delaware General Corporation Law §142(a)',
          authority: 'Delaware SOS',
          regulatorAcronym: 'Delaware SOS',
          effectiveDate: 'Consolidated 2024',
          sourceUrl: 'https://delcode.delaware.gov/title8/c001/sc04/',
          excerpt: 'DGCL §142(a): Any number of offices may be held by the same person unless the certificate of incorporation or bylaws otherwise provide.',
          highlightedTerms: ['Any number of offices may be held by the same person'],
          sha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          relevanceScore: 93,
          relevanceTag: 'Statutory Authorization'
        }
      ]
    },

    // Q3 x HK
    'q-3_HK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: '15-Day CR Filing + TCSP Mandatory Licence',
      answerMarkdown: `### Hong Kong SAR: 15-Day Statutory Notification & Cap. 615 TCSP Licensing Regime

1. **15-Day Statutory Notification Period**:
   - Notice of appointment, cessation, or change of particulars of a company secretary must be delivered to the Companies Registry within **15 days** using Form **ND2A** or **ND2B** [Cap. 622 §645].
   - Failure to file within the statutory timeframe constitutes an offense punishable by level 3 fines and daily default penalties.
2. **TCSP Licensing Regime (Cap. 615 Part 5A)**:
   - Under Section 53G of the Anti-Money Laundering and Counter-Terrorist Financing Ordinance (Cap. 615), providing company secretarial or registered office services by way of business requires a **TCSP Licence** issued by the Registrar of Companies.
   - Licensees must satisfy stringent Fit and Proper criteria, maintain customer due diligence records, and conduct transaction screening. Operating without a license carries maximum penalties of HK$100,000 fine and 6 months imprisonment.`,
      keyTakeaways: [
        'Deliver Form ND2A/ND2B to Companies Registry within 15 days.',
        'Providing commercial services requires a Cap. 615 TCSP licence.',
        'Unlicensed practice carries penalties up to HK$100,000 fine and 6 months imprisonment.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-hk-nd2a-cap622',
          sourceTitle: 'Cap. 622 Companies Ordinance - Section 645 & Companies Registry Guidance Note 2/2023',
          authority: 'Companies Registry',
          regulatorAcronym: 'CR',
          effectiveDate: '2023-04-01',
          sourceUrl: 'https://www.cr.gov.hk/en/services/specified-forms.htm',
          excerpt: 'Section 645: A company must, within 15 days after an appointment or cessation of a secretary or director, file a notice in specified form ND2A with the Registrar.',
          highlightedTerms: ['within 15 days after an appointment or cessation', 'form ND2A'],
          sha256: '555444333222111000fffdddeeecccbbbaaa999888777666555444333222111000',
          relevanceScore: 99,
          relevanceTag: 'Statutory Filing Deadline'
        },
        {
          citationId: 'cit-hk-tcsp-guideline',
          sourceTitle: 'Guideline on Compliance of Anti-Money Laundering Requirements for Trust or Company Service Providers',
          authority: 'Companies Registry Registry for TCSPs',
          regulatorAcronym: 'CR',
          effectiveDate: '2023-06-01',
          sourceUrl: 'https://www.tcsp.cr.gov.hk/tcspls/index',
          excerpt: 'Guideline §3.2: Licensed TCSPs must perform customer due diligence (CDD) before establishing business relationships and report suspicious transactions to JFIU without delay.',
          highlightedTerms: ['customer due diligence', 'Licensed TCSPs must'],
          sha256: '111222333444555666777888999000aaabbbcccdddeeefff1234567890abcdef',
          relevanceScore: 96,
          relevanceTag: 'AML/CFT Compliance Mandate'
        }
      ]
    },

    // Q3 x SG
    'q-3_SG': {
      complianceStatus: 'conditional',
      statusBadgeLabel: '14-Day BizFile+ & ACRA CSP Bill Mandatory Registration',
      answerMarkdown: `### Republic of Singapore: 14-Day BizFile+ Filing & ACRA CSP Act 2024 Regime

1. **14-Day ACRA Filing Timeline**:
   - Pursuant to Section 173 of the Companies Act 1967, appointment, resignation, or removal of a company secretary must be lodged electronically via ACRA BizFile+ within **14 days**.
2. **Corporate Service Providers Act 2024 (CSP Act)**:
   - In 2024, Singapore enacted the CSP Act to enhance AML/CFT supervision over corporate secretarial entities.
   - All entities providing company secretary or registered office services in Singapore must register as Registered Corporate Service Providers (Registered CSPs), and their senior executives must register as Qualified Individuals (QIs).
   - Penalties for AML breaches and failure to verify beneficial ownership have been increased to SGD 100,000 alongside potential license revocation.`,
      keyTakeaways: [
        'Lodge secretarial appointments or changes via ACRA BizFile+ within 14 days.',
        'The CSP Act 2024 strengthens AML/CFT compliance obligations for registered service providers.',
        'Non-compliance with AML due diligence thresholds carries fines up to SGD 100,000.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-sg-acra-173',
          sourceTitle: 'Singapore Companies Act 1967 - Section 173: Registers of directors, secretaries, auditors',
          authority: 'ACRA',
          regulatorAcronym: 'ACRA',
          effectiveDate: 'Rev. 2020',
          sourceUrl: 'https://sso.agc.gov.sg/Act/CoA1967#pr173-',
          excerpt: 'Section 173(6): Notice in the prescribed form of the appointment of a secretary must be lodged with the Registrar within 14 days after the appointment.',
          highlightedTerms: ['within 14 days after the appointment', 'prescribed form'],
          sha256: '9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
          relevanceScore: 98,
          relevanceTag: 'Statutory Filing Deadline'
        }
      ]
    },

    // Q3 x UK
    'q-3_UK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: '14-Day Form AP04 & ECCTA ACSP Authorization',
      answerMarkdown: `### United Kingdom: 14-Day Companies House Notification & ECCTA ACSP Regime

1. **14-Day Notification Deadline**:
   - Appointment of individual secretaries requires Form AP03; corporate secretaries require Form **AP04**. Notices of change require Form CH03/CH04 within **14 days** of the change.
2. **Authorised Corporate Service Provider (ACSP) Regime**:
   - Under the Economic Crime and Corporate Transparency Act 2023 (ECCTA), third-party secretarial firms filing statutory submissions on behalf of clients must be verified as **Authorised Corporate Service Providers (ACSPs)**.
   - ACSPs must be supervised by an AML supervisory body (such as ICAEW, ACCA, or HMRC) and assume legal responsibility for verifying client beneficial owners.`,
      keyTakeaways: [
        'Submit Form AP04 to Companies House within 14 days for corporate secretary appointments.',
        'Filing on behalf of clients under ECCTA 2023 requires verified ACSP status.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-uk-ap04-ca2006',
          sourceTitle: 'Companies Act 2006 Section 276 & Companies House Guidance (Form AP04)',
          authority: 'Companies House',
          regulatorAcronym: 'Companies House',
          effectiveDate: 'Consolidated 2024',
          sourceUrl: 'https://www.gov.uk/government/publications/appoint-a-corporate-secretary-ap04',
          excerpt: 'Section 276(1): Notice of appointment of a secretary must be given to the registrar within 14 days of the appointment.',
          highlightedTerms: ['within 14 days of the appointment', 'Notice of appointment of a secretary'],
          sha256: '1234432112344321123443211234432112344321123443211234432112344321',
          relevanceScore: 97,
          relevanceTag: 'Filing Statutory Window'
        }
      ]
    },

    // Q3 x US
    'q-3_US': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Annual Franchise Report & FinCEN BOI Reporting',
      answerMarkdown: `### United States: Annual Franchise Tax Report & FinCEN Beneficial Ownership Reporting

1. **Franchise Tax Filing Cadence**:
   - Delaware corporations update current officer and director rosters annually via the **Annual Franchise Tax Report due on or before March 1** each year. Immediate event-driven filings are not required for internal officer updates.
2. **FinCEN Corporate Transparency Act (CTA) Mandates**:
   - Under the Corporate Transparency Act (CTA), entities must file Beneficial Ownership Information (BOI) reports with the Financial Crimes Enforcement Network (FinCEN). Third-party formations agents and secretaries assisting with entity organization may be classified as "Company Applicants" with statutory reporting accountability.`,
      keyTakeaways: [
        'Annual Franchise Tax Report updates current officer roster by March 1 annually.',
        'Commercial registered agents must comply with DGCL §132 statutory criteria.',
        'Adhere to FinCEN BOI reporting rules with statutory duties for company applicants.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-us-del-annual-tax',
          sourceTitle: 'Delaware Code Title 8 §502: Annual franchise tax report',
          authority: 'Delaware Division of Corporations',
          regulatorAcronym: 'Delaware SOS',
          effectiveDate: 'Consolidated 2024',
          sourceUrl: 'https://delcode.delaware.gov/title8/c005/index.html',
          excerpt: 'Section 502(a): Annually on or before March 1, every corporation shall file an annual franchise tax report stating the names and addresses of all the directors and officers.',
          highlightedTerms: ['names and addresses of all the directors and officers', 'annual franchise tax report'],
          sha256: '777888999000aaabbbcccdddeeefff111222333444555666777888999000111222',
          relevanceScore: 94,
          relevanceTag: 'Annual Governance Mandate'
        }
      ]
    }
  }
};

// Session 2: Cloud Outsourcing & Recovery Time Objective (HKMA SA-2 vs. MAS 655)
export const initialMatrixSession2: MatrixSessionState = {
  sessionId: 'matrix-sess-cloud-sa2',
  sessionTitle: 'Cloud Outsourcing Audit Rights & RTO Benchmark (HKMA vs. MAS vs. FCA vs. SEC)',
  activeQuestionIndex: 0,
  activeJurisdictionCode: 'HK',
  createdAt: new Date().toISOString().slice(0, 10) + ' 09:15:00 UTC',
  updatedAt: new Date().toISOString().slice(0, 10) + ' 11:40:00 UTC',
  creator: 'Ivan Choy (Lead Compliance Officer)',
  isSaved: false,
  isLoading: false,
  questions: [
    {
      questionId: 'q-cloud-1',
      questionText: 'What are the mandatory contractual inspection and multi-tier subcontracting audit rights for cloud service providers?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] MAS Notice 655 requires financial institutions to retain direct physical inspection rights across multi-tier subcontractors; HKMA SPM SA-2 adopts a risk-based approach, permitting certified independent third-party assurance reports (e.g. SOC 2 Type II / ISO 27001) combined with periodic gap analysis as an acceptable alternative, reducing friction in hyperscaler cloud negotiations.'
    },
    {
      questionId: 'q-cloud-2',
      questionText: 'What explicit Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) are prescribed for critical banking operations?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] MAS establishes a rigid benchmark: unscheduled cumulative outage for each critical system must not exceed 4 hours within any rolling 12-month period, and single-incident RTO must be within 4 hours. In contrast, HKMA SPM OR-2 requires institutions to define board-approved tolerable downtime through Business Impact Analysis (BIA), emphasizing extreme but plausible scenario recovery.'
    }
  ],
  jurisdictions: [
    { code: 'HK', name: 'Hong Kong', regulatorAcronym: 'HKMA', complianceStatus: 'compliant' },
    { code: 'SG', name: 'Singapore', regulatorAcronym: 'MAS', complianceStatus: 'conditional' },
    { code: 'UK', name: 'United Kingdom', regulatorAcronym: 'FCA / PRA', complianceStatus: 'compliant' },
    { code: 'US', name: 'United States', regulatorAcronym: 'SEC / OCC', complianceStatus: 'conditional' }
  ],
  matrixCells: {
    'q-cloud-1_HK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: 'Flexible Pooled & SOC 2 Audits Allowed',
      answerMarkdown: `### Hong Kong Monetary Authority (HKMA SPM SA-2): Subcontracting Audits & Pooled Audits

Under HKMA Supervisory Policy Manual module SA-2 ("Outsourcing"):
1. **Multi-tier Subcontracting Oversight**: Authorized Institutions (AIs) must obligate Cloud Service Providers (CSPs) to provide timely advance written notification prior to material subcontracting.
2. **Audit Right Alternatives**: Recognizing the impracticality of physical data center audits across hyperscalers, HKMA explicitly permits **Pooled Audits** (joint independent third-party audits commissioned by peer institutions) and reliance on certified **SOC 2 Type II / ISO 27017 reports** [HKMA SPM SA-2 §4.3].`,
      keyTakeaways: [
        'Permits certified SOC 2 Type II assurance reports in lieu of recurring physical facility inspections.',
        'Supports peer pooled audits to alleviate vendor negotiation friction.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-hkma-sa2-audit',
          sourceTitle: 'HKMA Supervisory Policy Manual SPM SA-2: Outsourcing §4.3',
          authority: 'Hong Kong Monetary Authority',
          regulatorAcronym: 'HKMA',
          effectiveDate: '2023-11-15',
          sourceUrl: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/supervisory-policy-manual/',
          excerpt: 'SPM SA-2 §4.3.4: An Authorized Institution may rely on pooled audits or independent third-party audit reports (such as SOC 2 Type II) provided that the scope adequately covers the institution’s specific security requirements.',
          highlightedTerms: ['pooled audits', 'independent third-party audit reports', 'SOC 2 Type II'],
          sha256: '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
          relevanceScore: 97,
          relevanceTag: 'Supervisory Guidance'
        }
      ]
    },
    'q-cloud-1_SG': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Mandatory Contractual Multi-Tier Audit Rights',
      answerMarkdown: `### Monetary Authority of Singapore (MAS Notice 655 / TRM Guidelines): Subcontractor Audit Rights

Pursuant to MAS Notice 655 and the MAS Guidelines on Outsourcing:
1. **Unrestricted Inspection & Audit Access**: Contracts must secure unrestricted audit access rights for the financial institution, its external auditors, and MAS itself across critical subcontractors.
2. **Material Subcontracting Prior Consent**: Any subcontracting of material outsourcing services requires prior written consent from the financial institution, with non-compliance constituting a regulatory breach.`,
      keyTakeaways: [
        'Contracts must stipulate inspection rights for MAS and institutions over subcontractors.',
        'Public cloud negotiations require specific contractual supervisory covenants.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-mas-notice655',
          sourceTitle: 'MAS Notice 655: Cyber Hygiene & Guidelines on Outsourcing §5.8',
          authority: 'Monetary Authority of Singapore',
          regulatorAcronym: 'MAS',
          effectiveDate: '2022-07-01',
          sourceUrl: 'https://www.mas.gov.sg/regulation/guidelines/guidelines-on-outsourcing',
          excerpt: 'Section 5.8: A financial institution must ensure that the outsourcing agreement stipulates the right of the FI and MAS to inspect and audit any sub-contractor providing services in connection with a material outsourcing arrangement.',
          highlightedTerms: ['right of the FI and MAS to inspect and audit any sub-contractor', 'material outsourcing arrangement'],
          sha256: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
          relevanceScore: 99,
          relevanceTag: 'Enforceable Supervisory Notice'
        }
      ]
    },
    'q-cloud-1_UK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: 'PRA SS2/21 Outsourcing Standard Compliance',
      answerMarkdown: `### United Kingdom (PRA SS2/21 & FCA FG16/5): Material Outsourcing & Subcontracting Transparency

The Prudential Regulation Authority (PRA) under Supervisory Statement SS2/21 mandates concentration risk assessments for material cloud deployments and authorizes third-party pooled audits and certifications, harmonizing with the EU Digital Operational Resilience Act (DORA).`,
      keyTakeaways: ['Complies with PRA SS2/21 outsourcing and third-party risk management standards.'],
      verifiedCitations: [
        {
          citationId: 'cit-pra-ss221',
          sourceTitle: 'Bank of England PRA Supervisory Statement SS2/21',
          authority: 'Prudential Regulation Authority',
          regulatorAcronym: 'PRA / FCA',
          effectiveDate: '2022-03-31',
          sourceUrl: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/outsourcing-and-third-party-risk-management-ss',
          excerpt: 'PRA SS2/21 §5.12: Firms should ensure that the written agreement covers the conditions under which sub-outsourcing can take place.',
          highlightedTerms: ['written agreement covers the conditions under which sub-outsourcing can take place'],
          sha256: '33445566778899001122aabbccddeeff33445566778899001122aabbccddeeff',
          relevanceScore: 94,
          relevanceTag: 'Prudential Standard'
        }
      ]
    },
    'q-cloud-1_US': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Interagency Guidance on Third-Party Relationships',
      answerMarkdown: `### United States (Fed, FDIC, OCC Interagency Guidance): Third-Party Lifecycle Governance

The Interagency Guidance on Third-Party Relationships requires banking organizations to maintain robust diligence, continuous monitoring, and step-in inspection rights throughout third-party and fourth-party lifecycle engagements.`,
      keyTakeaways: ['Governed by Federal Reserve, FDIC, and OCC Interagency Guidance.'],
      verifiedCitations: [
        {
          citationId: 'cit-us-interagency-2023',
          sourceTitle: 'Interagency Guidance on Third-Party Relationships: Risk Management',
          authority: 'Federal Reserve / FDIC / OCC',
          regulatorAcronym: 'Fed / OCC',
          effectiveDate: '2023-06-06',
          sourceUrl: 'https://www.federalreserve.gov/supervisionreg/srletters/SR2304.htm',
          excerpt: 'Guidance §II.C: The banking organization should understand the nature of any subcontracting arrangements and verify that the third party maintains sufficient oversight.',
          highlightedTerms: ['understand the nature of any subcontracting arrangements', 'sufficient oversight'],
          sha256: '55667788990011223344aabbccddeeff55667788990011223344aabbccddeeff',
          relevanceScore: 91,
          relevanceTag: 'Federal Supervisory Guidance'
        }
      ]
    },
    'q-cloud-2_HK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: 'Proportionate BIA & SPM OR-2 Principles',
      answerMarkdown: `### Hong Kong SAR: BIA-Driven Risk-Based Recovery Time Objectives (SPM OR-2)

HKMA does not impose a single rigid numerical hour limit across all operations. Instead, SPM OR-2 ("Operational Resilience") requires institutions to perform comprehensive Business Impact Analysis (BIA), setting board-approved tolerable downtime metrics for critical operations.`,
      keyTakeaways: ['Defines board-approved disruption tolerances under HKMA SPM OR-2.'],
      verifiedCitations: [
        {
          citationId: 'cit-hkma-or2-rto',
          sourceTitle: 'HKMA SPM OR-2: Operational Resilience & Business Continuity',
          authority: 'Hong Kong Monetary Authority',
          regulatorAcronym: 'HKMA',
          effectiveDate: '2023-05-20',
          sourceUrl: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/supervisory-policy-manual/',
          excerpt: 'SPM OR-2 §3.2: Institutions must define severe but plausible scenarios and ensure critical operations recover within tolerance limits.',
          highlightedTerms: ['severe but plausible scenarios', 'recover within tolerance limits'],
          sha256: '77889900112233445566aabbccddeeff77889900112233445566aabbccddeeff',
          relevanceScore: 95,
          relevanceTag: 'Regulatory Standard'
        }
      ]
    },
    'q-cloud-2_SG': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Strict 4-Hour Unscheduled Downtime Cap',
      answerMarkdown: `### Republic of Singapore: Mandatory 4-Hour Maximum Outage Ceiling (MAS Notice 644/655)

MAS mandates that unscheduled downtime for any critical IT system must not exceed an aggregate of 4 hours within any rolling 12-month period, and single-incident RTO must be strictly capped within 4 hours.`,
      keyTakeaways: [
        'Cumulative unscheduled downtime is capped at 4 hours across any rolling 12-month period.',
        'Single major incident RTO must be controlled within 4 hours.'
      ],
      verifiedCitations: [
        {
          citationId: 'cit-mas-notice644',
          sourceTitle: 'MAS Notice 644: Technology Risk Management §4.1',
          authority: 'Monetary Authority of Singapore',
          regulatorAcronym: 'MAS',
          effectiveDate: '2021-01-18',
          sourceUrl: 'https://www.mas.gov.sg/regulation/notices/notice-644',
          excerpt: 'Section 4.1: The unscheduled downtime for each critical system must not exceed a total of 4 hours within any period of 12 continuous months.',
          highlightedTerms: ['unscheduled downtime', 'must not exceed a total of 4 hours', 'within any period of 12 continuous months'],
          sha256: '99001122334455667788aabbccddeeff99001122334455667788aabbccddeeff',
          relevanceScore: 99,
          relevanceTag: 'Statutory Quantitative Mandate'
        }
      ]
    },
    'q-cloud-2_UK': {
      complianceStatus: 'compliant',
      statusBadgeLabel: 'Impact Tolerances Standard (PRA SS1/21)',
      answerMarkdown: `### United Kingdom: Operational Resilience & Impact Tolerances (PRA SS1/21)

Under PRA SS1/21, firms must set specific, quantifiable Impact Tolerances for every Important Business Service, defining the maximum tolerable disruption period and submitting annual self-assessments to regulators.`,
      keyTakeaways: ['Sets explicit impact tolerances emphasizing extreme but plausible scenario recovery.'],
      verifiedCitations: [
        {
          citationId: 'cit-pra-ss121',
          sourceTitle: 'PRA SS1/21 Operational Resilience: Impact Tolerances for Important Business Services',
          authority: 'PRA',
          regulatorAcronym: 'PRA',
          effectiveDate: '2022-03-31',
          sourceUrl: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss',
          excerpt: 'SS1/21 §2.3: Firms must set impact tolerances at the first point at which intolerable harm would be caused to consumers or market stability.',
          highlightedTerms: ['set impact tolerances', 'intolerable harm would be caused'],
          sha256: 'bbccddeeff00112233445566778899aabbccddeeff00112233445566778899aa',
          relevanceScore: 93,
          relevanceTag: 'Prudential Rule'
        }
      ]
    },
    'q-cloud-2_US': {
      complianceStatus: 'conditional',
      statusBadgeLabel: 'Sound Practices for Operational Resilience',
      answerMarkdown: `### United States: Same-Day Recovery for Critical Payment & Clearing Systems

Federal banking regulators enforce the Sound Practices Paper for core clearing operations (e.g. Fedwire), requiring same-day recovery capabilities while allowing institutions to establish FFIEC-aligned metrics for other operations.`,
      keyTakeaways: ['Mandates same-day recovery for critical financial market infrastructures under FFIEC rules.'],
      verifiedCitations: [
        {
          citationId: 'cit-fed-sound-practices',
          sourceTitle: 'Interagency Paper on Sound Practices to Strengthen Operational Resilience',
          authority: 'Federal Reserve / OCC / FDIC',
          regulatorAcronym: 'Federal Reserve',
          effectiveDate: '2020-10-30',
          sourceUrl: 'https://www.federalreserve.gov/supervisionreg/srletters/SR2024.htm',
          excerpt: 'Sound Practices §III: For critical operations, firms should establish recovery time objectives that reflect the potential impact on financial stability.',
          highlightedTerms: ['recovery time objectives that reflect the potential impact on financial stability'],
          sha256: 'ddeeff00112233445566778899aabbccddee00112233445566778899aabbccddee',
          relevanceScore: 90,
          relevanceTag: 'Federal Guidance'
        }
      ]
    }
  }
};

// Function to generate dynamic sessions when user runs matrix research
export function createDynamicMatrixSession(
  questions: string[],
  selectedJurisdictionCodes: string[],
  customTitle?: string
): MatrixSessionState {
  const chosenJurisdictions = ALL_AVAILABLE_JURISDICTIONS.filter((j) =>
    selectedJurisdictionCodes.includes(j.code)
  );
  if (chosenJurisdictions.length === 0) {
    chosenJurisdictions.push(...ALL_AVAILABLE_JURISDICTIONS.slice(0, 3));
  }

  const generatedQuestions: MatrixQuestionItem[] = questions.map((q, idx) => {
    return {
      questionId: `dyn-q-${idx + 1}-${Date.now()}`,
      questionText: q,
      crossCountrySummary: `[Cross-Jurisdictional Comparison (Question ${idx + 1})] Regarding "${q.slice(0, 40)}...", the selected supervisory authorities (${chosenJurisdictions.map((j) => j.name).join(', ')}) demonstrate distinct regulatory approaches. Compliance teams should evaluate cross-border data transfer covenants, licensing prerequisites, and statutory notification deadlines.`
    };
  });

  const matrixCells: { [key: string]: MatrixCellData } = {};

  const complianceStatusOptions: MatrixComplianceStatus[] = [
    'compliant',
    'conditional',
    'prohibited',
    'inconclusive'
  ];

  generatedQuestions.forEach((qItem, qIdx) => {
    chosenJurisdictions.forEach((jur, jIdx) => {
      const cellKey = `${qItem.questionId}_${jur.code}`;
      const status: MatrixComplianceStatus =
        (qIdx + jIdx) % 3 === 0
          ? 'compliant'
          : (qIdx + jIdx) % 3 === 1
          ? 'conditional'
          : 'prohibited';

      const statusBadgeLabel =
        status === 'compliant'
          ? 'Fully Permitted / Clear Statutory Route'
          : status === 'conditional'
          ? 'Conditional / Specific Licencing & Notice Required'
          : status === 'prohibited'
          ? 'Strict Prohibition / Significant Gap'
          : 'Inconclusive / Pending Supervisory Guidance';

      matrixCells[cellKey] = {
        complianceStatus: status,
        statusBadgeLabel,
        answerMarkdown: `### ${jur.name} (${jur.regulatorAcronym}) Compliance Assessment

Regarding query: "*${qItem.questionText}*":

1. **Supervisory Framework Position**: Regulators in ${jur.name} (${jur.regulatorAcronym}) maintain a ${status === 'compliant' ? 'statutorily permitted regime subject to standard compliance conditions' : status === 'conditional' ? 'conditional approval regime requiring prior notifications and licensed representatives' : 'rigorous supervisory posture with specific operational restrictions'}.
2. **Statutory Alignment**: Under applicable regulatory directives, institutions must substantiate local operational substance, beneficial ownership transparency, and risk governance benchmarks.
3. **Actionable Compliance Guidance**: Compliance teams should execute recurring quarterly reviews, maintain an updated register of controls, and submit mandatory regulatory filings within statutory notification deadlines.`,
        keyTakeaways: [
          `Evaluated as ${status.toUpperCase()} under current ${jur.regulatorAcronym} supervisory guidelines.`,
          `Institutions must execute internal gap analysis before deploying operational workflows.`,
          `Maintain comprehensive audit trails for periodic supervisory examination.`
        ],
        verifiedCitations: [
          {
            citationId: `cit-dyn-${jur.code}-${qIdx}-1`,
            sourceTitle: `${jur.regulatorAcronym} Statutory Code & Regulatory Directive (2025/2026 Consolidated)`,
            authority: jur.regulatorAcronym,
            regulatorAcronym: jur.regulatorAcronym,
            effectiveDate: '2025-06-01',
            sourceUrl: 'https://www.example.org/regulatory-gazette',
            excerpt: `Section ${(qIdx + 1) * 12}.4: Regulated entities operating in ${jur.name} must maintain documented evidence of compliance and report any material changes within statutory windows.`,
            highlightedTerms: ['must maintain documented evidence of compliance', 'statutory windows'],
            sha256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${qIdx}${jIdx}0`,
            relevanceScore: 92 + (qIdx % 7),
            relevanceTag: 'Official Statutory Authority'
          }
        ]
      };
    });
  });

  const title =
    customTitle ||
    (questions.length === 1
      ? `Cross-Border Matrix: ${questions[0].slice(0, 30)}...`
      : `${chosenJurisdictions.map((j) => j.code).join('/')} Regulatory Matrix Analysis (${questions.length} Questions)`);

  return {
    sessionId: `matrix-sess-${Date.now()}`,
    sessionTitle: title,
    activeQuestionIndex: 0,
    activeJurisdictionCode: chosenJurisdictions[0].code,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    creator: 'Ivan Choy (Lead Compliance Officer)',
    isSaved: false,
    questions: generatedQuestions,
    jurisdictions: chosenJurisdictions,
    matrixCells,
    isLoading: false
  };
}

// Session 3: Previous 7 Days (3 days ago)
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
export const initialMatrixSession3: MatrixSessionState = {
  ...initialMatrixSession2,
  sessionId: 'matrix-sess-stablecoin-reserves',
  sessionTitle: 'Fiat-Backed Stablecoin Reserve Assets & Custodial Safeguarding (MAS vs. HKMA vs. EU MiCA)',
  activeQuestionIndex: 0,
  activeJurisdictionCode: 'SG',
  createdAt: threeDaysAgo,
  updatedAt: threeDaysAgo,
  isSaved: false,
  questions: [
    {
      questionId: 'q-sc-1',
      questionText: 'What asset quality, duration, and liquidity requirements govern reserve backing assets for licensed single-currency stablecoins?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] Both MAS and HKMA require high-quality liquid assets (HQLA) consisting predominantly of cash, central bank reserves, or sovereign debt with maturity under 3 months. EU MiCA Title III additionally imposes credit institution deposit caps (minimum 30% held with independent credit institutions).'
    }
  ]
};

// Session 4: Other / Earlier History (20 days ago)
const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
export const initialMatrixSession4: MatrixSessionState = {
  ...initialMatrixSession1,
  sessionId: 'matrix-sess-genai-crossborder',
  sessionTitle: 'Generative AI Cross-Border Model Risk & Banking Secrecy Baselines',
  activeQuestionIndex: 0,
  activeJurisdictionCode: 'HK',
  createdAt: twentyDaysAgo,
  updatedAt: twentyDaysAgo,
  isSaved: false,
  questions: [
    {
      questionId: 'q-ai-1',
      questionText: 'What customer consent and data pseudonymization rules apply when financial data is routed to multi-tenant LLMs?',
      crossCountrySummary: '[Cross-Jurisdictional Analysis] Under HKMA SPM TM-E-1 and MAS AI Governance Guidelines, processing client identifiable financial information via multi-tenant public AI models without end-to-end tokenization or explicit consent is strictly prohibited under banking confidentiality statutes.'
    }
  ]
};

export const INITIAL_MATRIX_SESSIONS: MatrixSessionState[] = [
  initialMatrixSession1, // Saved: isSaved = true
  initialMatrixSession2, // Today: isSaved = false, updated today
  initialMatrixSession3, // Previous 7 Days: 3 days ago
  initialMatrixSession4  // Other: 20 days ago
];

