import mockDataRaw from './mockData.json';
import {
  User,
  CoverageBannerData,
  PriorityAlert,
  RegulationItem,
  RegulatorInScope,
  FrameworkCardData,
  CopilotSession,
  EvidenceCardData,
  CustomSourceRegistration,
  normalizeRelevance,
  ALL_JURISDICTIONS,
} from '../types';
import {
  GLOBAL_SOURCE_REGISTRY_MOCK,
  mapSourceRegistryRowToRegulator,
  RawGlobalSourceRow
} from './sourceRegistryData';

export interface MockDatabase {
  currentUser: User;
  coverageBanner: {
    hasGaps: boolean;
    exceedingSlaCount: number;
    brokenEndpointsCount: number;
    summaryText: string;
    endpointDetails: string;
  };
  priorityAlerts: PriorityAlert[];
  regulations: RegulationItem[];
  regulatorsInScope: RegulatorInScope[];
  frameworkCards: FrameworkCardData[];
  copilotSessions: CopilotSession[];
  evidenceCards: EvidenceCardData[];
  customSources: CustomSourceRegistration[];
  availableThemes: string[];
  availableJurisdictions: string[];
}

const rawDb = mockDataRaw as unknown as MockDatabase;

// Single Source of Truth: Seed initial regulators directly from standardized GLOBAL_SOURCE_REGISTRY_MOCK
const registryRegulators: RegulatorInScope[] = GLOBAL_SOURCE_REGISTRY_MOCK.map((row) =>
  mapSourceRegistryRowToRegulator(row as RawGlobalSourceRow)
);

export const initialMockData: MockDatabase = {
  ...rawDb,
  priorityAlerts: (rawDb.priorityAlerts || []).map((a) => ({
    ...a,
    materiality: normalizeRelevance(a.materiality),
  })),
  regulations: (rawDb.regulations || []).map((r) => ({
    ...r,
    materiality: normalizeRelevance(r.materiality),
  })),
  regulatorsInScope: registryRegulators,
  availableJurisdictions: [...ALL_JURISDICTIONS],
};
