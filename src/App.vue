<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { initialMockData } from '@/data/mockData';
import { INITIAL_MATRIX_SESSIONS } from '@/data/matrixMockData';
import { api, getBackendStatus, setCustomBaseUrl } from '@/services/api';
import type {
  User,
  RegulationItem,
  PriorityAlert,
  RegulatorInScope,
  FrameworkCardData,
  CustomSourceRegistration,
  MaterialityLevel,
  MonitoringCadence,
  RegulatoryCategory,
  MatrixSessionState,
  ToastMessage,
  BackfillConfig,
} from '@/types';

import MonitorSidebar from '@/components/layout/MonitorSidebar.vue';
import Navbar from '@/components/layout/Navbar.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import NewsFeedView from '@/components/views/NewsFeedView.vue';
import RegulatorView from '@/components/views/RegulatorView.vue';
import TasksView from '@/components/views/TasksView.vue';
import CreateTaskModal from '@/components/modals/CreateTaskModal.vue';
import RegulatorDetailDrawer from '@/components/modals/RegulatorDetailDrawer.vue';
import DetailDrawer from '@/components/dashboard/DetailDrawer.vue';
import ScopeConfigDrawer from '@/components/scope/ScopeConfigDrawer.vue';
import HistoricalBackfillDrawer from '@/components/scope/HistoricalBackfillDrawer.vue';
import OverrideModal from '@/components/modals/OverrideModal.vue';
import AssignModal from '@/components/modals/AssignModal.vue';
import NewFrameworkModal from '@/components/modals/NewFrameworkModal.vue';
import ImportCollisionModal from '@/components/modals/ImportCollisionModal.vue';
import UnfollowConfirmModal from '@/components/modals/UnfollowConfirmModal.vue';
import OnboardingWizardModal from '@/components/modals/OnboardingWizardModal.vue';
import { GLOBAL_REGULATORY_DIRECTORY } from '@/data/directoryData';
import type { RegulatoryDirectoryItem } from '@/types';
import { useWizardStore } from '@/stores/wizardStore';
import { useDirectoryStore } from '@/stores/directoryStore';
import { useMonitorStore } from '@/stores/monitorStore';
import { useTaskStore } from '@/stores/taskStore';

const wizardStore = useWizardStore();
const directoryStore = useDirectoryStore();
const monitorStore = useMonitorStore();
const taskStore = useTaskStore();

type MainNavView = 'news-feed' | 'regulator' | 'tasks';

// --- Navigation State ---
const activeView = ref<MainNavView>('news-feed');

// --- Application Data State (initialized with mock data, synchronized with backend if connected) ---
const currentUser = ref<User>({ ...initialMockData.currentUser });
const regulations = ref<RegulationItem[]>([...initialMockData.regulations]);
const priorityAlerts = ref<PriorityAlert[]>([...initialMockData.priorityAlerts]);
const regulators = ref<RegulatorInScope[]>([...initialMockData.regulatorsInScope]);
const frameworks = ref<FrameworkCardData[]>([...initialMockData.frameworkCards]);
const customSources = ref<CustomSourceRegistration[]>([...initialMockData.customSources]);
const directoryItems = ref<RegulatoryDirectoryItem[]>([...GLOBAL_REGULATORY_DIRECTORY]);
const coverageGaps = {
  identifiedGapsCount: initialMockData.coverageBanner.hasGaps ? 1 : 0,
  unmonitoredRegulatorsCount: 0,
  suggestedAdditions: [],
};

// --- Modals and Drawers State ---
const isSidebarExpanded = ref(false);
const selectedRegulation = ref<RegulationItem | null>(null);
const isDetailDrawerOpen = ref(false);
const isScopeDrawerOpen = ref(false);
const isOverrideModalOpen = ref(false);
const isAssignModalOpen = ref(false);
const isNewFrameworkModalOpen = ref(false);
const itemToAssign = ref<RegulationItem | PriorityAlert | null>(null);
const unfollowRegulatorTarget = ref<RegulatorInScope | null>(null);
const backfillRegulatorTarget = ref<RegulatorInScope | null>(null);
const scopeEditRegulatorId = ref<string | null>(null);

// --- Task & Regulator View Modals ---
const isCreateTaskModalOpen = ref(false);
const createTaskInitialNews = ref<any[]>([]);
const createTaskInitialRegulators = ref<any[]>([]);
const tasksInitialTaskId = ref<string | null>(null);
const isRegulatorDrawerOpen = ref(false);
const selectedRegulatorDetail = ref<RegulatorInScope | null>(null);

const handleOpenGeneralCreateTask = () => {
  createTaskInitialNews.value = [];
  createTaskInitialRegulators.value = [];
  isCreateTaskModalOpen.value = true;
};

const handleOpenCreateTaskWithNews = (items: any[]) => {
  createTaskInitialNews.value = items;
  createTaskInitialRegulators.value = [];
  isCreateTaskModalOpen.value = true;
};

const handleOpenCreateTaskWithRegulators = (regs: any[]) => {
  isRegulatorDrawerOpen.value = false;
  isDetailDrawerOpen.value = false;
  createTaskInitialNews.value = [];
  createTaskInitialRegulators.value = regs;
  isCreateTaskModalOpen.value = true;
};

const handleTaskCreated = (taskId: string) => {
  activeView.value = 'tasks';
  tasksInitialTaskId.value = taskId;
  addToast('Task Created', 'Compliance intelligence task has been created and analyzed.', 'success');
};

const handleGoToTask = (taskId: string) => {
  activeView.value = 'tasks';
  tasksInitialTaskId.value = taskId;
  isDetailDrawerOpen.value = false;
  isRegulatorDrawerOpen.value = false;
};

const handleToggleBookmarkDirectory = (item: RegulatoryDirectoryItem) => {
  if (directoryStore.isBookmarked(item.id, item.referenceNumber, item.title)) {
    directoryStore.removeBookmark(item.id, item.referenceNumber, item.title);
    addToast('Bookmark Removed', `"${item.title.slice(0, 36)}..." removed from Bookmarks.`, 'info');
  } else {
    directoryStore.addBookmark(item);
    addToast('Item Bookmarked', `"${item.title.slice(0, 36)}..." saved to News Feed > Directory > Bookmarks.`, 'success');
  }
};

const handleSelectRegulationOrAlert = (item: any) => {
  if ('docType' in item && 'referenceNumber' in item) {
    selectedRegulation.value = item as RegulationItem;
  } else {
    const existing = regulations.value.find((r) => r.id === (item.regulationId || item.id));
    if (existing) {
      selectedRegulation.value = existing;
    } else {
      selectedRegulation.value = {
        id: item.regulationId || item.id,
        title: item.title,
        referenceNumber: `REF-${item.regulatorAcronym || 'REG'}-2026`,
        docType: 'Circular',
        regulator: item.regulator,
        regulatorAcronym: item.regulatorAcronym,
        jurisdiction: item.jurisdiction,
        category: item.category || 'Financial Services & Capital Markets',
        materiality: item.materiality,
        themes: item.themes || ['Operational resilience and incident reporting'],
        publishDate: item.publishDate,
        effectiveDate: item.effectiveDate,
        aiRelevanceScore: 92,
        diligenceStatus: 'None',
        officialUrl: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/',
        executiveSummary: item.aiRelevanceSummary,
        operationalImpact: 'Supervisory notice requiring governance review.',
        affectedBusinessUnits: ['Compliance', 'Legal', 'Risk'],
        authenticExcerpt: item.aiRelevanceSummary,
        owner: 'Ivan Choy',
        auditTimeline: [],
      };
    }
  }
  isDetailDrawerOpen.value = true;
};

// --- First-Visit User Onboarding Wizard Modal State ---
const isOnboardingModalOpen = ref(false);
const isBackendOnline = ref(false);
const isFetchingBackend = ref(false);

const fetchLiveData = async () => {
  isFetchingBackend.value = true;
  try {
    const [regsRes, alertsRes, scopeRes] = await Promise.allSettled([
      api.regulations.list({ limit: 100 }),
      api.alerts.list(),
      api.scope.getRegulatorsInScope(),
    ]);

    let loadedAny = false;

    if (regsRes.status === 'fulfilled' && regsRes.value?.items && regsRes.value.items.length > 0) {
      regulations.value = regsRes.value.items;
      loadedAny = true;
    } else if (regulations.value.length === 0) {
      regulations.value = [...initialMockData.regulations];
    }

    if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value) && alertsRes.value.length > 0) {
      priorityAlerts.value = alertsRes.value;
      loadedAny = true;
    } else if (priorityAlerts.value.length === 0) {
      priorityAlerts.value = [...initialMockData.priorityAlerts];
    }

    if (scopeRes.status === 'fulfilled' && Array.isArray(scopeRes.value) && scopeRes.value.length > 0) {
      regulators.value = scopeRes.value;
      loadedAny = true;
    } else if (regulators.value.length === 0) {
      regulators.value = [...initialMockData.regulatorsInScope];
    }

    // Static Pages artifacts are a valid live data source, but they are not an
    // API connection. Only show "backend connected" when an API call actually
    // reached the configured backend.
    isBackendOnline.value = getBackendStatus().reachable;
    if (isBackendOnline.value) {
      addToast(
        'Backend Connected',
        `Live Hong Kong regulatory data successfully synchronized (${regulators.value.length} authorities, ${priorityAlerts.value.length} alerts).`,
        'success'
      );
    }
  } catch (err: any) {
    console.warn('Backend API error:', err);
    isBackendOnline.value = false;
    if (regulations.value.length === 0) regulations.value = [...initialMockData.regulations];
    if (priorityAlerts.value.length === 0) priorityAlerts.value = [...initialMockData.priorityAlerts];
    if (regulators.value.length === 0) regulators.value = [...initialMockData.regulatorsInScope];
  } finally {
    isFetchingBackend.value = false;
  }
};

const handleUpdateBaseUrl = async (newUrl: string) => {
  setCustomBaseUrl(newUrl);
  addToast('API Endpoint Updated', `Connecting to ${newUrl}...`, 'info');
  await fetchLiveData();
};

onMounted(async () => {
  try {
    const hasCompleted = localStorage.getItem('hasCompletedOnboarding');
    if (hasCompleted !== 'true') {
      isOnboardingModalOpen.value = true;
    }
  } catch (e) {
    console.error('Failed to read onboarding state from localStorage', e);
  }

  await fetchLiveData();
});

// --- Document Import Collision Modal State ---
const isImportCollisionModalOpen = ref(false);
const incomingDocsToImport = ref<RegulationItem[]>([]);

// --- Regulatory Copilot Matrix Sessions State ---
const matrixSessions = ref<MatrixSessionState[]>(INITIAL_MATRIX_SESSIONS);
const activeMatrixSessionId = ref<string>(INITIAL_MATRIX_SESSIONS[0].sessionId);
const isSetupMatrixModalOpen = ref(false);

// Watch wizardStore for async scoping completion toast
watch(
  () => wizardStore.toastMessage,
  (msg) => {
    if (msg) {
      addToast(msg.title, msg.body, 'success');
    }
  }
);

// --- Toast Notification State ---
const toasts = ref<ToastMessage[]>([]);

const addToast = (
  title: string,
  message?: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'info'
) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  toasts.value = [...toasts.value, { id, title, message, type }];
};

const removeToast = (id: string) => {
  toasts.value = toasts.value.filter((t) => t.id !== id);
};

const nowUtc = () =>
  new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

// --- Derived: existing Diligence Framework catalog candidates for fuzzy matching ---
const existingCatalogCandidates = computed(() => {
  const candidates = frameworks.value.map((fw) => ({
    id: fw.id,
    title: fw.title,
    version: fw.version || 'Version 1',
    referenceNumber: fw.associatedRegulationRef,
    authority: fw.authority,
  }));

  regulations.value
    .filter((r) => r.diligenceStatus === 'Imported')
    .forEach((r) => {
      candidates.push({
        id: `cat-${r.id}`,
        title: r.title,
        version: 'Version 1',
        referenceNumber: r.referenceNumber,
        authority: `${r.regulator} (${r.regulatorAcronym})`,
      });
    });

  return candidates;
});

// --- Derived: Regulations in Scope lifecycle resolution ---
// - "acknowledged" or "imported": accepted into active monitoring scope (ALWAYS shown).
// - "pending": kept in Priority Alert Feed awaiting triage (NOT shown unless acknowledged).
// - "dismissed": archived to audit log (NEVER shown unless acknowledged).
// If a regulation has ANY acknowledged or imported alert, it MUST remain in scope.
const regulationsInScope = computed(() => {
  const acknowledgedOrImportedIds = new Set(
    priorityAlerts.value
      .filter((a) => a.status === 'acknowledged' || a.status === 'imported')
      .map((a) => a.regulationId)
  );

  const pendingOrDismissedIds = new Set(
    priorityAlerts.value
      .filter((a) => a.status === 'pending' || a.status === 'dismissed')
      .map((a) => a.regulationId)
  );

  return regulations.value.filter((r) => {
    if (acknowledgedOrImportedIds.has(r.id)) return true;
    if (pendingOrDismissedIds.has(r.id)) return false;
    return true;
  });
});

// --- Derived: Followed Priority Alerts ---
// Priority Alerts only displays items from regulators or regulations the user follows
const followedPriorityAlerts = computed(() => {
  const followedAcronyms = new Set<string>();
  const followedNames = new Set<string>();

  regulators.value.forEach((r) => {
    if (r.isFollowed) {
      if (r.acronym) followedAcronyms.add(r.acronym.toUpperCase().trim());
      if (r.name) followedNames.add(r.name.toLowerCase().trim());
    }
  });

  const followedRegIds = new Set(regulations.value.map((r) => r.id));

  return priorityAlerts.value.filter((alert) => {
    const alertAcronym = (alert.regulatorAcronym || '').toUpperCase().trim();
    const alertRegName = (alert.regulator || '').toLowerCase().trim();
    const isRegulatorFollowed =
      followedAcronyms.has(alertAcronym) || followedNames.has(alertRegName);
    const isRegulationFollowed = alert.regulationId
      ? followedRegIds.has(alert.regulationId)
      : false;

    return isRegulatorFollowed || isRegulationFollowed;
  });
});

const pendingAlertsCount = computed(
  () => followedPriorityAlerts.value.filter((a) => a.status === 'pending').length
);
const overdueCount = computed(
  () =>
    followedPriorityAlerts.value.filter((a) => a.isOverdueSLA && a.status === 'pending')
      .length
);

// --- Handlers: Priority Alerts ---
const handleSelectAlert = (regulationId: string) => {
  const targetReg = regulations.value.find((r) => r.id === regulationId);
  if (targetReg) {
    selectedRegulation.value = targetReg;
    isDetailDrawerOpen.value = true;
  }
};

const handleAcknowledgeAlert = (alertId: string) => {
  const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
  if (!targetAlert) return;

  // Add to directoryStore Bookmarks with isAcknowledged flag
  directoryStore.addBookmark({
    ...targetAlert,
    isAcknowledged: true,
  });

  const nowTimestamp = nowUtc();
  priorityAlerts.value = priorityAlerts.value.map((a) =>
    a.id === alertId
      ? { ...a, status: 'acknowledged', actionDate: nowTimestamp, assignedTo: 'Ivan Choy' }
      : a
  );

  const ackAuditEntry = {
    id: `audit-ack-${Date.now()}`,
    timestamp: nowTimestamp,
    action: 'Acknowledged via Priority Alert Feed (Added to Regulations in Scope)',
    performedBy: 'Ivan Choy (Lead)',
    details:
      'Supervisory alert acknowledged. Regulation accepted into active monitoring scope for compliance review.',
  };

  const existingIndex = regulations.value.findIndex(
    (r) => r.id === targetAlert.regulationId
  );

  if (existingIndex >= 0) {
    const targetItem = regulations.value[existingIndex];
    const updatedItem = {
      ...targetItem,
      auditTimeline: [ackAuditEntry, ...(targetItem.auditTimeline || [])],
    };
    const remaining = regulations.value.filter((_, idx) => idx !== existingIndex);
    regulations.value = [updatedItem, ...remaining];
  } else {
    const newReg: RegulationItem = {
      id: targetAlert.regulationId,
      title: targetAlert.title,
      referenceNumber: `REF-${targetAlert.regulatorAcronym}-2026`,
      docType: 'Circular',
      regulator: targetAlert.regulator,
      regulatorAcronym: targetAlert.regulatorAcronym,
      jurisdiction: targetAlert.jurisdiction,
      category: targetAlert.category || 'Financial Services & Capital Markets',
      materiality: targetAlert.materiality,
      themes: targetAlert.themes || ['Operational resilience and incident reporting'],
      publishDate: targetAlert.publishDate,
      effectiveDate: targetAlert.effectiveDate,
      aiRelevanceScore: 92,
      diligenceStatus: 'Not Imported',
      officialUrl: 'https://www.hkma.gov.hk/eng/regulatory-resources/regulatory-guides/',
      executiveSummary: targetAlert.aiRelevanceSummary,
      operationalImpact:
        'Requires supervisory review and gap alignment with current internal policies.',
      affectedBusinessUnits: ['Compliance', 'Risk Management', 'Legal'],
      authenticExcerpt: targetAlert.aiRelevanceSummary,
      owner: 'Ivan Choy',
      auditTimeline: [ackAuditEntry],
    };
    regulations.value = [newReg, ...regulations.value];
  }

  addToast(
    'Alert Acknowledged',
    `"${targetAlert.title.slice(0, 38)}..." added to Regulations in Scope.`,
    'success'
  );

  api.alerts.updateStatus(alertId, 'acknowledged', targetAlert.title).catch((e) => {
    console.warn('API sync for acknowledge alert failed', e);
  });
};

const handleDismissAlert = (alertId: string) => {
  const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
  if (!targetAlert) return;

  // Ensure dismissed alert never appears in Bookmarks
  directoryStore.removeBookmark(targetAlert.regulationId, undefined, targetAlert.title, targetAlert.id);

  const nowTimestamp = nowUtc();
  priorityAlerts.value = priorityAlerts.value.map((a) =>
    a.id === alertId
      ? {
          ...a,
          status: 'dismissed',
          actionDate: nowTimestamp,
          actionDetails:
            'Dismissed by compliance lead as irrelevant; archived to audit trail.',
          assignedTo: 'Ivan Choy',
        }
      : a
  );

  regulations.value = regulations.value.filter(
    (r) => r.id !== targetAlert.regulationId
  );

  addToast(
    'Alert Dismissed',
    `"${targetAlert.title.slice(0, 36)}..." archived into history audit trail. Not added to Regulations.`,
    'info'
  );

  api.alerts.dismiss(alertId, 'Dismissed by compliance lead as irrelevant').catch((e) => {
    console.warn('API sync for dismiss alert failed', e);
  });
};

const handleRestoreAlert = (alertId: string) => {
  const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
  if (!targetAlert) return;

  priorityAlerts.value = priorityAlerts.value.map((a) =>
    a.id === alertId ? { ...a, status: 'pending' as const, actionDate: undefined } : a
  );

  api.alerts.updateStatus(alertId, 'pending').catch((e) => {
    console.warn('API sync for restore alert failed', e);
  });

  const nowTimestamp = nowUtc();
  regulations.value = regulations.value.map((r) =>
    r.id === targetAlert.regulationId
      ? {
          ...r,
          auditTimeline: [
            {
              id: `audit-restore-${Date.now()}`,
              timestamp: nowTimestamp,
              action: 'Restored to Priority Alert Feed',
              performedBy: 'Ivan Choy (Lead)',
              details:
                'Re-opened from processed history back into Priority Alert Feed for re-evaluation.',
            },
            ...(r.auditTimeline || []),
          ],
        }
      : r
  );

  addToast(
    'Alert Restored to Priority Feed',
    `"${targetAlert.title.slice(0, 38)}..." returned to Priority Alert Feed for re-evaluation.`,
    'info'
  );
};

const handleAssignAlert = (alert: PriorityAlert) => {
  itemToAssign.value = alert;
  isAssignModalOpen.value = true;
};

// --- Handlers: Regulations & Diligence Frameworks Import with Collision Check ---
const handleSelectRegulation = (reg: RegulationItem) => {
  selectedRegulation.value = reg;
  isDetailDrawerOpen.value = true;
};

const handleTriggerSingleImport = (reg: RegulationItem) => {
  incomingDocsToImport.value = [reg];
  isImportCollisionModalOpen.value = true;
};

const handleTriggerBulkImport = (selectedIds: string[]) => {
  const items = regulations.value.filter((r) => selectedIds.includes(r.id));
  if (items.length === 0) return;
  incomingDocsToImport.value = items;
  isImportCollisionModalOpen.value = true;
};

const handleConfirmImportWithCollision = (config: {
  mode: 'new' | 'update';
  documentIds: string[];
  targetDocId?: string;
  versionStrategy?: 'bump' | 'overwrite';
  notes?: string;
}) => {
  const nowTimestamp = nowUtc();
  const existingIds = new Set(regulations.value.map((r) => r.id));

  // Add any incoming documents (e.g. from Regulatory Directory) not yet in monitor catalog
  const newItemsFromImport: RegulationItem[] = [];
  for (const doc of incomingDocsToImport.value) {
    if (!existingIds.has(doc.id) && config.documentIds.includes(doc.id)) {
      const actionText =
        config.mode === 'new'
          ? 'Imported to Diligence Frameworks (New Baseline v1.0)'
          : `Imported to Diligence Frameworks (Linked: ${
              config.versionStrategy === 'bump' ? 'v1.1 Increment' : 'Overwritten'
            })`;

      const detailsText =
        config.mode === 'new'
          ? `Created baseline v1.0 in Diligence Frameworks catalog from Global Regulatory Directory. (Authority: ${doc.regulator}, jurisdiction: ${doc.jurisdiction}, effective date: ${doc.effectiveDate}). ${config.notes || ''}`
          : `Linked to existing Diligence record ${config.targetDocId || ''}. Version strategy: ${config.versionStrategy}. Changelog note: ${config.notes || 'Regulatory refresh'}`;

      newItemsFromImport.push({
        ...doc,
        diligenceStatus: 'Imported' as const,
        auditTimeline: [
          {
            id: `audit-dir-${Date.now()}-${doc.id}`,
            timestamp: nowTimestamp,
            action: actionText,
            performedBy: 'Ivan Choy (Lead)',
            details: detailsText,
          },
          ...(doc.auditTimeline || []),
        ],
      });
    }
  }

  const updatedRegulations = regulations.value.map((item) => {
    if (config.documentIds.includes(item.id)) {
      const actionText =
        config.mode === 'new'
          ? 'Imported to Diligence Frameworks (New Baseline v1.0)'
          : `Imported to Diligence Frameworks (Linked: ${
              config.versionStrategy === 'bump' ? 'v1.1 Increment' : 'Overwritten'
            })`;

      const detailsText =
        config.mode === 'new'
          ? `Created baseline v1.0 in Diligence Frameworks catalog. Transmitted full payload (authority: ${item.regulator}, jurisdiction: ${item.jurisdiction}, effective date: ${item.effectiveDate}). ${config.notes || ''}`
          : `Linked to existing Diligence record ${config.targetDocId || ''}. Version strategy: ${config.versionStrategy}. Changelog note: ${config.notes || 'Routine regulatory refresh'}`;

      const newTimelineEntry = {
        id: `audit-${Date.now()}-${item.id}`,
        timestamp: nowTimestamp,
        action: actionText,
        performedBy: 'Ivan Choy (Lead)',
        details: detailsText,
      };

      return {
        ...item,
        diligenceStatus: 'Imported' as const,
        auditTimeline: [newTimelineEntry, ...item.auditTimeline],
      };
    }
    return item;
  });

  regulations.value = [...newItemsFromImport, ...updatedRegulations];

  if (
    selectedRegulation.value &&
    config.documentIds.includes(selectedRegulation.value.id)
  ) {
    selectedRegulation.value = {
      ...selectedRegulation.value,
      diligenceStatus: 'Imported',
    };
  }

  priorityAlerts.value = priorityAlerts.value.map((alert) =>
    config.documentIds.includes(alert.regulationId)
      ? { ...alert, status: 'imported', actionDate: nowTimestamp, assignedTo: 'Ivan Choy' }
      : alert
  );

  if (config.mode === 'new') {
    addToast(
      'Import to Diligence Successful',
      `Created fresh baseline (v1.0) in Diligence Frameworks for ${config.documentIds.length} item(s).`,
      'success'
    );
  } else {
    addToast(
      'Version Updated in Diligence',
      `Linked ${config.documentIds.length} item(s) to Diligence Framework with ${
        config.versionStrategy === 'bump' ? 'version bump' : 'payload overwrite'
      }.`,
      'success'
    );
  }

  isImportCollisionModalOpen.value = false;
  incomingDocsToImport.value = [];
};

// --- Handlers: Human-in-the-Loop Override ---
const handleOpenOverrideModal = (reg: RegulationItem) => {
  selectedRegulation.value = reg;
  isOverrideModalOpen.value = true;
};

const handleConfirmOverride = (
  regulationId: string,
  newTier: MaterialityLevel,
  rationale: string
) => {
  const timestamp = nowUtc();
  const updatedUser = 'Ivan Choy (Lead)';

  regulations.value = regulations.value.map((item) => {
    if (item.id === regulationId) {
      const oldTier = item.materiality;
      const newTimelineItem = {
        id: `audit-${Date.now()}`,
        timestamp,
        action: `Relevance Overridden: ${oldTier} -> ${newTier}`,
        performedBy: updatedUser,
        details: `Human-in-the-loop evaluated and adjusted tier from ${oldTier} to ${newTier}.`,
        rationale,
      };

      return {
        ...item,
        materiality: newTier,
        overrides: [
          {
            field: 'materiality',
            previousTier: oldTier,
            newTier,
            justification: rationale,
            user: updatedUser,
            timestamp,
          },
          ...(item.overrides || []),
        ],
        auditTimeline: [newTimelineItem, ...item.auditTimeline],
      };
    }
    return item;
  });

  if (selectedRegulation.value && selectedRegulation.value.id === regulationId) {
    selectedRegulation.value = { ...selectedRegulation.value, materiality: newTier };
  }

  addToast(
    'Relevance Tier Overridden',
    `Tier changed to ${newTier}. Audit justification permanently committed.`,
    'warning'
  );
  isOverrideModalOpen.value = false;
};

// --- Handlers: Assign Colleague ---
const handleOpenAssignModal = (reg: RegulationItem) => {
  itemToAssign.value = reg;
  isAssignModalOpen.value = true;
};

const handleConfirmAssign = (itemId: string, assigneeName: string, note?: string) => {
  regulations.value = regulations.value.map((r) =>
    r.id === itemId ? { ...r, owner: assigneeName } : r
  );

  priorityAlerts.value = priorityAlerts.value.map((a) =>
    a.id === itemId || a.regulationId === itemId
      ? { ...a, status: 'acknowledged', assignedTo: assigneeName }
      : a
  );

  addToast(
    'Assigned Successfully',
    `Routed to ${assigneeName}${note ? ` ("${note}")` : ''}.`,
    'info'
  );
  isAssignModalOpen.value = false;
};

// --- Regulatory Directory Handlers ---
const followedRegulationIds = computed(() => regulations.value.map((r) => r.id));

const handleTriggerBulkImportFromDirectory = (regs: RegulatoryDirectoryItem[]) => {
  if (!regs || regs.length === 0) return;
  incomingDocsToImport.value = regs;
  isImportCollisionModalOpen.value = true;
};

const handleToggleFollowRegulatorByAcronym = (
  regulatorAcronym: string,
  targetFollow: boolean
) => {
  const normAcronym = (regulatorAcronym || '').toUpperCase().trim();
  const targetReg = regulators.value.find(
    (r) => r.acronym.toUpperCase().trim() === normAcronym
  );

  if (targetReg) {
    executeToggleFollowRegulator(targetReg.id, targetFollow);
  } else {
    // Authority not in regulators list yet: add to Watchlist Search
    const newRegId = `reg-${normAcronym.toLowerCase()}`;
    const newRegulator: RegulatorInScope = {
      id: newRegId,
      name: regulatorAcronym,
      acronym: normAcronym,
      jurisdiction: 'Global',
      category: 'Financial Services & Capital Markets',
      isFollowed: targetFollow,
      cadence: 'Daily',
      themes: ['Compliance', 'Governance'],
      lastChecked: 'Just now',
      latestPublication: 'Recently published guidance',
      health: 'Healthy',
      openAlertsCount: 0,
      owner: 'Automated Ingestion',
      officialEndpoint: `https://www.${normAcronym.toLowerCase()}.gov`,
      subScopes: [
        {
          id: `sub-${normAcronym.toLowerCase()}-all`,
          name: 'All Supervisory Releases',
          code: `${normAcronym}-ALL`,
          description: `Supervisory circulars and guidelines issued by ${normAcronym}`,
          isFollowed: targetFollow,
          cadence: 'Daily',
          themes: ['Compliance', 'Governance'],
          openAlertsCount: 0,
        },
      ],
    };
    regulators.value = [...regulators.value, newRegulator];
    addToast(
      targetFollow ? 'Now Monitoring Authority' : 'Authority Scope Updated',
      `${normAcronym} configured in Watchlist Search.`,
      targetFollow ? 'success' : 'info'
    );
  }
};

const handleToggleFollowRegulationFromDirectory = (
  reg: RegulatoryDirectoryItem,
  targetFollow: boolean
) => {
  if (targetFollow) {
    if (!regulations.value.some((r) => r.id === reg.id)) {
      regulations.value = [reg, ...regulations.value];
    }
    // Automatically ensure regulator is followed in scope if known
    const targetReg = regulators.value.find((r) => r.acronym === reg.regulatorAcronym);
    if (targetReg && !targetReg.isFollowed) {
      executeToggleFollowRegulator(targetReg.id, true);
    }
    addToast(
      'Added to Frameworks & Monitor',
      `"${reg.title.slice(0, 40)}..." is now actively tracked in your compliance matrix.`,
      'success'
    );
  } else {
    regulations.value = regulations.value.filter((r) => r.id !== reg.id);
    addToast(
      'Removed from Monitor Scope',
      `"${reg.title.slice(0, 40)}..." removed from active tracking.`,
      'info'
    );
  }
};

const handleBulkFollowRegulationsFromDirectory = (
  regs: RegulatoryDirectoryItem[],
  targetFollow: boolean
) => {
  if (targetFollow) {
    const existingIds = new Set(regulations.value.map((r) => r.id));
    const toAdd = regs.filter((r) => !existingIds.has(r.id));
    regulations.value = [...toAdd, ...regulations.value];
    addToast(
      'Regulations Added to Monitor',
      `${regs.length} publications added directly to active compliance matrix.`,
      'success'
    );
  }
};

const handleConfirmDirectoryDiligenceImport = (payload: {
  projectId: string;
  projectName: string;
  evidenceType: string;
  notes: string;
  regulationIds: string[];
}) => {
  const idsSet = new Set(payload.regulationIds);
  regulations.value = regulations.value.map((r) =>
    idsSet.has(r.id) ? { ...r, diligenceStatus: 'Imported' as const } : r
  );
  addToast(
    'Imported to Diligence',
    `Successfully bound ${payload.regulationIds.length} regulation(s) as evidence in "${payload.projectName}".`,
    'success'
  );
};

// --- Handlers: Regulators & Scope Drawer ---
const executeToggleFollowRegulator = (regulatorId: string, targetFollow: boolean) => {
  // Sync in-memory state
  regulators.value = regulators.value.map((r) => {
    if (r.id === regulatorId) {
      addToast(
        targetFollow ? 'Now Monitoring Regulator' : 'Supervisory Authority Unfollowed',
        `${r.name} (${r.acronym}) ${
          targetFollow ? 'and all child sub-scopes enabled' : 'deselected'
        }.`,
        targetFollow ? 'success' : 'info'
      );
      const updatedSubScopes = r.subScopes?.map((sub) => ({
        ...sub,
        isFollowed: targetFollow,
      }));
      return { ...r, isFollowed: targetFollow, subScopes: updatedSubScopes };
    }
    return r;
  });

  // Call API layer to ensure mockStore / backend is 100% in sync
  api.scope.toggleFollow(regulatorId, targetFollow).catch((err) => {
    console.warn('API sync for toggleFollow failed, in-memory state preserved', err);
  });
};

const handleToggleFollowRegulator = (regulatorId: string) => {
  const targetReg = regulators.value.find((r) => r.id === regulatorId);
  if (!targetReg) return;
  if (targetReg.isFollowed) {
    unfollowRegulatorTarget.value = targetReg;
  } else {
    executeToggleFollowRegulator(regulatorId, true);
  }
};

const handleTriggerBackfill = (regulator: RegulatorInScope) => {
  backfillRegulatorTarget.value = regulator;
};

const handleConfirmBackfill = (config: BackfillConfig) => {
  executeToggleFollowRegulator(config.regulatorId, true);

  if (!config.timespan || config.timespan === 'none') {
    addToast(
      'Authority Followed',
      `Now following ${config.acronym} from today onward (no historical backfill).`,
      'success'
    );
    backfillRegulatorTarget.value = null;
    return;
  }

  const timespanLabel = config.timespan.toUpperCase();
  addToast(
    'Historical Ingestion Scheduled',
    `Backfill crawler job queued for ${config.acronym} (${timespanLabel}). As backend ingests gazette archives, releases will be displayed automatically.`,
    'info'
  );
  backfillRegulatorTarget.value = null;
};

const handleEditRegulator = (reg: RegulatorInScope) => {
  scopeEditRegulatorId.value = reg.id;
  isScopeDrawerOpen.value = true;
};

const handleToggleSubScopeFollow = (regulatorId: string, subScopeId: string) => {
  regulators.value = regulators.value.map((r) => {
    if (r.id === regulatorId && r.subScopes) {
      const targetSub = r.subScopes.find((s) => s.id === subScopeId);
      const nextState = !targetSub?.isFollowed;
      const updatedSubScopes = r.subScopes.map((sub) =>
        sub.id === subScopeId ? { ...sub, isFollowed: nextState } : sub
      );
      const anyFollowed = updatedSubScopes.some((sub) => sub.isFollowed);

      addToast(
        nextState ? 'Child Entity Followed' : 'Child Entity Unfollowed',
        `${targetSub?.name || 'Sub-scope'} (${targetSub?.code || ''}) ${
          nextState ? 'now actively monitored' : 'deselected'
        }.`,
        nextState ? 'success' : 'info'
      );

      return { ...r, isFollowed: anyFollowed, subScopes: updatedSubScopes };
    }
    return r;
  });
};

const handleToggleFollowAllRegulators = (
  regulatorIds: string[],
  targetFollow: boolean
) => {
  regulators.value = regulators.value.map((r) => {
    if (regulatorIds.includes(r.id)) {
      const updatedSubScopes = r.subScopes?.map((sub) => ({
        ...sub,
        isFollowed: targetFollow,
      }));
      return { ...r, isFollowed: targetFollow, subScopes: updatedSubScopes };
    }
    return r;
  });
  addToast(
    targetFollow ? 'All Authorities Followed' : 'All Authorities Unfollowed',
    `${regulatorIds.length} authorities and their sub-scopes ${
      targetFollow ? 'enabled' : 'deselected'
    }.`,
    targetFollow ? 'success' : 'info'
  );
};

const handleUpdateRegulatorSettings = (
  regulatorId: string,
  cadence: MonitoringCadence,
  themes: string[],
  category?: RegulatoryCategory
) => {
  regulators.value = regulators.value.map((r) =>
    r.id === regulatorId
      ? { ...r, cadence, themes, ...(category ? { category } : {}) }
      : r
  );
  addToast(
    'Regulator Scope Updated',
    `Cadence set to ${cadence}${category ? ` (${category})` : ''} with ${
      themes.length
    } bound thematic policies.`,
    'success'
  );
};

const handleAddCustomSource = (
  sourceData: Omit<CustomSourceRegistration, 'id' | 'lastChecked'>
) => {
  const newEntry: CustomSourceRegistration = {
    ...sourceData,
    id: `src-${Date.now()}`,
    lastChecked: 'Just now',
  };
  customSources.value = [newEntry, ...customSources.value];
  addToast('Custom Input Source Registered', `Surveillance scheduled for ${newEntry.url}`, 'success');
};

const handleToggleCustomSourceFollow = (sourceId: string) => {
  const target = customSources.value.find((s) => s.id === sourceId);
  if (!target) return;
  const nextFollow = target.isFollowed === false ? true : false;
  customSources.value = customSources.value.map((s) => {
    if (s.id === sourceId) {
      return { ...s, isFollowed: nextFollow };
    }
    return s;
  });
  addToast(
    nextFollow ? 'Custom Input Source Followed' : 'Custom Input Source Unfollowed',
    `Surveillance for ${target.regulator} (${target.url}) is now ${nextFollow ? 'active' : 'paused'}.`,
    nextFollow ? 'success' : 'info'
  );
};

// --- Handlers: Frameworks ---
const handleAddFramework = (
  frameworkData: Omit<FrameworkCardData, 'id' | 'lastModified'>
) => {
  const newEntry: FrameworkCardData = {
    ...frameworkData,
    id: `fw-${Date.now()}`,
    lastModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
  frameworks.value = [newEntry, ...frameworks.value];
  addToast('Framework Added', `"${newEntry.title}" registered in scope.`, 'success');
  isNewFrameworkModalOpen.value = false;
};

const handleSelectFramework = (fw: FrameworkCardData) => {
  addToast('Framework Selected', `Viewing requirements for ${fw.title}`);
};

const handleDismissRegulationFromDrawer = (regId: string) => {
  regulations.value = regulations.value.filter((r) => r.id !== regId);
  isDetailDrawerOpen.value = false;
  addToast('Regulation Dismissed', 'Item excluded from current audit scope.', 'info');
};

const handleCompleteOnboarding = async (payload: {
  industry?: string;
  markets?: string[];
  contextNotes?: string;
  selectedRegulatorIds?: string[];
  followedRegulatorIds?: string[];
  selectedMarkets?: string[];
  primaryEmail?: string;
  teamEmails?: string[];
  frequency?: string;
  enableSlack?: boolean;
}) => {
  const targetIds = payload.followedRegulatorIds || payload.selectedRegulatorIds || [];

  // Sync followed regulators with selected recommended authorities from registry
  if (targetIds.length > 0) {
    // Map onboarding regl-001..regl-023 to corresponding acronyms for fuzzy matching
    const ONBOARDING_ID_TO_ACRONYM: Record<string, string> = {
      'regl-001': 'HKMA',
      'regl-002': 'SFC',
      'regl-003': 'MAS',
      'regl-004': 'FCA',
      'regl-005': 'SEC',
      'regl-006': 'CR',
      'regl-007': 'PCPD',
      'regl-008': 'IA',
      'regl-009': 'IRD',
      'regl-010': 'HKCC',
      'regl-011': 'ACRA',
      'regl-012': 'EBA',
      'regl-013': 'ISO',
      'regl-014': 'Fed',
      'regl-015': 'PRA',
      'regl-016': 'BaFin',
      'regl-017': 'ASIC',
      'regl-018': 'APRA',
      'regl-019': 'JFSA',
      'regl-020': 'PBOC',
      'regl-021': 'FINMA',
      'regl-022': 'DFSA',
      'regl-023': 'FATF',
    };

    // Build complete set of recognized keys (IDs, acronyms, and aliases)
    const recognizedKeys = new Set<string>();
    for (const id of targetIds) {
      recognizedKeys.add(id);
      recognizedKeys.add(id.toLowerCase());
      const mappedAcronym = ONBOARDING_ID_TO_ACRONYM[id];
      if (mappedAcronym) {
        recognizedKeys.add(mappedAcronym.toUpperCase());
        recognizedKeys.add(mappedAcronym.toLowerCase());
        recognizedKeys.add(`reg-${mappedAcronym.toLowerCase()}`);
      }
    }

    regulators.value = regulators.value.map((reg) => ({
      ...reg,
      isFollowed:
        recognizedKeys.has(reg.id) ||
        recognizedKeys.has(reg.id.toLowerCase()) ||
        recognizedKeys.has(reg.acronym.toUpperCase()) ||
        recognizedKeys.has(reg.acronym.toLowerCase()) ||
        recognizedKeys.has(`reg-${reg.acronym.toLowerCase()}`),
    }));
  }

  // Persist to backend API (gracefully handles offline fallback)
  try {
    await api.scope.saveOnboardingProfile({
      selectedArchetype: payload.industry || 'Financial Services',
      selectedMarkets: payload.selectedMarkets || payload.markets || ['Hong Kong'],
      businessSpecifics: payload.contextNotes || '',
      selectedRegulatorIds: targetIds,
    });
  } catch (err) {
    console.warn('API saveOnboardingProfile fallback:', err);
  }

  addToast(
    'Watchlist Synchronized',
    `Surveillance scope active for ${targetIds.length} authorities. Alerts will now stream into News Feed.`,
    'success'
  );
  isOnboardingModalOpen.value = false;
  wizardStore.closeWizard();
};

const handleCloseScopeDrawer = () => {
  isScopeDrawerOpen.value = false;
  scopeEditRegulatorId.value = null;
};

const handleSelectMatrixSession = (sessionId: string) => {
  activeMatrixSessionId.value = sessionId;
  activeView.value = 'tasks';
};

const handleNewMatrixWorkspace = () => {
  activeView.value = 'tasks';
  handleOpenGeneralCreateTask();
};

const handleToggleSaveSession = (sessionId: string) => {
  matrixSessions.value = matrixSessions.value.map((s) =>
    s.sessionId === sessionId ? { ...s, isSaved: !s.isSaved } : s
  );
};

const handleConfirmUnfollow = () => {
  if (unfollowRegulatorTarget.value) {
    executeToggleFollowRegulator(unfollowRegulatorTarget.value.id, false);
    unfollowRegulatorTarget.value = null;
  }
};

const mainContentStyle = computed(() => ({
  width: isSidebarExpanded.value ? 'calc(100vw - 16rem)' : 'calc(100vw - 4rem)',
  maxWidth: isSidebarExpanded.value ? 'calc(100vw - 16rem)' : 'calc(100vw - 4rem)',
  transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  willChange: 'width, transform',
  transform: 'translate3d(0, 0, 0)',
}));
</script>

<template>
  <div
    class="monitor-layout flex h-screen w-screen overflow-hidden bg-neutral-100/50 text-neutral-800 font-sans antialiased relative"
  >
    <!-- Toast Notifications -->
    <ToastContainer :toasts="toasts" @remove="removeToast" />

    <!-- Primary Sidebar - Fluid Push Layout -->
    <MonitorSidebar
      :activeView="activeView"
      :pendingAlertsCount="pendingAlertsCount"
      :overdueCount="overdueCount"
      :isExpanded="isSidebarExpanded"
      :matrixSessions="matrixSessions"
      :activeMatrixSessionId="activeMatrixSessionId"
      @selectView="activeView = $event"
      @navigate="activeView = $event"
      @openScopeConfig="isScopeDrawerOpen = true"
      @expandedChange="isSidebarExpanded = $event"
      @selectMatrixSession="handleSelectMatrixSession"
      @newChat="handleNewMatrixWorkspace"
      @newMatrixWorkspace="handleNewMatrixWorkspace"
      @toggleSaveSession="handleToggleSaveSession"
    />

    <!-- Main Workspace Area: Pure 1:1 Scale Fluid Push Layout -->
    <div
      id="monitor-main-container"
      class="monitor-main-content flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white relative"
      :style="mainContentStyle"
    >
      <!-- Top Navbar -->
      <Navbar
        :currentUser="currentUser"
        :activeView="activeView"
        :pendingAlertsCount="pendingAlertsCount"
        :overdueCount="overdueCount"
        :isBackendOnline="isBackendOnline"
        :totalAlerts="priorityAlerts.length"
        :totalRegulators="regulators.length"
        :totalRegulations="regulations.length"
        @changeView="activeView = $event"
        @openScopeConfig="isScopeDrawerOpen = true"
        @openOnboarding="wizardStore.openWizard(); isOnboardingModalOpen = true;"
        @retryApi="fetchLiveData"
        @updateBaseUrl="handleUpdateBaseUrl"
      />

      <!-- Dynamic Viewport: 3 Primary Purpose-Driven Views -->
      <main class="monitor-viewport flex-1 overflow-y-auto bg-neutral-50/50 w-full">
        <!-- Tab 1: News Feed -->
        <NewsFeedView
          v-if="activeView === 'news-feed'"
          :alerts="priorityAlerts"
          :directoryItems="directoryItems"
          @selectItem="handleSelectRegulationOrAlert"
          @createTaskForItems="handleOpenCreateTaskWithNews"
          @readAlert="handleDismissAlert"
          @bookmarkAlert="(alert) => handleAcknowledgeAlert(alert.id)"
          @restoreReadAlert="handleRestoreAlert"
          @toggleBookmarkDirectory="handleToggleBookmarkDirectory"
          @openDetail="handleSelectRegulationOrAlert"
        />

        <!-- Tab 2: Regulator -->
        <RegulatorView
          v-else-if="activeView === 'regulator'"
          :regulators="regulators"
          @toggleFollow="handleToggleFollowRegulator"
          @openRegulatorDetail="(reg) => { selectedRegulatorDetail = reg; isRegulatorDrawerOpen = true; }"
          @createTaskForRegulators="handleOpenCreateTaskWithRegulators"
        />

        <!-- Tab 3: Tasks -->
        <TasksView
          v-else-if="activeView === 'tasks'"
          :initialSelectedTaskId="tasksInitialTaskId"
          :regulators="regulators"
          @openCreateTaskModal="handleOpenGeneralCreateTask"
          @navigateToNewsDetail="handleSelectRegulationOrAlert"
          @navigateToRegulatorDetail="(regId) => {
            const reg = regulators.find(r => r.id === regId || r.acronym.toLowerCase() === regId.toLowerCase());
            if (reg) { selectedRegulatorDetail = reg; isRegulatorDrawerOpen = true; }
          }"
          @toggleFollowRegulator="handleToggleFollowRegulator"
          @toggleFollowRegulatorByAcronym="handleToggleFollowRegulatorByAcronym"
          @showToast="(title, msg, type) => addToast(title, msg, type)"
        />
      </main>
    </div>

    <!-- Slide-over: Detail & Evaluation Drawer -->
    <DetailDrawer
      :regulation="selectedRegulation"
      :isOpen="isDetailDrawerOpen"
      @close="isDetailDrawerOpen = false"
      @openOverrideModal="handleOpenOverrideModal"
      @openAssignModal="handleOpenAssignModal"
      @importToMonitor="handleTriggerSingleImport"
      @importToDiligence="handleTriggerSingleImport"
      @dismissRegulation="handleDismissRegulationFromDrawer"
      @createTaskForNews="(reg) => handleOpenCreateTaskWithNews([{ id: reg.id, title: reg.title, regulator: reg.regulator, regulatorAcronym: reg.regulatorAcronym }])"
      @goToTask="handleGoToTask"
    />

    <!-- Regulator Detail Drawer -->
    <RegulatorDetailDrawer
      :isOpen="isRegulatorDrawerOpen"
      :regulator="selectedRegulatorDetail"
      @close="isRegulatorDrawerOpen = false"
      @toggleFollow="handleToggleFollowRegulator"
      @createTaskForRegulator="(reg) => handleOpenCreateTaskWithRegulators([{ id: reg.id, name: reg.name, acronym: reg.acronym, jurisdiction: reg.jurisdiction }])"
      @goToTask="handleGoToTask"
    />

    <!-- Universal Create Task Modal -->
    <CreateTaskModal
      v-if="isCreateTaskModalOpen"
      :isOpen="isCreateTaskModalOpen"
      :initialNews="createTaskInitialNews"
      :initialRegulators="createTaskInitialRegulators"
      @close="isCreateTaskModalOpen = false"
      @taskCreated="handleTaskCreated"
    />

    <!-- Slide-over: Scope & Source Configuration Drawer -->
    <ScopeConfigDrawer
      v-if="isScopeDrawerOpen"
      :isOpen="isScopeDrawerOpen"
      :regulators="regulators"
      :customSources="customSources"
      :availableThemes="initialMockData.availableThemes"
      :availableJurisdictions="initialMockData.availableJurisdictions"
      :initialEditingRegulatorId="scopeEditRegulatorId"
      @close="handleCloseScopeDrawer"
      @toggleFollow="handleToggleFollowRegulator"
      @toggleSubScopeFollow="handleToggleSubScopeFollow"
      @toggleFollowAll="handleToggleFollowAllRegulators"
      @toggleCustomSourceFollow="handleToggleCustomSourceFollow"
      @triggerBackfill="handleTriggerBackfill"
      @updateRegulatorSettings="handleUpdateRegulatorSettings"
      @addCustomSource="handleAddCustomSource"
    />

    <!-- Import Collision & Version Classification Modal -->
    <ImportCollisionModal
      v-if="isImportCollisionModalOpen"
      :isOpen="isImportCollisionModalOpen"
      :incomingDocuments="incomingDocsToImport"
      :existingCatalog="existingCatalogCandidates"
      @close="() => { isImportCollisionModalOpen = false; incomingDocsToImport = []; }"
      @confirmImport="handleConfirmImportWithCollision"
    />

    <!-- Modals -->
    <OverrideModal
      v-if="isOverrideModalOpen && selectedRegulation"
      :regulation="selectedRegulation"
      :isOpen="isOverrideModalOpen"
      @close="isOverrideModalOpen = false"
      @confirmOverride="handleConfirmOverride"
    />

    <AssignModal
      v-if="isAssignModalOpen && itemToAssign"
      :item="itemToAssign"
      :isOpen="isAssignModalOpen"
      @close="isAssignModalOpen = false"
      @confirmAssign="handleConfirmAssign"
    />

    <NewFrameworkModal
      v-if="isNewFrameworkModalOpen"
      :isOpen="isNewFrameworkModalOpen"
      @close="isNewFrameworkModalOpen = false"
      @addFramework="handleAddFramework"
    />

    <!-- Unfollow Supervisory Authority Confirmation Modal -->
    <UnfollowConfirmModal
      :isOpen="Boolean(unfollowRegulatorTarget)"
      :regulator="unfollowRegulatorTarget"
      @close="unfollowRegulatorTarget = null"
      @confirm="handleConfirmUnfollow"
    />

    <!-- Historical Backfill Configuration Drawer -->
    <HistoricalBackfillDrawer
      :isOpen="Boolean(backfillRegulatorTarget)"
      :regulator="backfillRegulatorTarget"
      @close="backfillRegulatorTarget = null"
      @confirmBackfill="handleConfirmBackfill"
    />

    <!-- First-Time User Interactive Onboarding Setup Wizard Modal -->
    <OnboardingWizardModal
      :isOpen="wizardStore.isOpen || isOnboardingModalOpen"
      :existingRegulators="regulators"
      @close="isOnboardingModalOpen = false; wizardStore.closeWizard();"
      @complete="handleCompleteOnboarding"
    />
  </div>
</template>
