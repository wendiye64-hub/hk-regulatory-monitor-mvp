import { ref, computed } from 'vue';
import type {
  User,
  RegulationItem,
  PriorityAlert,
  RegulatorInScope,
  FrameworkCardData,
  CustomSourceRegistration,
  MatrixSessionState,
  RegulatoryDirectoryItem,
  DiligenceProject,
  CoverageGapDiagnostic,
} from '@/types';
import { initialMockData } from '@/data/mockData';
import { GLOBAL_REGULATORY_DIRECTORY, INITIAL_DILIGENCE_PROJECTS } from '@/data/directoryData';
import { INITIAL_MATRIX_SESSIONS } from '@/data/matrixMockData';
import { api } from '@/services/api';

/**
 * Single Unified Reactive Store
 * Completely eliminates state desynchronization between App.vue and api.ts mockStore.
 */

// --- Primary Reactive State ---
const currentUser = ref<User>({ ...initialMockData.currentUser });
const regulations = ref<RegulationItem[]>([...initialMockData.regulations]);
const priorityAlerts = ref<PriorityAlert[]>([...initialMockData.priorityAlerts]);
const regulators = ref<RegulatorInScope[]>([...initialMockData.regulatorsInScope]);
const frameworks = ref<FrameworkCardData[]>([...initialMockData.frameworkCards]);
const customSources = ref<CustomSourceRegistration[]>([...initialMockData.customSources]);
const coverageGaps = ref<CoverageGapDiagnostic>({
  hasGaps: initialMockData.coverageBanner.hasGaps,
  exceedingSlaCount: initialMockData.coverageBanner.exceedingSlaCount,
  brokenEndpointsCount: initialMockData.coverageBanner.brokenEndpointsCount,
  summaryText: initialMockData.coverageBanner.summaryText,
  endpointDetails: initialMockData.coverageBanner.endpointDetails,
});
const directoryItems = ref<RegulatoryDirectoryItem[]>([...GLOBAL_REGULATORY_DIRECTORY]);
const diligenceProjects = ref<DiligenceProject[]>([...INITIAL_DILIGENCE_PROJECTS]);
const matrixSessions = ref<MatrixSessionState[]>([...INITIAL_MATRIX_SESSIONS]);
const activeMatrixSessionId = ref<string>(INITIAL_MATRIX_SESSIONS[0]?.sessionId || 'session-default');

// --- Derived Computeds ---
const pendingAlertsCount = computed(
  () => priorityAlerts.value.filter((a) => a.status === 'pending').length
);

const overdueCount = computed(
  () => priorityAlerts.value.filter((a) => a.isOverdueSLA && a.status === 'pending').length
);

const followedRegulationIds = computed(() => {
  return new Set(
    regulations.value
      .filter((r) => r.diligenceStatus === 'Imported' || r.diligenceStatus === 'Monitored')
      .map((r) => r.id)
  );
});

// Acknowledged/Imported items stay in scope; dismissed items excluded
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

// --- Store Action Handlers ---
export const useComplianceStore = () => {
  // Sync state with backend if available
  const initialize = async () => {
    try {
      const [userRes, regsRes, alertsRes, scopeRes] = await Promise.all([
        api.user.getCurrentUser(),
        api.regulations.list({ limit: 100 }),
        api.alerts.list(),
        api.scope.getRegulatorsInScope(),
      ]);
      if (userRes) currentUser.value = userRes;
      if (regsRes?.items?.length) regulations.value = regsRes.items;
      if (alertsRes?.length) priorityAlerts.value = alertsRes;
      if (scopeRes?.length) regulators.value = scopeRes;
    } catch (err) {
      console.warn('API store sync failed, continuing with unified memory store:', err);
    }
  };

  // Follow / Unfollow Regulator
  const toggleFollowRegulator = async (regulatorId: string, forceState?: boolean) => {
    const reg = regulators.value.find(
      (r) =>
        r.id === regulatorId ||
        r.acronym.toLowerCase() === regulatorId.toLowerCase() ||
        r.name.toLowerCase() === regulatorId.toLowerCase()
    );
    if (!reg) return;

    const nextState = forceState !== undefined ? forceState : !reg.isFollowed;
    reg.isFollowed = nextState;

    try {
      await api.scope.toggleFollow(reg.id, nextState);
    } catch (e) {
      console.warn('Backend toggleFollow fallback', e);
    }
  };

  // Toggle SubScope Follow
  const toggleSubScopeFollow = (regulatorId: string, subScopeId: string) => {
    const reg = regulators.value.find((r) => r.id === regulatorId);
    if (!reg) return;
    const sub = reg.subScopes.find((s) => s.id === subScopeId);
    if (!sub) return;
    sub.isFollowed = !sub.isFollowed;
  };

  // Update Cadence
  const updateRegulatorCadence = async (regulatorId: string, cadence: RegulatorInScope['cadence']) => {
    const reg = regulators.value.find((r) => r.id === regulatorId);
    if (!reg) return;
    reg.cadence = cadence;
    try {
      await api.scope.updateCadence(regulatorId, cadence);
    } catch (e) {
      console.warn('Backend updateCadence fallback', e);
    }
  };

  // Alert Lifecycle Actions
  const acknowledgeAlert = async (alertId: string) => {
    const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
    if (!targetAlert) return;

    targetAlert.status = 'acknowledged';
    targetAlert.actionDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    targetAlert.actionDetails = 'Acknowledged and added to active in-scope surveillance.';

    // Ensure corresponding regulation is marked as Monitored
    const reg = regulations.value.find((r) => r.id === targetAlert.regulationId);
    if (reg && reg.diligenceStatus !== 'Imported') {
      reg.diligenceStatus = 'Monitored';
    }

    try {
      await api.alerts.updateStatus(alertId, 'acknowledged', targetAlert.actionDetails);
    } catch (e) {
      console.warn('Backend acknowledgeAlert fallback', e);
    }
  };

  const dismissAlert = async (alertId: string, reason?: string) => {
    const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
    if (!targetAlert) return;

    targetAlert.status = 'dismissed';
    targetAlert.actionDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    targetAlert.actionDetails = reason || 'Dismissed as non-applicable to current operational scope.';

    try {
      await api.alerts.dismiss(alertId, targetAlert.actionDetails);
    } catch (e) {
      console.warn('Backend dismissAlert fallback', e);
    }
  };

  const assignAlert = async (alertId: string, assigneeName: string) => {
    const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
    if (!targetAlert) return;

    targetAlert.assignedTo = assigneeName;
    targetAlert.status = 'pending';
    targetAlert.actionDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    targetAlert.actionDetails = `Assigned to ${assigneeName} for impact assessment.`;
  };

  const restoreAlert = (alertId: string) => {
    const targetAlert = priorityAlerts.value.find((a) => a.id === alertId);
    if (!targetAlert) return;
    targetAlert.status = 'pending';
    targetAlert.actionDate = undefined;
    targetAlert.actionDetails = undefined;
  };

  // Import Regulation into Diligence Scope
  const importRegulations = (regulationIds: string[]) => {
    const idSet = new Set(regulationIds);
    regulations.value.forEach((r) => {
      if (idSet.has(r.id)) {
        r.diligenceStatus = 'Imported';
      }
    });

    directoryItems.value.forEach((d) => {
      if (idSet.has(d.id)) {
        d.diligenceStatus = 'Imported';
        d.status = 'Following';
      }
    });

    priorityAlerts.value.forEach((a) => {
      if (idSet.has(a.regulationId)) {
        a.status = 'imported';
      }
    });
  };

  // Add Custom Source
  const addCustomSource = (source: CustomSourceRegistration) => {
    customSources.value.unshift(source);
    // Add to regulators
    const newReg: RegulatorInScope = {
      id: source.id,
      name: source.regulator,
      acronym: (source.regulator || 'SRC').slice(0, 4).toUpperCase(),
      jurisdiction: source.jurisdiction,
      category: source.category || 'Financial Services & Capital Markets',
      isFollowed: true,
      cadence: 'Daily',
      themes: source.themes || [],
      lastChecked: 'Active sync (dynamic telemetry)',
      latestPublication: `Custom registered endpoint: ${source.url}`,
      health: 'Healthy',
      openAlertsCount: 0,
      owner: source.createdBy,
      officialEndpoint: source.url,
      endpointLatencyMs: 160,
      subScopes: [],
    };
    regulators.value.unshift(newReg);
  };

  // Add Compliance Framework
  const addFramework = (framework: FrameworkCardData) => {
    frameworks.value.unshift(framework);
  };

  return {
    currentUser,
    regulations,
    priorityAlerts,
    regulators,
    frameworks,
    customSources,
    coverageGaps,
    directoryItems,
    diligenceProjects,
    matrixSessions,
    activeMatrixSessionId,
    pendingAlertsCount,
    overdueCount,
    followedRegulationIds,
    regulationsInScope,
    initialize,
    toggleFollowRegulator,
    toggleSubScopeFollow,
    updateRegulatorCadence,
    acknowledgeAlert,
    dismissAlert,
    assignAlert,
    restoreAlert,
    importRegulations,
    addCustomSource,
    addFramework,
  };
};
