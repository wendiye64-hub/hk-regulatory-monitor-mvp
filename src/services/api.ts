import type {
  User,
  RegulationItem,
  PriorityAlert,
  RegulatorInScope,
  FrameworkCardData,
  CustomSourceRegistration,
  RegulatoryDirectoryItem,
  DiligenceProject,
  MatrixSessionState,
  AuditEntry,
  CoverageBannerData,
  HealthStatus,
  RegulatoryCategory,
  SectorGroup,
  SourceCategory,
} from '@/types';
import { SECTOR_GROUPS, SOURCE_CATEGORIES } from '@/types';
import { initialMockData } from '@/data/mockData';
import { GLOBAL_REGULATORY_DIRECTORY, INITIAL_DILIGENCE_PROJECTS } from '@/data/directoryData';
import { INITIAL_MATRIX_SESSIONS } from '@/data/matrixMockData';
import {
  GLOBAL_SOURCE_REGISTRY_MOCK,
  mapSourceRegistryRowToRegulator,
  RawGlobalSourceRow
} from '@/data/sourceRegistryData';
import {
  adaptBackendCatalogToRegulators,
  adaptBackendMonitorFeed,
  RawBackendSourceCatalogResponse,
  RawBackendSourceCatalogItem,
  RawBackendMonitorFeedResponse,
  RawBackendMonitorFeedItem,
  IngestedMonitorFeedResult,
} from './backendAdapters';

/**
 * Global API configuration & endpoint constants.
 * In production or dev mode with a backend, set VITE_API_BASE_URL (e.g. 'https://api.yourcompany.com/v1').
 * If no backend is detected or requests fail, the API client automatically falls back to the in-memory mock dataset.
 */
export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
  enableFallback: boolean;
  headers: Record<string, string>;
}

export type DataMode = 'static' | 'api' | 'hybrid';

const savedDataMode =
  typeof window !== 'undefined'
    ? localStorage.getItem('hk_monitor_data_mode')
    : null;
const configuredDataMode = String(
  (import.meta as any).env?.VITE_DATA_MODE || savedDataMode || 'static'
).toLowerCase();

/**
 * static: bundled crawler JSON only (GitHub/GitLab Pages)
 * api: backend only, with the existing in-memory demo fallback
 * hybrid: backend first, then bundled crawler JSON, then in-memory demo data
 */
export let dataMode: DataMode = ['static', 'api', 'hybrid'].includes(configuredDataMode)
  ? (configuredDataMode as DataMode)
  : 'static';

export const getDataMode = (): DataMode => dataMode;

export const setDataMode = (mode: DataMode) => {
  dataMode = mode;
  if (typeof window !== 'undefined') {
    localStorage.setItem('hk_monitor_data_mode', mode);
  }
};

const savedCustomUrl =
  typeof window !== 'undefined'
    ? localStorage.getItem('hk_monitor_custom_api_url')
    : null;

export const defaultApiConfig: ApiConfig = {
  baseUrl: savedCustomUrl || (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8050/api/v1',
  timeoutMs: Number((import.meta as any).env?.VITE_API_TIMEOUT_MS || 4000),
  enableFallback: true, // Enabled fallback to restored mock dataset
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

export const setCustomBaseUrl = (url: string) => {
  defaultApiConfig.baseUrl = url.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    localStorage.setItem('hk_monitor_custom_api_url', defaultApiConfig.baseUrl);
  }
  if (dataMode === 'static') setDataMode('hybrid');
};

// Internal API health & connection indicator state
let isBackendReachable = false;
let hasCheckedHealth = false;

export const getBackendStatus = () => ({
  reachable: isBackendReachable,
  checked: hasCheckedHealth,
  baseUrl: defaultApiConfig.baseUrl,
});

/**
 * Read the static crawler artifacts that are shipped with the frontend.
 * This is the primary data path for GitHub/GitLab Pages, where no API server
 * is available. Vite's BASE_URL keeps the request working under a project
 * sub-path such as /hk-regulatory-monitor-mvp/.
 */
async function readStaticArtifact<T>(path: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  try {
    const baseUrl = (import.meta as any).env?.BASE_URL || './';
    const response = await fetch(`${baseUrl}${path.replace(/^\//, '')}?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Robust fetch wrapper with timeout and fallback support
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackFn: () => Promise<T> | T
): Promise<{ data: T; isFallback: boolean; error?: Error }> {
  // The configured base URL is the single source of truth. The default already
  // points to local port 8050, so adding a second hard-coded candidate only
  // causes duplicate timeouts when a remote/custom API is configured.
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const urlsToTry = [`${defaultApiConfig.baseUrl.replace(/\/$/, '')}/${cleanEndpoint}`];

  for (const url of urlsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), defaultApiConfig.timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...defaultApiConfig.headers,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        isBackendReachable = true;
        hasCheckedHealth = true;
        return { data: json as T, isFallback: false };
      }
    } catch {
      clearTimeout(timeoutId);
      // Continue to next URL candidate or fallback
    }
  }

  isBackendReachable = false;
  hasCheckedHealth = true;

  if (defaultApiConfig.enableFallback) {
    const mockResult = await fallbackFn();
    return { data: mockResult, isFallback: true };
  }

  throw new Error(`Failed to fetch from ${endpoint} and fallback is disabled`);
}

// ==========================================
// Global Source Registry (Excel/DB Adapter)
// ==========================================
export type { RawGlobalSourceRow } from '@/data/sourceRegistryData';
export { mapSourceRegistryRowToRegulator } from '@/data/sourceRegistryData';

// ==========================================
// In-Memory Simulated State Store (Fallback)
// ==========================================
// Initialized directly with mapped entities from GLOBAL_SOURCE_REGISTRY_MOCK
const INITIAL_REGISTRY_REGULATORS: RegulatorInScope[] = GLOBAL_SOURCE_REGISTRY_MOCK.map((row) =>
  mapSourceRegistryRowToRegulator(row as RawGlobalSourceRow)
);

const mockStore = {
  currentUser: { ...initialMockData.currentUser },
  regulations: [...initialMockData.regulations],
  priorityAlerts: [...initialMockData.priorityAlerts],
  regulatorsInScope: [...initialMockData.regulatorsInScope],
  frameworkCards: [...initialMockData.frameworkCards],
  customSources: [...initialMockData.customSources],
  coverageBanner: {
    identifiedGapsCount: 0,
    unmonitoredRegulatorsCount: 0,
    suggestedAdditions: [],
  },
  directoryItems: [...GLOBAL_REGULATORY_DIRECTORY],
  diligenceProjects: [...INITIAL_DILIGENCE_PROJECTS],
  matrixSessions: [...INITIAL_MATRIX_SESSIONS],
};

// ==========================================
// API Query Parameter Types
// ==========================================
export interface RegulationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  theme?: string;
  category?: string;
  jurisdiction?: string;
  regulatorAcronym?: string;
  materiality?: string;
  diligenceStatus?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScopeUpdatePayload {
  selectedArchetype: string;
  selectedMarkets: string[];
  businessSpecifics?: string;
  selectedRegulatorIds: string[];
  updatedAt?: string;
}

async function loadStaticRegulationPage(
  params: RegulationQueryParams
): Promise<PaginatedResult<RegulationItem> | null> {
  const staticFeed = await readStaticArtifact<RawBackendMonitorFeedResponse>('data/latest-run.json');
  if (!staticFeed?.items?.length) return null;

  const { regulations } = adaptBackendMonitorFeed(staticFeed);
  let filtered = regulations;
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.regulatorAcronym.toLowerCase().includes(q)
    );
  }
  if (params.theme) filtered = filtered.filter((r) => r.themes.includes(params.theme!));
  if (params.category) filtered = filtered.filter((r) => r.category === params.category);
  if (params.jurisdiction) {
    filtered = filtered.filter((r) => r.jurisdiction === params.jurisdiction);
  }

  return {
    items: filtered,
    total: filtered.length,
    page: 1,
    limit: filtered.length,
    totalPages: 1,
  };
}

async function loadStaticAlerts(): Promise<PriorityAlert[] | null> {
  const staticFeed = await readStaticArtifact<RawBackendMonitorFeedResponse>('data/latest-run.json');
  if (!staticFeed?.items?.length) return null;
  const { alerts, regulations } = adaptBackendMonitorFeed(staticFeed);
  mockStore.regulations = regulations;
  return alerts;
}

async function loadStaticRegulators(): Promise<RegulatorInScope[] | null> {
  const staticCatalog = await readStaticArtifact<RawBackendSourceCatalogResponse>(
    'data/hk-update-source-catalog.json'
  );
  if (!staticCatalog?.sources?.length) return null;

  const regulators = adaptBackendCatalogToRegulators(staticCatalog);
  const staticFeed = await readStaticArtifact<RawBackendMonitorFeedResponse>('data/latest-run.json');

  for (const regulator of regulators) {
    const runs = (staticFeed?.source_runs || []).filter((run) =>
      run.label.toUpperCase().startsWith(regulator.acronym.toUpperCase())
    );
    if (!runs.length) continue;

    const knownSourceIds = new Set((regulator.subScopes || []).map((scope) => scope.code));
    for (const run of runs) {
      if (knownSourceIds.has(run.source_id)) continue;
      regulator.subScopes = [
        ...(regulator.subScopes || []),
        {
          id: `${regulator.id}-run-${run.source_id.toLowerCase()}`,
          name: run.label,
          code: run.source_id,
          description: `${run.count ?? 0} publications collected in ${run.duration_ms ?? 0} ms`,
          isFollowed: true,
          cadence: 'Daily',
          themes: ['Live validated collector'],
          openAlertsCount: run.count ?? 0,
        },
      ];
    }

    regulator.health = runs.every((run) => run.status === 'fulfilled')
      ? 'Healthy'
      : runs.some((run) => run.status === 'fulfilled')
        ? 'Degraded'
        : 'Failed';
    regulator.isFollowed = true;
    regulator.lastChecked = staticFeed?.generated_at || regulator.lastChecked;
    regulator.latestPublication = `${runs.length} validated collector${runs.length === 1 ? '' : 's'} in latest run`;
    regulator.openAlertsCount = runs.reduce((sum, run) => sum + (run.count ?? 0), 0);
  }

  return regulators;
}

// ==========================================
// Centralized API Service Modules
// ==========================================
export const api = {
  /**
   * Health check to detect backend presence
   */
  async checkHealth(): Promise<{ status: string; reachable: boolean }> {
    try {
      const res = await request('/health', { method: 'GET' }, () => ({
        status: 'ok',
        mode: 'mock-fallback',
      }));
      return { status: 'healthy', reachable: !res.isFallback };
    } catch {
      return { status: 'offline', reachable: false };
    }
  },

  // ----------------------------------------
  // User & Workspace Profile
  // ----------------------------------------
  user: {
    async getCurrentUser(): Promise<User> {
      const res = await request<User>('/user/me', { method: 'GET' }, () => mockStore.currentUser);
      return res.data;
    },

    async updatePreferences(updates: Partial<User>): Promise<User> {
      const res = await request<User>(
        '/user/preferences',
        { method: 'PATCH', body: JSON.stringify(updates) },
        () => {
          Object.assign(mockStore.currentUser, updates);
          return mockStore.currentUser;
        }
      );
      return res.data;
    },
  },

  // ----------------------------------------
  // Regulations & Active In-Scope Feed
  // ----------------------------------------
  regulations: {
    async list(params: RegulationQueryParams = {}): Promise<PaginatedResult<RegulationItem>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.theme) query.set('theme', params.theme);
      if (params.category) query.set('category', params.category);
      if (params.jurisdiction) query.set('jurisdiction', params.jurisdiction);
      if (params.sortField) query.set('sortField', params.sortField);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString() ? `?${query.toString()}` : '';

      if (dataMode === 'static') {
        const staticPage = await loadStaticRegulationPage(params);
        if (staticPage) return staticPage;
      }

      // First attempt primary backend route /regulatory/updates/latest
      let res = await request<any>(
        `/regulatory/updates/latest${qs}`,
        { method: 'GET' },
        () => null
      );

      // If query-based path failed, try without query parameters
      if (res.isFallback || !res.data) {
        res = await request<any>(
          '/regulatory/updates/latest',
          { method: 'GET' },
          () => null
        );
      }

      // If still no response, try /regulations endpoint
      if (res.isFallback || !res.data) {
        res = await request<any>(
          `/regulations${qs}`,
          { method: 'GET' },
          () => null
        );
      }

      if (!res.data && dataMode === 'hybrid') {
        const staticPage = await loadStaticRegulationPage(params);
        if (staticPage) return staticPage;
      }

      if (!res.data) {
        let filtered = [...mockStore.regulations];
        if (params.search) {
          const q = params.search.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.referenceNumber.toLowerCase().includes(q) ||
              r.regulatorAcronym.toLowerCase().includes(q)
          );
        }
        if (params.theme) {
          filtered = filtered.filter((r) => r.themes.includes(params.theme!));
        }
        if (params.category) {
          filtered = filtered.filter((r) => r.category === params.category);
        }
        if (params.jurisdiction) {
          filtered = filtered.filter((r) => r.jurisdiction === params.jurisdiction);
        }
        return {
          items: filtered,
          total: filtered.length,
          page: 1,
          limit: params.limit || 50,
          totalPages: Math.ceil(filtered.length / (params.limit || 50)) || 1,
        };
      }

      // Extract items from any response envelope
      const rawData = res.data;
      let rawList: any[] = [];
      if (Array.isArray(rawData)) {
        rawList = rawData;
      } else if (Array.isArray(rawData.items)) {
        rawList = rawData.items;
      } else if (Array.isArray(rawData.updates)) {
        rawList = rawData.updates;
      } else if (Array.isArray(rawData.regulations)) {
        rawList = rawData.regulations;
      } else if (Array.isArray(rawData.data)) {
        rawList = rawData.data;
      }

      if (rawList.length > 0) {
        const first = rawList[0];
        // If raw monitor crawler items
        if (first.publication_date || first.impact_status || first.source_id || first.source_label) {
          const { regulations } = adaptBackendMonitorFeed(rawList);
          let filtered = regulations;
          if (params.search) {
            const q = params.search.toLowerCase();
            filtered = filtered.filter(
              (r) =>
                r.title.toLowerCase().includes(q) ||
                r.referenceNumber.toLowerCase().includes(q) ||
                r.regulatorAcronym.toLowerCase().includes(q)
            );
          }
          return {
            items: filtered,
            total: filtered.length,
            page: 1,
            limit: filtered.length,
            totalPages: 1,
          };
        } else {
          // Standard RegulationItem format
          return {
            items: rawList as RegulationItem[],
            total: rawData.total || rawList.length,
            page: rawData.page || 1,
            limit: rawData.limit || rawList.length,
            totalPages: rawData.totalPages || 1,
          };
        }
      }

      return {
        items: [],
        total: 0,
        page: 1,
        limit: params.limit || 50,
        totalPages: 0,
      };
    },

    async getById(id: string): Promise<RegulationItem | null> {
      const res = await request<RegulationItem | null>(
        `/regulations/${encodeURIComponent(id)}`,
        { method: 'GET' },
        () => mockStore.regulations.find((r) => r.id === id) || null
      );
      return res.data;
    },

    async updateDiligenceStatus(
      id: string,
      status: RegulationItem['diligenceStatus'],
      performedBy: string,
      details: string
    ): Promise<RegulationItem> {
      const res = await request<RegulationItem>(
        `/regulations/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, performedBy, details }),
        },
        () => {
          const item = mockStore.regulations.find((r) => r.id === id);
          if (!item) throw new Error(`Regulation ${id} not found`);
          item.diligenceStatus = status;
          const audit: AuditEntry = {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: `Diligence Status -> ${status}`,
            performedBy,
            details,
          };
          item.auditTimeline = [audit, ...(item.auditTimeline || [])];
          return item;
        }
      );
      return res.data;
    },

    async recordOverride(
      id: string,
      field: 'materiality' | 'relevance',
      newTier: string,
      justification: string,
      user: string
    ): Promise<RegulationItem> {
      const res = await request<RegulationItem>(
        `/regulations/${encodeURIComponent(id)}/override`,
        {
          method: 'POST',
          body: JSON.stringify({ field, newTier, justification, user }),
        },
        () => {
          const item = mockStore.regulations.find((r) => r.id === id);
          if (!item) throw new Error(`Regulation ${id} not found`);
          const previousTier = field === 'materiality' ? item.materiality : `${item.aiRelevanceScore}%`;
          if (field === 'materiality') {
            item.materiality = newTier as any;
          }
          item.overrides = [
            {
              timestamp: new Date().toISOString(),
              user,
              field,
              previousTier,
              newTier,
              justification,
            },
            ...(item.overrides || []),
          ];
          return item;
        }
      );
      return res.data;
    },
  },

  // ----------------------------------------
  // Priority Alerts & SLA Management
  // ----------------------------------------
  alerts: {
    async list(): Promise<PriorityAlert[]> {
      if (dataMode === 'static') {
        const staticAlerts = await loadStaticAlerts();
        if (staticAlerts) return staticAlerts;
      }

      // First attempt live backend endpoint: /regulatory/updates/latest
      let res = await request<any>(
        '/regulatory/updates/latest',
        { method: 'GET' },
        () => null
      );

      if (res.isFallback || !res.data) {
        res = await request<any>('/alerts', { method: 'GET' }, () => mockStore.priorityAlerts);
      }

      if (!res.data && dataMode === 'hybrid') {
        const staticAlerts = await loadStaticAlerts();
        if (staticAlerts) return staticAlerts;
      }

      if (!res.data) {
        return [...mockStore.priorityAlerts];
      }

      // If the response is wrapped from the raw backend monitor feed ({ generated_at, items: [...] })
      if (res.data && Array.isArray(res.data.items)) {
        const { alerts, regulations } = adaptBackendMonitorFeed(res.data as RawBackendMonitorFeedResponse);
        // Synchronize in-memory fallback regulations store with detected items
        if (regulations.length > 0) {
          const existingIds = new Set(mockStore.regulations.map((r) => r.id));
          const newRegs = regulations.filter((r) => !existingIds.has(r.id));
          mockStore.regulations = [...newRegs, ...mockStore.regulations];
        }
        return alerts;
      }

      if (res.data && Array.isArray(res.data.updates)) {
        const { alerts } = adaptBackendMonitorFeed(res.data.updates);
        return alerts;
      }

      if (Array.isArray(res.data)) {
        // If it is an array of raw monitor items with publication_date & impact_status
        if (res.data.length > 0 && (res.data[0].publication_date || res.data[0].impact_status)) {
          const { alerts } = adaptBackendMonitorFeed(res.data);
          return alerts;
        }

        return res.data.map((item, idx) => {
          // If the backend returns raw notification from their URL crawler update
          if (item['Authority Name'] || item['Authority Abbreviation'] || item.source_id || item.has_update) {
            const acronym = (item['Authority Abbreviation'] || item.acronym || 'REG').toUpperCase();
            const jurisdiction = item['Jurisdiction'] || item.jurisdiction || 'Global';
            return {
              id: item.id || `alert-${item['Source ID'] || item.source_id || idx}-${Date.now()}`,
              title: item.title || `Official Supervisory Release from ${acronym}`,
              regulator: item['Authority Name'] || item.regulator || acronym,
              regulatorAcronym: acronym,
              jurisdiction,
              materiality: item.materiality || 'High',
              aiRelevanceSummary: item['Summary'] || item.summary || `Live supervisory update detected from ${acronym} official portal (${item['URL'] || item.url || ''}).`,
              publishDate: item.publishDate || new Date().toISOString().slice(0, 10),
              effectiveDate: item.effectiveDate || new Date().toISOString().slice(0, 10),
              slaDeadline: '48h from detection',
              isOverdueSLA: false,
              status: item.status || 'pending',
              regulationId: item.regulationId || `reg-${item['Source ID'] || item.source_id || idx}`,
            } as PriorityAlert;
          }
          return item as PriorityAlert;
        });
      }
      return [];
    },

    async updateStatus(
      id: string,
      status: PriorityAlert['status'],
      actionDetails?: string
    ): Promise<PriorityAlert> {
      const res = await request<PriorityAlert>(
        `/alerts/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, actionDetails }),
        },
        () => {
          const alert = mockStore.priorityAlerts.find((a) => a.id === id);
          if (!alert) throw new Error(`Alert ${id} not found`);
          alert.status = status;
          if (actionDetails) {
            alert.actionDetails = actionDetails;
            alert.actionDate = new Date().toISOString();
          }
          return alert;
        }
      );
      return res.data;
    },

    async dismiss(id: string, reason: string): Promise<PriorityAlert> {
      return this.updateStatus(id, 'dismissed', `Dismissed: ${reason}`);
    },
  },

  // ----------------------------------------
  // Regulatory Scope & Monitor Configuration
  // ----------------------------------------
  scope: {
    async getRegulatorsInScope(): Promise<RegulatorInScope[]> {
      if (dataMode === 'static') {
        const staticRegulators = await loadStaticRegulators();
        if (staticRegulators) return staticRegulators;
      }

      // First attempt live backend endpoint: /regulatory/sources
      let res = await request<any>(
        '/regulatory/sources',
        { method: 'GET' },
        () => null
      );

      if (res.isFallback || !res.data) {
        res = await request<any>(
          '/scope/regulators',
          { method: 'GET' },
          () => mockStore.regulatorsInScope
        );
      }

      // If the backend returns the raw sources catalog wrapped in { catalog_id, sources: [...] }
      if (res.data && Array.isArray(res.data.sources)) {
        return adaptBackendCatalogToRegulators(res.data as RawBackendSourceCatalogResponse);
      }

      if (Array.isArray(res.data)) {
        // If the backend returns raw source items with activation_state / onboarding_route
        if (res.data.length > 0 && (res.data[0].activation_state || res.data[0].onboarding_route || res.data[0].source_id)) {
          return adaptBackendCatalogToRegulators(res.data);
        }

        return res.data.map((item) => {
          // If the backend returns raw rows matching the Excel global_source_registry schema
          if (item['Authority Name'] || item['Authority Abbreviation'] || item.authority_name) {
            return mapSourceRegistryRowToRegulator(item);
          }
          return item as RegulatorInScope;
        });
      }
      if (dataMode === 'hybrid') {
        const staticRegulators = await loadStaticRegulators();
        if (staticRegulators) return staticRegulators;
      }
      return [...mockStore.regulatorsInScope];
    },

    async toggleFollow(id: string, isFollowed: boolean): Promise<RegulatorInScope> {
      const res = await request<RegulatorInScope>(
        `/scope/regulators/${encodeURIComponent(id)}/follow`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isFollowed }),
        },
        () => {
          const targetId = id.toLowerCase();
          const reg = mockStore.regulatorsInScope.find(
            (r) =>
              r.id.toLowerCase() === targetId ||
              r.acronym.toLowerCase() === targetId ||
              r.name.toLowerCase() === targetId
          );
          if (!reg) throw new Error(`Regulator ${id} not found`);
          reg.isFollowed = isFollowed;
          return reg;
        }
      );
      return res.data;
    },

    async updateCadence(id: string, cadence: RegulatorInScope['cadence']): Promise<RegulatorInScope> {
      const res = await request<RegulatorInScope>(
        `/scope/regulators/${encodeURIComponent(id)}/cadence`,
        {
          method: 'PATCH',
          body: JSON.stringify({ cadence }),
        },
        () => {
          const targetId = id.toLowerCase();
          const reg = mockStore.regulatorsInScope.find(
            (r) =>
              r.id.toLowerCase() === targetId ||
              r.acronym.toLowerCase() === targetId ||
              r.name.toLowerCase() === targetId
          );
          if (!reg) throw new Error(`Regulator ${id} not found`);
          reg.cadence = cadence;
          return reg;
        }
      );
      return res.data;
    },

    async saveOnboardingProfile(payload: ScopeUpdatePayload): Promise<{ success: boolean; message: string }> {
      const res = await request<{ success: boolean; message: string }>(
        '/scope/onboarding',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        () => {
          // Update mock regulators following status based on selection
          const selectedSet = new Set(payload.selectedRegulatorIds);
          mockStore.regulatorsInScope.forEach((r) => {
            if (selectedSet.has(r.id)) {
              r.isFollowed = true;
            }
          });
          return {
            success: true,
            message: `Profile saved successfully with ${payload.selectedRegulatorIds.length} regulators in scope.`,
          };
        }
      );
      return res.data;
    },
  },

  // ----------------------------------------
  // Global Directory & Historical Repository
  // ----------------------------------------
  directory: {
    async list(params: RegulationQueryParams = {}): Promise<PaginatedResult<RegulatoryDirectoryItem>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.jurisdiction) query.set('jurisdiction', params.jurisdiction);
      if (params.category) query.set('category', params.category);

      const qs = query.toString() ? `?${query.toString()}` : '';

      const res = await request<PaginatedResult<RegulatoryDirectoryItem>>(
        `/directory${qs}`,
        { method: 'GET' },
        () => {
          let list = [...mockStore.directoryItems];
          if (params.search) {
            const q = params.search.toLowerCase();
            list = list.filter(
              (d) =>
                d.title.toLowerCase().includes(q) ||
                d.referenceNumber.toLowerCase().includes(q) ||
                d.regulator.toLowerCase().includes(q)
            );
          }
          if (params.jurisdiction) {
            list = list.filter((d) => d.jurisdiction === params.jurisdiction);
          }
          const page = params.page || 1;
          const limit = params.limit || 50;
          const total = list.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const start = (page - 1) * limit;
          const items = list.slice(start, start + limit);

          return { items, total, page, limit, totalPages };
        }
      );
      return res.data;
    },

    async getDiligenceProjects(): Promise<DiligenceProject[]> {
      const res = await request<DiligenceProject[]>(
        '/directory/projects',
        { method: 'GET' },
        () => mockStore.diligenceProjects
      );
      return res.data;
    },
  },

  // ----------------------------------------
  // Compliance Frameworks & Matrix Sessions
  // ----------------------------------------
  frameworks: {
    async list(): Promise<FrameworkCardData[]> {
      const res = await request<FrameworkCardData[]>(
        '/frameworks',
        { method: 'GET' },
        () => mockStore.frameworkCards
      );
      return res.data;
    },
  },

  matrix: {
    async listSessions(): Promise<MatrixSessionState[]> {
      const res = await request<MatrixSessionState[]>(
        '/matrix/sessions',
        { method: 'GET' },
        () => mockStore.matrixSessions
      );
      return res.data;
    },

    async saveSession(session: MatrixSessionState): Promise<MatrixSessionState> {
      const res = await request<MatrixSessionState>(
        '/matrix/sessions',
        {
          method: 'POST',
          body: JSON.stringify(session),
        },
        () => {
          const idx = mockStore.matrixSessions.findIndex((s) => s.sessionId === session.sessionId);
          if (idx >= 0) {
            mockStore.matrixSessions[idx] = session;
          } else {
            mockStore.matrixSessions.unshift(session);
          }
          return session;
        }
      );
      return res.data;
    },
  },

  // ----------------------------------------
  // Direct Raw Backend Ingestion Utilities
  // ----------------------------------------
  overview: {
    /**
     * Queries the aggregated regulatory overview from backend
     */
    async getOverview(): Promise<any> {
      const res = await request<any>(
        '/regulatory/overview',
        { method: 'GET' },
        () => ({
          sourcesCount: mockStore.regulatorsInScope.length,
          alertsCount: mockStore.priorityAlerts.length,
          regulationsCount: mockStore.regulations.length,
          status: 'healthy',
        })
      );
      return res.data;
    },
  },

  ingest: {
    /**
     * Ingests a raw Hong Kong source catalog JSON directly into the in-memory scope store.
     */
    ingestSourceCatalog(catalogData: RawBackendSourceCatalogResponse | RawBackendSourceCatalogItem[]): RegulatorInScope[] {
      const adapted = adaptBackendCatalogToRegulators(catalogData);
      mockStore.regulatorsInScope = adapted;
      return adapted;
    },

    /**
     * Ingests a raw Hong Kong monitor feed update JSON directly into alerts & regulations store.
     */
    ingestMonitorFeed(feedData: RawBackendMonitorFeedResponse | RawBackendMonitorFeedItem[]): IngestedMonitorFeedResult {
      const result = adaptBackendMonitorFeed(feedData);
      mockStore.priorityAlerts = [...result.alerts, ...mockStore.priorityAlerts];
      mockStore.regulations = [...result.regulations, ...mockStore.regulations];
      return result;
    },
  },
};

export default api;
