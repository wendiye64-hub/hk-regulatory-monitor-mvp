<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue';
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
  ALL_AVAILABLE_JURISDICTIONS,
  createDynamicMatrixSession,
} from '@/data/matrixMockData';
import {
  isResearchApiConfigured,
  submitResearch,
  awaitEvidence,
  evidenceToCell,
  errorToCell,
  createPendingSession,
  pendingCell,
  getResearchApiUrl,
  setResearchApiUrl,
  getResearchApiKey,
  setResearchApiKey,
  getResearchConnection,
  getResearchJob,
  refreshQuestionSummaries,
  macroSynthesisNote,
  isResearchGatewayMode, getResearchAccess, getResearchAccessError, authenticateResearch, clearResearchAccess, getResearchUsage,
} from '@/services/researchApi';

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

const gatewayMode = isResearchGatewayMode();
const access = ref(getResearchAccess());
const accessPassword = ref('');
const authenticating = ref(false);
const usage = ref<Awaited<ReturnType<typeof getResearchUsage>> | null>(null);
const accessAllowed = computed(() => !gatewayMode || !!access.value);
const accessTimer = setInterval(() => { if (gatewayMode && access.value && !getResearchAccess()) { access.value = null; connectionError.value = '访问令牌已过期，请重新输入口令。'; } }, 1000);
const unlockResearch = async () => {
  if (authenticating.value) return;
  authenticating.value = true; connectionError.value = '';
  try { access.value = await authenticateResearch(accessPassword.value); await refreshUsage(); }
  catch (error) { connectionError.value = error instanceof Error ? error.message : String(error); }
  finally { accessPassword.value = ''; authenticating.value = false; }
};
const refreshUsage = async () => {
  try { usage.value = await getResearchUsage(); }
  catch (error) { access.value = getResearchAccess(); connectionError.value = error instanceof Error ? error.message : String(error); }
};
const lockResearch = () => { clearResearchAccess(); access.value = null; usage.value = null; connectionError.value = '需要访问口令。'; controllers.forEach(c => c.abort()); };
const requireAccess = () => {
  if (gatewayMode) access.value = getResearchAccess();
  if (!accessAllowed.value) { if (!connectionError.value) connectionError.value = getResearchApiUrl() ? '需要访问口令。' : '研究网关地址未配置，请联系管理员。'; return false; }
  return true;
};
const openSetup = () => { if (requireAccess()) currentIsSetupOpen.value = true; };
const backendUrl = ref(getResearchApiUrl());
const apiKey = ref(gatewayMode ? '' : getResearchApiKey());
const entityScope = ref('Companies incorporated in the selected jurisdiction');
const liveConfigured = ref(isResearchApiConfigured());
const connectionError = ref(gatewayMode ? getResearchAccessError() : '');
const restoreJobId = ref('');
const restoring = ref(false);
const connectionSaved = ref(false);
const controllers = new Set<AbortController>();
const saveConnection = () => {
  try {
    setResearchApiUrl(backendUrl.value);
    setResearchApiKey(apiKey.value);
    liveConfigured.value = isResearchApiConfigured();
    if (liveConfigured.value) currentSessions.value = currentSessions.value;
    connectionError.value = '';
    connectionSaved.value = true;
  } catch (error) { connectionError.value = error instanceof Error ? error.message : String(error); }
};
onBeforeUnmount(() => { clearInterval(accessTimer); controllers.forEach(controller => controller.abort()); });

// Internal fallback state
const localSessions = ref<MatrixSessionState[]>(INITIAL_MATRIX_SESSIONS);
watch(() => props.matrixSessions, sessions => {
  if (sessions !== undefined) localSessions.value = sessions.map(refreshQuestionSummaries);
}, { immediate: true, flush: 'sync' });
const localActiveId = ref<string>(INITIAL_MATRIX_SESSIONS[0]?.sessionId || '');
const localIsSetupOpen = ref(false);
const isHistoryDrawerOpen = ref(false);

// Presets state
const presets = ref<JurisdictionPreset[]>(INITIAL_JURISDICTION_PRESETS);

// Effective state
const currentSessions = computed({
  get: () => {
    const sessions = localSessions.value;
    return liveConfigured.value ? sessions.filter(s => s.mode === 'live') : sessions;
  },
  set: (val) => {
    val = val.map(refreshQuestionSummaries);
    localSessions.value = val;
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
    s.sessionId === updated.sessionId ? refreshQuestionSummaries(updated) : s
  );
};

const patchSession = (sessionId: string, patch: (s: MatrixSessionState) => MatrixSessionState) => {
  currentSessions.value = currentSessions.value.map((s) => (s.sessionId === sessionId ? refreshQuestionSummaries(patch(s)) : s));
};

/** Each cell keeps its own task ID, evidence package and error. */
const runCell = async (sessionId: string, key: string, question: string, jurisdiction: string, connection = getResearchConnection(), scope = entityScope.value) => {
  if (!requireAccess()) { patchSession(sessionId, s => { const cells = { ...s.matrixCells, [key]: errorToCell(connectionError.value) }; return { ...s, matrixCells: cells, isLoading: Object.values(cells).some(c => c.researchState === 'researching') }; }); return; }
  const previousCell = currentSessions.value.find(s => s.sessionId === sessionId)?.matrixCells[key];
  const startedAt = previousCell?.researchState === 'researching' && previousCell.researchStartedAt ? previousCell.researchStartedAt : new Date().toISOString();
  const controller = new AbortController();
  controllers.add(controller);
  let jobId: string | undefined;
  let completedAt: string | undefined;
  patchSession(sessionId, s => ({ ...s, matrixCells: { ...s.matrixCells, [key]: { ...pendingCell(), researchPhase: 'submitting', researchStartedAt: startedAt, statusBadgeLabel: '提交中' } }, isLoading: true }));
  try {
    jobId = await submitResearch(question, jurisdiction, scope, connection, controller.signal);
    patchSession(sessionId, s => ({ ...s, matrixCells: { ...s.matrixCells, [key]: { ...pendingCell(), researchJobId: jobId, researchPhase: 'queued', researchStartedAt: startedAt, statusBadgeLabel: '排队中' } } }));
    const evidence = await awaitEvidence(jobId, { signal: controller.signal, connection, onProgress: job => {
      completedAt = job.completed_at || completedAt;
      const labels = { queued: '排队中', running: '研究中', cancelling: '取消中', completed: '已完成 · 获取证据中', failed: '失败', cancelled: '已取消' };
      patchSession(sessionId, s => ({ ...s, matrixCells: { ...s.matrixCells, [key]: { ...s.matrixCells[key], researchPhase: job.status, statusBadgeLabel: labels[job.status] || '研究中' } } }));
    } });
    patchSession(sessionId, s => ({ ...s, matrixCells: { ...s.matrixCells, [key]: { ...evidenceToCell(evidence), researchStartedAt: startedAt, researchFinishedAt: completedAt || new Date().toISOString() } } }));
  } catch (error) {
    if (gatewayMode) { access.value = getResearchAccess(); connectionError.value = error instanceof Error ? error.message : String(error); }
    patchSession(sessionId, s => ({ ...s, matrixCells: { ...s.matrixCells, [key]: { ...errorToCell(error instanceof Error ? error.message : String(error), jobId), researchPhase: 'failed', researchStartedAt: startedAt, researchFinishedAt: completedAt || new Date().toISOString() } } }));
  } finally {
    controllers.delete(controller);
    patchSession(sessionId, s => ({ ...s, isLoading: Object.values(s.matrixCells).some(c => c.researchState === 'researching'), updatedAt: new Date().toISOString() }));
  }
};
const runLiveResearch = (questions: string[], jurisdictionCodes: string[], title?: string) => {
  if (!requireAccess()) return;
  const jurisdictions = ALL_AVAILABLE_JURISDICTIONS.filter(j => jurisdictionCodes.includes(j.code));
  const chosen = jurisdictions.length ? jurisdictions : ALL_AVAILABLE_JURISDICTIONS.slice(0, 1);
  const session = { ...createPendingSession(questions, chosen, title), researchScope: entityScope.value };
  currentSessions.value = [session, ...currentSessions.value];
  currentActiveId.value = session.sessionId;
  currentIsSetupOpen.value = false;
  const connection = getResearchConnection();
  const tasks = session.questions.flatMap(q => chosen.map(j => ({ key: `${q.questionId}_${j.code}`, question: q.questionText, jurisdiction: j.name })));
  // Limit simultaneous browser requests; the backend independently limits submissions.
  const worker = async () => {
    while (tasks.length) {
      const task = tasks.shift()!;
      if (!currentSessions.value.some(s => s.sessionId === session.sessionId)) return;
      await runCell(session.sessionId, task.key, task.question, task.jurisdiction, connection, session.researchScope);
    }
  };
  void Promise.all([worker(), worker()]);
};
const retryCell = (key: string) => {
  if (!requireAccess()) return;
  const session = activeSession.value;
  if (!session || session.matrixCells[key]?.researchState === 'researching') return;
  const q = session.questions.find(q => session.jurisdictions.some(j => `${q.questionId}_${j.code}` === key));
  const j = session.jurisdictions.find(j => `${q?.questionId}_${j.code}` === key);
  if (q && j) void runCell(session.sessionId, key, q.questionText, j.name, getResearchConnection(), session.researchScope || entityScope.value);
};

const restoreResearch = async () => {
  if (!requireAccess() || !restoreJobId.value.trim() || restoring.value) return;
  restoring.value = true;
  connectionError.value = '';
  try {
    const connection = getResearchConnection();
    if (!connection.url) throw new Error('请先保存 Evidence 后端地址。');
    const job = await getResearchJob(restoreJobId.value.trim(), connection);
    const jurisdiction = ALL_AVAILABLE_JURISDICTIONS.find(j => j.name === job.request?.jurisdiction);
    if (!job.request?.question || !jurisdiction) throw new Error('任务缺少问题或该辖区未在矩阵中配置。');
    const session = { ...createPendingSession([job.request.question], [jurisdiction], '已有研究：' + job.request.question.slice(0, 30)), researchScope: job.request.entity_scope };
    const key = `${session.questions[0].questionId}_${jurisdiction.code}`;
    const startedAt = job.created_at || new Date().toISOString();
    let completedAt = job.completed_at;
    session.matrixCells[key] = { ...pendingCell(), researchJobId: job.job_id, researchPhase: job.status, researchStartedAt: startedAt };
    currentSessions.value = [session, ...currentSessions.value];
    currentActiveId.value = session.sessionId;
    try {
      const result = await awaitEvidence(job.job_id, { connection, onProgress: status => {
        completedAt = status.completed_at || completedAt;
        const labels = { queued: '排队中', running: '研究中', cancelling: '取消中', completed: '已完成 · 获取证据中', failed: '失败', cancelled: '已取消' };
        patchSession(session.sessionId, s => ({ ...s, matrixCells: { [key]: { ...s.matrixCells[key], researchPhase: status.status, statusBadgeLabel: labels[status.status] || '研究中' } } }));
      } });
      patchSession(session.sessionId, s => ({ ...s, matrixCells: { [key]: { ...evidenceToCell(result), researchStartedAt: startedAt, researchFinishedAt: completedAt || new Date().toISOString() } }, isLoading: false }));
    } catch (error) {
      if (gatewayMode) { access.value = getResearchAccess(); connectionError.value = error instanceof Error ? error.message : String(error); }
      patchSession(session.sessionId, s => ({ ...s, matrixCells: { [key]: { ...errorToCell(error instanceof Error ? error.message : String(error), job.job_id), researchStartedAt: startedAt, researchFinishedAt: completedAt || new Date().toISOString() } }, isLoading: false }));
    }
  } catch (error) { if (gatewayMode) access.value = getResearchAccess(); connectionError.value = error instanceof Error ? error.message : String(error); }
  finally { restoring.value = false; }
};

const handleRunMatrixResearch = (
  questions: string[],
  jurisdictionCodes: string[],
  title?: string
) => {
  if (!requireAccess()) return;
  // With a research backend configured, answers come only from it.
  // Without one, the original demo-data matrix is kept for offline demos.
  if (liveConfigured.value) {
    runLiveResearch(questions, jurisdictionCodes, title);
    return;
  }
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
      const scope = cell?.researchEvidence?.export_record?.scope || j.name;

      // Verdict: complianceStatus capitalized or badge
      const verdict = cell?.statusBadgeLabel || (cell?.complianceStatus ? cell.complianceStatus.toUpperCase() : 'INCONCLUSIVE');

      // Confidence_Tier based on citations or score
      const topCitation = cell?.verifiedCitations?.[0];
      const secondCitation = cell?.verifiedCitations?.[1];
      const confidenceTier = cell?.researchState ? (topCitation?.evidenceType === 'direct' ? '直接依据 · 待人工复核' : '证据待复核') : topCitation?.relevanceScore && topCitation.relevanceScore >= 95
        ? 'Tier 1 (Statutory Direct)'
        : topCitation?.relevanceScore && topCitation.relevanceScore >= 85
        ? 'Tier 2 (Supervisory Guidance)'
        : 'Tier 3 (General Framework)';

      // Regulator_Authority
      const regulatorAuthority = topCitation?.authority || j.regulatorAcronym || j.name;

      // Legal_Instrument
      const legalInstrument = cell?.researchState ? (cell.researchEvidence?.export_record?.legal_instrument || '') : topCitation?.sourceTitle || (cell?.verifiedCitations?.[0] ? cell.verifiedCitations[0].sourceTitle : 'Statutory Regulatory Code');

      // Legal_Reference
      const legalReference = cell?.researchState ? (cell.researchEvidence?.export_record?.regulation_location || '') : topCitation?.relevanceTag || (topCitation ? `SHA:${topCitation.sha256.slice(0, 12)}` : 'N/A');

      // Primary_URL & Supporting_URL
      const primaryUrl = topCitation?.sourceUrl || '';
      const supportingUrl = secondCitation?.sourceUrl || (cell?.verifiedCitations?.[1] ? cell.verifiedCitations[1].sourceUrl : '');

      // Effective_Date
      const effectiveDate = cell?.researchState ? (cell.researchEvidence?.export_record?.as_of_date || '') : topCitation?.effectiveDate || sessionToExport.pinnedRegulation?.effectiveDate || 'Current';

      // Verification_Date
      const verificationDate = sessionToExport.updatedAt || sessionToExport.createdAt || new Date().toISOString().slice(0, 10);

      // Summary: key takeaways or first paragraph of markdown
      const summary = cell?.researchSummary || ((cell?.keyTakeaways && cell.keyTakeaways.length > 0)
        ? cell.keyTakeaways.join(' | ')
        : (cell?.answerMarkdown ? cell.answerMarkdown.split('\n\n')[0].replace(/^[#\s*]+/, '') : ''));

      // Evidence: verified citations excerpts and highlighted terms
      const evidence = (cell?.verifiedCitations && cell.verifiedCitations.length > 0)
        ? cell.verifiedCitations.map(c => `[${c.authority}] "${c.excerpt}" (${c.evidenceType ? c.evidenceType : `Relevance: ${c.relevanceScore}%`})`).join(' \n')
        : '';

      // Supplementary_Notes: crossCountrySummary + followUps if present
      const followUpNotes = (cell?.followUps && cell.followUps.length > 0)
        ? cell.followUps.map(fu => `Follow-up Q: ${fu.queryText} -> ${fu.findingText}`).join(' | ')
        : '';
      const supplementaryNotes = [
        macroSynthesisNote(sessionToExport, q),
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
    <div v-if="gatewayMode" class="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 text-xs space-y-2">
      <div class="flex items-center gap-2 flex-wrap"><span class="font-semibold text-neutral-700">实时研究访问</span><span class="px-2 py-0.5 rounded-full border" :class="accessAllowed ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'">{{ accessAllowed ? '访问已开启 · 待人工复核' : '需要访问口令' }}</span><span class="text-neutral-500">监控新闻流公开可用</span></div>
      <form v-if="!accessAllowed" class="flex items-end gap-2 flex-wrap" @submit.prevent="unlockResearch">
        <label class="space-y-1 flex-1 max-w-sm"><span class="font-medium text-neutral-600">访问口令</span><input v-model="accessPassword" type="password" autocomplete="off" maxlength="256" placeholder="输入管理员提供的访问口令" class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600" /></label>
        <button :disabled="authenticating || !accessPassword || !backendUrl" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-40 cursor-pointer">{{ authenticating ? '验证中…' : '开启实时研究' }}</button>
        <span v-if="!backendUrl" class="text-rose-700">研究网关地址未配置，请联系管理员。</span>
      </form>
      <div v-else class="flex items-center gap-3 flex-wrap text-neutral-600"><span>有效至 {{ new Date(access!.expires_at).toLocaleString() }}</span><button @click="refreshUsage" class="text-blue-600 hover:underline cursor-pointer">查看用量</button><button @click="lockResearch" class="text-neutral-600 hover:underline cursor-pointer">关闭本次访问</button><span v-if="usage">此口令今日 {{ usage.grant_tasks_today }}/{{ usage.limits.grant_daily_tasks }} 个任务 · 全局进行中 {{ usage.global_active_tasks }}/{{ usage.limits.global_concurrent_tasks }}<template v-if="usage.uncertain_submissions"> · {{ usage.uncertain_submissions }} 个提交待管理员核对</template></span></div>
      <p v-if="connectionError" role="alert" class="text-rose-700">{{ connectionError }}</p>
      <p class="text-neutral-500">临时令牌只保存在当前浏览器会话，口令不会保存。机器校验通过仍须人工复核。</p>
    </div>
    <details v-if="!gatewayMode || accessAllowed" class="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 py-2 text-xs">
      <summary class="cursor-pointer font-semibold text-neutral-700"><span class="inline-flex items-center gap-2">研究连接<span class="px-2 py-0.5 rounded-full border" :class="liveConfigured ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'">{{ liveConfigured ? '真实研究' : '演示模式' }}</span></span></summary>
      <form class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3" @submit.prevent="!gatewayMode && saveConnection()">
        <label v-if="!gatewayMode" class="space-y-1"><span class="font-medium text-neutral-600">Evidence 后端地址</span><input v-model="backendUrl" type="url" placeholder="http://127.0.0.1:8000" class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600" /></label>
        <label v-if="!gatewayMode" class="space-y-1"><span class="font-medium text-neutral-600">API Key · 当前浏览器会话</span><input v-model="apiKey" type="password" autocomplete="off" placeholder="仅在后端启用时填写" class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600" /></label>
        <label class="space-y-1"><span class="font-medium text-neutral-600">研究对象 / 适用范围</span><input v-model="entityScope" placeholder="例如：Hong Kong licensed banks" class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600" /></label>
        <div v-if="liveConfigured" class="sm:col-span-2 lg:col-span-3 flex items-end gap-2"><label class="space-y-1 flex-1"><span class="font-medium text-neutral-600">载入已有任务 ID（可选）</span><input v-model="restoreJobId" placeholder="刷新页面或超时后，凭任务 ID 继续查看" class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono" /></label><button type="button" @click="restoreResearch" :disabled="!restoreJobId.trim() || restoring" class="px-3 py-2 rounded-lg text-neutral-700 border border-neutral-300 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer">{{ restoring ? '读取中…' : '查看任务' }}</button></div>
        <div v-if="!gatewayMode" class="sm:col-span-2 lg:col-span-3 flex gap-3 items-center flex-wrap"><button type="submit" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer">保存连接</button><span v-if="connectionSaved && !connectionError" role="status" class="text-blue-700">连接设置已保存，新研究使用此设置。</span><span v-if="connectionError" role="alert" class="text-rose-700">{{ connectionError }}</span><span class="text-neutral-500">Key 仅存入 sessionStorage；研究答案仍需人工复核。</span></div>
      </form>
    </details>
    <!-- Main Matrix Workspace -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <DualPaneResearchMatrix
        v-if="activeSession && accessAllowed"
        :session="activeSession"
        @updateSession="handleUpdateActiveSession"
        @retryResearch="retryCell"
        @openNewMatrixModal="openSetup"
        @exportCsv="handleExportSession(activeSession)"
      />
      <div
        v-else
        class="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 gap-3"
      >
        <p class="text-sm font-medium">{{ accessAllowed ? '请选择或创建研究矩阵。' : '需要访问口令后才能提问。' }}</p>
        <button
          @click="openSetup" :disabled="!accessAllowed"
          class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
        >
          {{ accessAllowed ? '+ 创建研究矩阵' : '需要访问口令' }}
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
      @openNewMatrixModal="openSetup"
      @renameSession="handleRenameSession"
      @deleteSession="handleDeleteSession"
      @exportSession="handleExportSession"
    />

    <!-- Setup Matrix Modal -->
    <SetupMatrixModal
      :isOpen="currentIsSetupOpen && accessAllowed"
      :presets="presets"
      @close="currentIsSetupOpen = false"
      @savePreset="handleSavePreset"
      @runMatrixResearch="handleRunMatrixResearch"
    />
  </div>
</template>
