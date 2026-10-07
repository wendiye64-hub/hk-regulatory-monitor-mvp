import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const STORAGE_KEY = 'wizpresso_wizard_state_v2';

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  isEdited?: boolean;
}

export const STANDARD_COMPLIANCE_THEMES = [
  'Operational resilience and incident reporting',
  'Conduct and consumer protection',
  'AML/CFT and sanctions',
  'Data protection and cybersecurity',
  'AI governance and model risk',
  'Market conduct and listing rules',
  'Prudential and capital requirements',
];

export interface BusinessContextAnswers {
  primaryIndustry: string;      // 1. Primary Industry
  subSector: string;            // 2. Sub-sector
  companyAttribute: string;     // 3. Company Attribute (e.g., Licensed Entity, FinTech Innovator, Public Issuer)
  isRegulated: string;          // 4. Regulatory Status (e.g., Fully Regulated, In Application, Exempt)
  coreBusiness: string;         // 5. Core Business
  operatingModel: string;       // 6. Operating Model (e.g., B2B SaaS, Cross-Border Retail, Custody Platform)
  complianceThemes: string[];   // 7. Compliance Themes
}

export interface AIRationaleAnalysis {
  coreEntity: string;           // Entity Classification
  coreBoundary: string;         // Regulatory Perimeter
  jurisdictionInterplay: string;// Jurisdictional Interplay
  blindspots: string;           // Blindspots & Advisory
}

const DEFAULT_RATIONALE: AIRationaleAnalysis = {
  coreEntity:
    'Core Entity: Cross-border digital financial services and regulatory technology conglomerate. Operations encompass algorithmic decision engines, digital asset custody, and multi-jurisdiction payment clearing under tier-1 prudential supervision.',
  coreBoundary:
    'Regulatory Perimeter: Governed by systemic risk prevention and mandatory customer asset segregation. Core regimes include Operational Resilience (HKMA SPM OR-2, PRA SS1/21), Virtual Asset Service Provider licensing, and comprehensive AML/CTF disclosures.',
  jurisdictionInterplay:
    'Jurisdictional Interplay: Multilateral Memoranda of Understanding (MMoU) link APAC regulators (HKMA, SFC, MAS) with UK, US, and EU counterparts. Cloud concentration, cross-border data transfer, and major incidents require coordinated filings within statutory windows.',
  blindspots:
    'Advisory & Blindspots: Scrutinize non-traditional regulatory perimeters: Generative AI model explainability (HKMA SPM AI-1, EU AI Act), critical ICT third-party dependency, and mandatory ESG reporting to prevent supervisory sanctions.',
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'assistant',
    content:
      'Welcome to Regulatory Monitor Scoping. I am your AI Scope Analyst. To tailor your institutional compliance radar, I will evaluate 7 core business dimensions: Primary Industry, Sub-sector, Company Type, Regulatory Status, Core Business, Operating Model, and Priority Themes.\n\nWhat are your primary industry and key sub-sector (e.g., Financial Services & Banking, Virtual Assets & Web3, Payments & Settlement, or Enterprise SaaS)?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export const useWizardStore = defineStore('wizard', () => {
  // Modal visibility
  const isOpen = ref<boolean>(false);
  const currentStep = ref<1 | 2>(1);
  const step1SubPhase = ref<'chat' | 'jurisdictions'>('chat');

  // Async Analysis & Background State
  const isAnalyzing = ref<boolean>(false);
  const hasCompletedScoping = ref<boolean>(false);
  const toastMessage = ref<{ title: string; body: string; id: string } | null>(null);

  // Chat conversation state
  const chatMessages = ref<ChatMessage[]>([...INITIAL_MESSAGES]);
  const collectedAnswers = ref<BusinessContextAnswers>({
    primaryIndustry: '',
    subSector: '',
    companyAttribute: '',
    isRegulated: '',
    coreBusiness: '',
    operatingModel: '',
    complianceThemes: [],
  });
  const userAnswerCount = ref<number>(0);
  const progress = ref<number>(15); // Starts at 15% for initial prompt

  // Target Jurisdictions
  const selectedMarkets = ref<string[]>(['Hong Kong', 'Singapore']);

  // Detailed Scoping Inputs (Dual Input Profile)
  const companyBusiness = ref<string>(
    'We are a cross-border financial services institution and digital asset platform providing institutional custody, wealth management, and automated clearing services under SFC and HKMA oversight.'
  );
  const regulatoryFocus = ref<string>(
    'Mandatory operational resilience notification windows (HKMA SPM OR-2 / EU DORA), AML/CFT sanctions compliance, AI model governance (SPM AI-1), client asset segregation, and cloud outsourcing audit clauses.'
  );

  // Step 2 Recommended Regulators State
  const isRationaleExpanded = ref<boolean>(true);
  const aiRationale = ref<AIRationaleAnalysis>({ ...DEFAULT_RATIONALE });
  const followedRegulatorIds = ref<string[]>([
    'regl-001', // HKMA
    'regl-002', // SFC
    'regl-003', // MAS
    'regl-004', // FCA
    'regl-005', // SEC
    'regl-007', // PCPD
    'regl-012', // EBA
  ]);
  const searchQuery = ref<string>('');
  const selectedJurisdictionFilter = ref<string>('All');

  // Persistence logic
  const loadState = () => {
    try {
      // Clear legacy storage key if present
      localStorage.removeItem('wizpresso_wizard_state');

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.companyBusiness) companyBusiness.value = data.companyBusiness;
        if (data.regulatoryFocus) regulatoryFocus.value = data.regulatoryFocus;
        if (data.currentStep) currentStep.value = data.currentStep;
        if (data.step1SubPhase) step1SubPhase.value = data.step1SubPhase;
        if (typeof data.hasCompletedScoping === 'boolean') {
          hasCompletedScoping.value = data.hasCompletedScoping;
        }
        if (data.collectedAnswers) collectedAnswers.value = data.collectedAnswers;
        if (data.progress) progress.value = data.progress;
        if (data.userAnswerCount) userAnswerCount.value = data.userAnswerCount;
        if (data.selectedMarkets) selectedMarkets.value = data.selectedMarkets;
        if (data.followedRegulatorIds) followedRegulatorIds.value = data.followedRegulatorIds;
        if (data.aiRationale) aiRationale.value = data.aiRationale;
        if (Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
          chatMessages.value = data.chatMessages;
        }
      }
    } catch (e) {
      console.warn('Failed to parse wizard store state from localStorage', e);
    }
  };

  const persistState = () => {
    try {
      const data = {
        companyBusiness: companyBusiness.value,
        regulatoryFocus: regulatoryFocus.value,
        currentStep: currentStep.value,
        step1SubPhase: step1SubPhase.value,
        hasCompletedScoping: hasCompletedScoping.value,
        collectedAnswers: collectedAnswers.value,
        progress: progress.value,
        userAnswerCount: userAnswerCount.value,
        selectedMarkets: selectedMarkets.value,
        followedRegulatorIds: followedRegulatorIds.value,
        aiRationale: aiRationale.value,
        chatMessages: chatMessages.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist wizard state to localStorage', e);
    }
  };

  // Check how many of the 7 info items are collected
  const collectedDimensionsCount = computed(() => {
    let count = 0;
    const a = collectedAnswers.value;
    if (a.primaryIndustry.trim()) count++;
    if (a.subSector.trim()) count++;
    if (a.companyAttribute.trim()) count++;
    if (a.isRegulated.trim()) count++;
    if (a.coreBusiness.trim()) count++;
    if (a.operatingModel.trim()) count++;
    if (a.complianceThemes.length > 0) count++;
    return count;
  });

  const canShowNoMoreButton = computed(() => {
    return userAnswerCount.value >= 1;
  });

  const isInfoSufficient = computed(() => {
    return collectedDimensionsCount.value >= 5 || userAnswerCount.value >= 3;
  });

  // Action: User submits chat input
  const sendUserMessage = (text: string) => {
    if (!text.trim()) return;

    userAnswerCount.value++;
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    chatMessages.value.push(userMsg);

    // Heuristic entity extraction to populate the 7 items
    const lower = text.toLowerCase();

    // 1. Primary Industry
    if (!collectedAnswers.value.primaryIndustry) {
      if (lower.includes('bank') || lower.includes('finance') || lower.includes('financial')) {
        collectedAnswers.value.primaryIndustry = 'Financial Services & Banking';
      } else if (lower.includes('crypto') || lower.includes('virtual asset') || lower.includes('web3') || lower.includes('token')) {
        collectedAnswers.value.primaryIndustry = 'Virtual Assets & Web3 Finance';
      } else if (lower.includes('tech') || lower.includes('software') || lower.includes('saas')) {
        collectedAnswers.value.primaryIndustry = 'Technology & Software';
      } else if (lower.includes('health') || lower.includes('pharma') || lower.includes('life science')) {
        collectedAnswers.value.primaryIndustry = 'Life Sciences & Healthcare';
      } else {
        collectedAnswers.value.primaryIndustry = text.slice(0, 35);
      }
    }

    // 2. Sub-sector
    if (!collectedAnswers.value.subSector) {
      if (lower.includes('wealth') || lower.includes('asset') || lower.includes('fund') || lower.includes('investment')) {
        collectedAnswers.value.subSector = 'Wealth & Asset Management';
      } else if (lower.includes('pay') || lower.includes('settlement') || lower.includes('remittance')) {
        collectedAnswers.value.subSector = 'Payments & Clearing';
      } else if (lower.includes('broker') || lower.includes('trading') || lower.includes('exchange') || lower.includes('market')) {
        collectedAnswers.value.subSector = 'Securities & Algorithmic Trading';
      } else {
        collectedAnswers.value.subSector = 'Digital Financial Infrastructure';
      }
    }

    // 3. Company Attribute
    if (lower.includes('license') || lower.includes('regulated') || lower.includes('public') || lower.includes('listed')) {
      collectedAnswers.value.companyAttribute = 'Licensed Financial Institution';
    } else if (lower.includes('startup') || lower.includes('fintech') || lower.includes('scaleup')) {
      collectedAnswers.value.companyAttribute = 'FinTech Innovator';
    } else if (!collectedAnswers.value.companyAttribute) {
      collectedAnswers.value.companyAttribute = 'Multinational Corporate Entity';
    }

    // 4. Regulated Status
    if (lower.includes('regulated') || lower.includes('authorized') || lower.includes('yes')) {
      collectedAnswers.value.isRegulated = 'Regulated (Prudential Supervision)';
    } else if (lower.includes('applying') || lower.includes('process') || lower.includes('pipeline')) {
      collectedAnswers.value.isRegulated = 'In Application';
    } else if (!collectedAnswers.value.isRegulated) {
      collectedAnswers.value.isRegulated = 'Regulated Entity';
    }

    // 5. Core Business
    if (!collectedAnswers.value.coreBusiness) {
      collectedAnswers.value.coreBusiness = text.length > 20 ? text.slice(0, 60) : 'Algorithmic trading & compliance workflow automation';
    }

    // 6. Operating Model
    if (lower.includes('b2b') || lower.includes('saas') || lower.includes('enterprise')) {
      collectedAnswers.value.operatingModel = 'B2B Enterprise Infrastructure';
    } else if (lower.includes('b2c') || lower.includes('retail') || lower.includes('consumer')) {
      collectedAnswers.value.operatingModel = 'B2C Direct Client Platform';
    } else if (!collectedAnswers.value.operatingModel) {
      collectedAnswers.value.operatingModel = 'Hybrid B2B / B2B2C Operations';
    }

    // 7. Compliance Themes
    const themesToAdd = new Set(collectedAnswers.value.complianceThemes);
    if (lower.includes('ai') || lower.includes('model') || lower.includes('machine learning')) {
      themesToAdd.add('AI governance and model risk');
    }
    if (lower.includes('aml') || lower.includes('sanction') || lower.includes('kyc') || lower.includes('laundering')) {
      themesToAdd.add('AML/CFT and sanctions');
    }
    if (lower.includes('privacy') || lower.includes('data') || lower.includes('cyber') || lower.includes('security')) {
      themesToAdd.add('Data protection and cybersecurity');
    }
    if (lower.includes('resilience') || lower.includes('dora') || lower.includes('outage') || lower.includes('bcp')) {
      themesToAdd.add('Operational resilience and incident reporting');
    }
    if (themesToAdd.size === 0) {
      themesToAdd.add('Operational resilience and incident reporting');
      themesToAdd.add('Conduct and consumer protection');
    }
    collectedAnswers.value.complianceThemes = Array.from(themesToAdd);

    // Calculate progress smoothly based on answered dimensions
    const count = collectedDimensionsCount.value;
    const targetProgress = Math.min(100, Math.round(15 + (count / 7) * 80));
    progress.value = Math.max(progress.value, targetProgress);

    // Generate smart context-aware assistant reply
    setTimeout(() => {
      let aiReply = '';
      if (userAnswerCount.value === 1) {
        aiReply = `Recorded institutional focus as "${collectedAnswers.value.primaryIndustry} - ${collectedAnswers.value.subSector}".\n\nNext: Does your institution hold regulatory licenses (e.g., HKMA, SFC, MAS, FCA, SEC)? What are your primary operating model and core services?`;
      } else if (userAnswerCount.value === 2) {
        aiReply = `Identified company attribute as "${collectedAnswers.value.companyAttribute}" with operating model "${collectedAnswers.value.operatingModel}".\n\nLastly: What are your priority compliance themes (e.g., AML/CTF, AI governance, cyber resilience, vendor outsourcing)? If complete, click "No more information" to proceed to jurisdiction selection.`;
      } else {
        progress.value = 95;
        aiReply = `Your institutional profile is complete across all 7 dimensions. Click "No more information" to select target jurisdictions and generate your regulatory scope.`;
      }

      chatMessages.value.push({
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      persistState();
    }, 450);

    persistState();
  };

  const recomputeProgress = () => {
    const count = collectedDimensionsCount.value;
    const targetProgress = Math.min(100, Math.round(15 + (count / 7) * 85));
    progress.value = Math.max(progress.value, targetProgress);
  };

  // Action: Edit an existing user message and re-extract business context
  const updateUserMessage = (messageId: string, newContent: string) => {
    const target = chatMessages.value.find((m) => m.id === messageId);
    if (!target || !newContent.trim()) return;

    target.content = newContent.trim();
    target.isEdited = true;

    // Re-evaluate entity extraction based on updated text
    const lower = newContent.toLowerCase();

    // 1. Primary Industry
    if (lower.includes('bank') || lower.includes('finance') || lower.includes('financial')) {
      collectedAnswers.value.primaryIndustry = 'Financial Services & Banking';
    } else if (lower.includes('crypto') || lower.includes('virtual asset') || lower.includes('web3') || lower.includes('token')) {
      collectedAnswers.value.primaryIndustry = 'Virtual Assets & Web3 Finance';
    } else if (lower.includes('tech') || lower.includes('software') || lower.includes('saas')) {
      collectedAnswers.value.primaryIndustry = 'Technology & Software';
    } else if (lower.includes('health') || lower.includes('pharma') || lower.includes('life science')) {
      collectedAnswers.value.primaryIndustry = 'Life Sciences & Healthcare';
    }

    // 2. Sub-sector
    if (lower.includes('wealth') || lower.includes('asset') || lower.includes('fund') || lower.includes('investment')) {
      collectedAnswers.value.subSector = 'Wealth & Asset Management';
    } else if (lower.includes('pay') || lower.includes('settlement') || lower.includes('remittance')) {
      collectedAnswers.value.subSector = 'Payments & Clearing';
    } else if (lower.includes('broker') || lower.includes('trading') || lower.includes('exchange') || lower.includes('market')) {
      collectedAnswers.value.subSector = 'Securities & Algorithmic Trading';
    }

    // 3. Company Attribute
    if (lower.includes('license') || lower.includes('regulated') || lower.includes('public') || lower.includes('listed')) {
      collectedAnswers.value.companyAttribute = 'Licensed Financial Institution';
    } else if (lower.includes('startup') || lower.includes('fintech') || lower.includes('scaleup')) {
      collectedAnswers.value.companyAttribute = 'FinTech Innovator';
    }

    // 4. Regulated Status
    if (lower.includes('regulated') || lower.includes('authorized') || lower.includes('yes')) {
      collectedAnswers.value.isRegulated = 'Regulated (Prudential Supervision)';
    } else if (lower.includes('applying') || lower.includes('process') || lower.includes('pipeline')) {
      collectedAnswers.value.isRegulated = 'In Application';
    }

    // 5. Core Business
    if (newContent.length > 15) {
      collectedAnswers.value.coreBusiness = newContent.slice(0, 80);
    }

    // 6. Operating Model
    if (lower.includes('b2b') || lower.includes('saas') || lower.includes('enterprise')) {
      collectedAnswers.value.operatingModel = 'B2B Enterprise Infrastructure';
    } else if (lower.includes('b2c') || lower.includes('retail') || lower.includes('consumer')) {
      collectedAnswers.value.operatingModel = 'B2C Direct Client Platform';
    }

    // 7. Compliance Themes
    const currentThemes = new Set(collectedAnswers.value.complianceThemes);
    if (lower.includes('ai') || lower.includes('model') || lower.includes('machine learning')) {
      currentThemes.add('AI governance and model risk');
    }
    if (lower.includes('aml') || lower.includes('sanction') || lower.includes('kyc') || lower.includes('laundering')) {
      currentThemes.add('AML/CFT and sanctions');
    }
    if (lower.includes('privacy') || lower.includes('data') || lower.includes('cyber') || lower.includes('security')) {
      currentThemes.add('Data protection and cybersecurity');
    }
    if (lower.includes('resilience') || lower.includes('dora') || lower.includes('outage') || lower.includes('bcp')) {
      currentThemes.add('Operational resilience and incident reporting');
    }
    if (currentThemes.size > 0) {
      collectedAnswers.value.complianceThemes = Array.from(currentThemes);
    }

    recomputeProgress();
    persistState();
  };

  // Action: Directly update collected business context answers
  const updateCollectedAnswers = (newAnswers: Partial<BusinessContextAnswers>) => {
    collectedAnswers.value = {
      ...collectedAnswers.value,
      ...newAnswers,
    };
    recomputeProgress();
    persistState();
  };

  // Action: User clicks "No more information" -> transition to Jurisdictions selector
  const triggerNoMoreInfo = () => {
    step1SubPhase.value = 'jurisdictions';
    progress.value = 100;
    persistState();
  };

  // Action: User confirms Jurisdictions -> trigger backend asynchronous analysis
  const confirmJurisdictionsAndStartScoping = (markets: string[]) => {
    selectedMarkets.value = markets.length > 0 ? markets : ['Hong Kong', 'Singapore'];
    isAnalyzing.value = true;
    persistState();

    // Dynamically customize the 4 paragraphs of AI Rationale based on collected answers & markets
    const industry = collectedAnswers.value.primaryIndustry || 'Financial Services & Technology';
    const marketsStr = selectedMarkets.value.join(', ');
    const themesStr = collectedAnswers.value.complianceThemes.join(', ') || 'Operational Resilience & Customer Protection';

    aiRationale.value = {
      coreEntity: `Core Entity: ${industry} organization operating across ${marketsStr}. Operating model centers on ${collectedAnswers.value.operatingModel || 'digital financial services'} subject to multi-jurisdiction prudential compliance and ongoing supervision.`,
      coreBoundary: `Regulatory Perimeter: Governed by systemic risk prevention, customer asset segregation, and strict adherence to ${themesStr}. Subject to statutory disclosure SLAs and third-party audit requirements.`,
      jurisdictionInterplay: `Jurisdictional Interplay: Regulators in ${marketsStr} maintain active information sharing and enforcement coordination under bilateral and multilateral pacts. Major incidents require synchronized filings within statutory SLA windows (4 to 24 hours).`,
      blindspots: `Advisory & Blindspots: Critical oversight required for third-party cloud concentration, algorithmic AI decision auditability, and overseas affiliate disclosures to ensure full jurisdictional coverage.`,
    };

    // Simulate backend asynchronous calculation (e.g. 2.4 seconds)
    setTimeout(() => {
      isAnalyzing.value = false;
      hasCompletedScoping.value = true;
      currentStep.value = 2; // Ready to open step 2

      // Show toast notification in bottom right
      toastMessage.value = {
        id: `toast-scoping-${Date.now()}`,
        title: 'AI Scoping Completed',
        body: `Regulatory scope analyzed for ${selectedMarkets.value.length} jurisdictions. Click avatar badge to review recommended regulators.`,
      };

      persistState();
    }, 2400);
  };

  // Action: Confirm Scoping Profile (Business + Focus + Markets) -> Move to Step 2 recommendations
  const confirmScopingAndOpenRecommendations = (
    business: string,
    focus: string,
    markets: string[],
    initialFollowIds?: string[]
  ) => {
    companyBusiness.value = business.trim();
    regulatoryFocus.value = focus.trim();
    selectedMarkets.value = markets.length > 0 ? markets : ['Hong Kong', 'Singapore'];
    if (initialFollowIds && initialFollowIds.length > 0) {
      followedRegulatorIds.value = Array.from(
        new Set([...followedRegulatorIds.value, ...initialFollowIds])
      );
    }

    // Map to collected answers for backwards compatibility
    collectedAnswers.value.coreBusiness = companyBusiness.value;
    collectedAnswers.value.complianceThemes = [
      'Operational resilience and incident reporting',
      'Conduct and consumer protection',
      'AML/CFT and sanctions',
      'Data protection and cybersecurity',
    ];

    isAnalyzing.value = true;
    persistState();

    const marketsStr = selectedMarkets.value.join(', ');

    aiRationale.value = {
      coreEntity: `Core Entity: Institutional organization operating across ${marketsStr}. Business model centers on ${companyBusiness.value.slice(0, 110)}... under active supervisory oversight.`,
      coreBoundary: `Regulatory Perimeter: Priority scope focused on: ${regulatoryFocus.value.slice(0, 130)}... Governed by mandatory incident response windows, statutory disclosures, and compliance audits.`,
      jurisdictionInterplay: `Jurisdictional Interplay: Multi-jurisdictional compliance active across ${marketsStr}. Regulators enforce synchronized incident notification rules, cross-border asset segregation, and reciprocal information sharing agreements.`,
      blindspots: `Advisory & Blindspots: Scrutinize third-party supplier dependencies, algorithmic risk controls, generative AI explainability, and localized reporting triggers across all target territories.`,
    };

    setTimeout(() => {
      isAnalyzing.value = false;
      hasCompletedScoping.value = true;
      currentStep.value = 2;

      toastMessage.value = {
        id: `toast-scoping-${Date.now()}`,
        title: 'Institutional Scoping Completed',
        body: `Evaluated ${selectedMarkets.value.length} jurisdictions. High-relation regulatory authorities recommended.`,
      };

      persistState();
    }, 700);
  };

  // Action: Open Step 2
  const openStep2 = () => {
    currentStep.value = 2;
    isOpen.value = true;
    persistState();
  };

  // Action: Reopen Wizard from avatar or menu
  const openWizard = () => {
    isOpen.value = true;
    if (hasCompletedScoping.value) {
      currentStep.value = 2;
    }
  };

  const closeWizard = () => {
    isOpen.value = false;
  };

  // Action: Toggle follow regulator in Step 2
  const toggleFollowRegulator = (regId: string) => {
    if (followedRegulatorIds.value.includes(regId)) {
      followedRegulatorIds.value = followedRegulatorIds.value.filter((id) => id !== regId);
    } else {
      followedRegulatorIds.value = [regId, ...followedRegulatorIds.value];
    }
    persistState();
  };

  // Action: Follow all regulators
  const followAllRegulators = (regIds: string[]) => {
    followedRegulatorIds.value = Array.from(
      new Set([...followedRegulatorIds.value, ...regIds])
    );
    persistState();
  };

  // Action: Finish Wizard
  const finishWizard = () => {
    isOpen.value = false;
    hasCompletedScoping.value = false; // clears badge once user successfully completes
    persistState();
  };

  // Initialize
  loadState();

  return {
    isOpen,
    currentStep,
    step1SubPhase,
    companyBusiness,
    regulatoryFocus,
    isAnalyzing,
    hasCompletedScoping,
    toastMessage,
    chatMessages,
    collectedAnswers,
    userAnswerCount,
    progress,
    canShowNoMoreButton,
    isInfoSufficient,
    selectedMarkets,
    isRationaleExpanded,
    aiRationale,
    followedRegulatorIds,
    searchQuery,
    selectedJurisdictionFilter,
    sendUserMessage,
    updateUserMessage,
    updateCollectedAnswers,
    recomputeProgress,
    triggerNoMoreInfo,
    confirmJurisdictionsAndStartScoping,
    confirmScopingAndOpenRecommendations,
    openStep2,
    openWizard,
    closeWizard,
    toggleFollowRegulator,
    followAllRegulators,
    finishWizard,
  };
});
