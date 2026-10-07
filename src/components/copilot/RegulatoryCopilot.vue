<script setup lang="ts">
import { ref, computed } from 'vue';
import type {
  MatrixSessionState,
  JurisdictionPreset,
} from '@/types';
import DualPaneResearchMatrix from './DualPaneResearchMatrix.vue';
import SetupMatrixModal from './SetupMatrixModal.vue';
import CopilotHistoryDrawer from './CopilotHistoryDrawer.vue';
import {
  INITIAL_MATRIX_SESSIONS,
  INITIAL_JURISDICTION_PRESETS,
  createDynamicMatrixSession,
} from '@/data/matrixMockData';

const props = withDefaults(
  defineProps<{
    matrixSessions?: MatrixSessionState[];
    activeMatrixSessionId?: string;
    isSetupMatrixModalOpen?: boolean;
  }>(),
  {
    matrixSessions: undefined,
    activeMatrixSessionId: undefined,
    isSetupMatrixModalOpen: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:matrixSessions', sessions: MatrixSessionState[]): void;
  (e: 'update:activeMatrixSessionId', id: string): void;
  (e: 'update:isSetupMatrixModalOpen', open: boolean): void;
}>();

// Internal fallback state
const localSessions = ref<MatrixSessionState[]>(INITIAL_MATRIX_SESSIONS);
const localActiveId = ref<string>(INITIAL_MATRIX_SESSIONS[0].sessionId);
const localIsSetupOpen = ref(false);
const isHistoryDrawerOpen = ref(false);

// Presets state
const presets = ref<JurisdictionPreset[]>(INITIAL_JURISDICTION_PRESETS);

// Effective state
const currentSessions = computed({
  get: () => props.matrixSessions ?? localSessions.value,
  set: (val) => {
    if (props.matrixSessions !== undefined) {
      emit('update:matrixSessions', val);
    } else {
      localSessions.value = val;
    }
  },
});

const currentActiveId = computed({
  get: () => props.activeMatrixSessionId ?? localActiveId.value,
  set: (val) => {
    if (props.activeMatrixSessionId !== undefined) {
      emit('update:activeMatrixSessionId', val);
    } else {
      localActiveId.value = val;
    }
  },
});

const currentIsSetupOpen = computed({
  get: () => props.isSetupMatrixModalOpen ?? localIsSetupOpen.value,
  set: (val) => {
    if (props.isSetupMatrixModalOpen !== undefined) {
      emit('update:isSetupMatrixModalOpen', val);
    } else {
      localIsSetupOpen.value = val;
    }
  },
});

const activeSession = computed(() => {
  return (
    currentSessions.value.find((s) => s.sessionId === currentActiveId.value) ||
    currentSessions.value[0]
  );
});

const handleUpdateActiveSession = (updated: MatrixSessionState) => {
  currentSessions.value = currentSessions.value.map((s) =>
    s.sessionId === updated.sessionId ? updated : s
  );
};

const handleRunMatrixResearch = (
  questions: string[],
  jurisdictionCodes: string[],
  title?: string
) => {
  const newSession = createDynamicMatrixSession(questions, jurisdictionCodes, title);
  currentSessions.value = [newSession, ...currentSessions.value];
  currentActiveId.value = newSession.sessionId;
  currentIsSetupOpen.value = false;
};

const handleSavePreset = (preset: JurisdictionPreset) => {
  presets.value = [preset, ...presets.value];
};

const handleRenameSession = (sessionId: string, newTitle: string) => {
  currentSessions.value = currentSessions.value.map((s) =>
    s.sessionId === sessionId ? { ...s, sessionTitle: newTitle } : s
  );
};

const handleDeleteSession = (sessionId: string) => {
  const remaining = currentSessions.value.filter((s) => s.sessionId !== sessionId);
  currentSessions.value = remaining;
  if (currentActiveId.value === sessionId && remaining.length > 0) {
    currentActiveId.value = remaining[0].sessionId;
  }
};

const handleExportSession = (sessionToExport: MatrixSessionState) => {
  const headers = [
    'Record_ID',
    'Market_Jurisdiction',
    'Question_ID',
    'Question',
    'Scope',
    'Verdict',
    'Confidence_Tier',
    'Regulator_Authority',
    'Legal_Instrument',
    'Legal_Reference',
    'Primary_URL',
    'Supporting_URL',
    'Effective_Date',
    'Verification_Date',
    'Summary',
    'Evidence',
    'Supplementary_Notes'
  ];

  const escapeCsv = (str: string | undefined | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows: string[] = [];

  sessionToExport.questions.forEach((q, qIdx) => {
    sessionToExport.jurisdictions.forEach((j) => {
      const cell = sessionToExport.matrixCells[`${q.questionId}_${j.code}`];
      const recordId = `REC-${sessionToExport.sessionId}-${q.questionId}-${j.code}`;
      const marketJurisdiction = `${j.name} (${j.code})`;
      const questionId = q.questionId || `Q${qIdx + 1}`;
      const questionText = q.questionText;

      // Scope
      const scope = j.name;

      // Verdict: complianceStatus capitalized or badge
      const verdict = cell?.statusBadgeLabel || (cell?.complianceStatus ? cell.complianceStatus.toUpperCase() : 'INCONCLUSIVE');

      // Confidence_Tier based on citations or score
      const topCitation = cell?.verifiedCitations?.[0];
      const secondCitation = cell?.verifiedCitations?.[1];
      const confidenceTier = topCitation?.relevanceScore && topCitation.relevanceScore >= 95
        ? 'Tier 1 (Statutory Direct)'
        : topCitation?.relevanceScore && topCitation.relevanceScore >= 85
        ? 'Tier 2 (Supervisory Guidance)'
        : 'Tier 3 (General Framework)';

      // Regulator_Authority
      const regulatorAuthority = topCitation?.authority || j.regulatorAcronym || j.name;

      // Legal_Instrument
      const legalInstrument = topCitation?.sourceTitle || (cell?.verifiedCitations?.[0] ? cell.verifiedCitations[0].sourceTitle : 'Statutory Regulatory Code');

      // Legal_Reference
      const legalReference = topCitation?.relevanceTag || (topCitation ? `SHA:${topCitation.sha256.slice(0, 12)}` : 'N/A');

      // Primary_URL & Supporting_URL
      const primaryUrl = topCitation?.sourceUrl || '';
      const supportingUrl = secondCitation?.sourceUrl || (cell?.verifiedCitations?.[1] ? cell.verifiedCitations[1].sourceUrl : '');

      // Effective_Date
      const effectiveDate = topCitation?.effectiveDate || sessionToExport.pinnedRegulation?.effectiveDate || 'Current';

      // Verification_Date
      const verificationDate = sessionToExport.updatedAt || sessionToExport.createdAt || new Date().toISOString().slice(0, 10);

      // Summary: key takeaways or first paragraph of markdown
      const summary = (cell?.keyTakeaways && cell.keyTakeaways.length > 0)
        ? cell.keyTakeaways.join(' | ')
        : (cell?.answerMarkdown ? cell.answerMarkdown.split('\n\n')[0].replace(/^[#\s*]+/, '') : '');

      // Evidence: verified citations excerpts and highlighted terms
      const evidence = (cell?.verifiedCitations && cell.verifiedCitations.length > 0)
        ? cell.verifiedCitations.map(c => `[${c.authority}] "${c.excerpt}" (Relevance: ${c.relevanceScore}%)`).join(' \n')
        : '';

      // Supplementary_Notes: crossCountrySummary + followUps if present
      const followUpNotes = (cell?.followUps && cell.followUps.length > 0)
        ? cell.followUps.map(fu => `Follow-up Q: ${fu.queryText} -> ${fu.findingText}`).join(' | ')
        : '';
      const supplementaryNotes = [
        q.crossCountrySummary ? `Macro Synthesis: ${q.crossCountrySummary}` : '',
        followUpNotes ? `Follow-up Inquiries: ${followUpNotes}` : ''
      ].filter(Boolean).join('\n\n');

      const row = [
        escapeCsv(recordId),
        escapeCsv(marketJurisdiction),
        escapeCsv(questionId),
        escapeCsv(questionText),
        escapeCsv(scope),
        escapeCsv(verdict),
        escapeCsv(confidenceTier),
        escapeCsv(regulatorAuthority),
        escapeCsv(legalInstrument),
        escapeCsv(legalReference),
        escapeCsv(primaryUrl),
        escapeCsv(supportingUrl),
        escapeCsv(effectiveDate),
        escapeCsv(verificationDate),
        escapeCsv(summary),
        escapeCsv(evidence),
        escapeCsv(supplementaryNotes)
      ];

      rows.push(row.join(','));
    });
  });

  const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Regulatory_Matrix_${sessionToExport.sessionTitle.replace(/[\s\/\\:*?"<>|]/g, '_')}_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
    <!-- Main Matrix Workspace -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <DualPaneResearchMatrix
        v-if="activeSession"
        :session="activeSession"
        @updateSession="handleUpdateActiveSession"
        @openNewMatrixModal="currentIsSetupOpen = true"
        @exportCsv="handleExportSession(activeSession)"
      />
      <div
        v-else
        class="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 gap-3"
      >
        <p class="text-sm font-medium">No research matrix workspace selected.</p>
        <button
          @click="currentIsSetupOpen = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
        >
          + Create New Matrix Workspace
        </button>
      </div>
    </div>

    <!-- History Drawer -->
    <CopilotHistoryDrawer
      :isOpen="isHistoryDrawerOpen"
      :sessions="currentSessions"
      :activeSessionId="currentActiveId"
      @close="isHistoryDrawerOpen = false"
      @selectSession="(id) => (currentActiveId = id)"
      @openNewMatrixModal="currentIsSetupOpen = true"
      @renameSession="handleRenameSession"
      @deleteSession="handleDeleteSession"
      @exportSession="handleExportSession"
    />

    <!-- Setup Matrix Modal -->
    <SetupMatrixModal
      :isOpen="currentIsSetupOpen"
      :presets="presets"
      @close="currentIsSetupOpen = false"
      @savePreset="handleSavePreset"
      @runMatrixResearch="handleRunMatrixResearch"
    />
  </div>
</template>
