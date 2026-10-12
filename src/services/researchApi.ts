/**
 * Client for the Regulatory Evidence Research API (FastAPI backend, /v1/research).
 *
 * Kept separate from `api.ts`: that module silently falls back to demo data,
 * which is wrong for research answers. A regulatory answer must either come from
 * the evidence backend or be reported as unavailable - never be invented.
 *
 * Public Pages uses VITE_RESEARCH_GATEWAY_URL and session-only signed tokens.
 * Local direct API configuration (build time or runtime):
 *   VITE_RESEARCH_API_URL   e.g. https://regwatch-api.example.com   (HTTPS, no trailing slash)
 *   localStorage 'hk_research_api_url'    runtime override (settings / console)
 *   sessionStorage 'hk_research_api_key'  optional X-API-Key, typed in by the user.
 *     Never bake a key into VITE_* variables: they are shipped to every visitor.
 */
import type {
  MatrixCellData,
  MatrixCitationItem,
  MatrixComplianceStatus,
  MatrixJurisdictionItem,
  MatrixQuestionItem,
  MatrixSessionState,
} from '@/types';

const safeGet = (store: 'local' | 'session', key: string): string | null => {
  try {
    return (store === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
};

const buildConfig = (import.meta as any).env || {};
export const isResearchGatewayMode = (): boolean => buildConfig.VITE_RESEARCH_ACCESS_MODE === 'gateway' || !!buildConfig.VITE_RESEARCH_GATEWAY_URL;
export const getResearchApiUrl = (): string =>
  (isResearchGatewayMode() ? buildConfig.VITE_RESEARCH_GATEWAY_URL || '' : safeGet('local', 'hk_research_api_url') || buildConfig.VITE_RESEARCH_API_URL || '').trim().replace(/\/+$/, '');
export const isResearchApiConfigured = (): boolean => isResearchGatewayMode() || getResearchApiUrl() !== '';
const ACCESS_STORAGE = 'hk_research_access_token';
const ACCESS_ERROR = 'hk_research_access_error';
export const getResearchAccessError = () => safeGet('session', ACCESS_ERROR) || '';
export function clearResearchAccess(reason = '') { try { sessionStorage.removeItem(ACCESS_STORAGE); if (reason) sessionStorage.setItem(ACCESS_ERROR, reason); else sessionStorage.removeItem(ACCESS_ERROR); } catch { /* unavailable storage */ } }
export function getResearchAccess(url = getResearchApiUrl()): { token: string; expires_at: string } | null {
  try {
    const value = JSON.parse(safeGet('session', ACCESS_STORAGE) || 'null');
    if (!value) return null;
    if (value.url !== url || typeof value.token !== 'string' || !Number.isFinite(Date.parse(value.expires_at))) { clearResearchAccess(); return null; }
    if (Date.parse(value.expires_at) <= Date.now()) { clearResearchAccess('访问令牌已过期，请重新输入口令。'); return null; }
    return value;
  } catch { clearResearchAccess(); return null; }
}
export async function authenticateResearch(password: string, url = getResearchApiUrl()) {
  if (!url) throw new ResearchApiError('研究网关地址未配置，请管理员设置 Actions 变量并重新构建。');
  const result = await call<{ token: string; expires_at: string }>('/auth', { method: 'POST', body: JSON.stringify({ password }) }, 20000, { url, key: '', mode: 'gateway' });
  if (typeof result.token !== 'string' || !result.token || result.token.length > 2048 || !Number.isFinite(Date.parse(result.expires_at)) || Date.parse(result.expires_at) <= Date.now()) throw new ResearchApiError('网关未返回有效的访问令牌。');
  try { sessionStorage.setItem(ACCESS_STORAGE, JSON.stringify({ token: result.token, expires_at: result.expires_at, url })); sessionStorage.removeItem(ACCESS_ERROR); }
  catch { throw new ResearchApiError('浏览器禁止 sessionStorage，无法保存临时访问令牌。'); }
  return result;
}
export const getResearchUsage = (connection = getResearchConnection()) => call<{ token_tasks_today: number; grant_tasks_today: number; ip_tasks_today: number; global_active_tasks: number; uncertain_submissions: number; limits: { grant_daily_tasks: number; global_concurrent_tasks: number } }>('/usage', {}, 20000, connection);

export const getResearchApiKey = () => safeGet('session', 'hk_research_api_key') || '';

export const setResearchApiUrl = (url: string) => {
  if (isResearchGatewayMode()) throw new ResearchApiError('公开页面的研究地址由构建配置管理。');
  const value = url.trim().replace(/\/+$/, '');
  if (value) {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new ResearchApiError('请输入不含密钥、查询参数的 HTTP / HTTPS 后端地址。');
    }
  }
  if (value) localStorage.setItem('hk_research_api_url', value);
  else localStorage.removeItem('hk_research_api_url');
};

export const setResearchApiKey = (key: string) => {
  try {
    sessionStorage.setItem('hk_research_api_key', key.trim());
  } catch {
    throw new ResearchApiError('浏览器禁止 sessionStorage，无法保存 API Key。');
  }
};

export class ResearchApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 20000, connection: ResearchConnection = getResearchConnection(), signal?: AbortSignal): Promise<T> {
  if (!connection.url) throw new ResearchApiError('研究网关地址未配置，请联系管理员。');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const key = connection.key;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const res = await fetch(`${connection.url}${path}`, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        'Content-Type': 'application/json', Accept: 'application/json',
        ...(connection.mode === 'gateway' ? (connection.token ? { Authorization: `Bearer ${connection.token}` } : {}) : (key ? { 'X-API-Key': key } : {})),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = res.statusText;
      let code: string | undefined;
      try {
        const body = await res.json();
        code = typeof body.code === 'string' ? body.code : undefined;
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail ?? body);
      } catch {
        /* keep statusText */
      }
      if (connection.mode === 'gateway') {
        if (res.status === 401 && path !== '/auth') clearResearchAccess(code === 'TOKEN_EXPIRED' ? '访问令牌已过期，请重新输入口令。' : code === 'ACCESS_REVOKED' ? '此访问口令已停用或已更新，请联系管理员。' : '访问令牌无效，请重新输入口令。');
        throw new ResearchApiError(detail || `研究网关返回 ${res.status}`, res.status, code);
      }
      throw new ResearchApiError(
        res.status === 401 ? '后端拒绝访问：API Key 无效或未填写。'
          : res.status === 429 ? `研究请求过于频繁，请在 ${res.headers.get('Retry-After') || '稍后'} 秒后重试。`
          : `后端返回 ${res.status}：${detail}`,
        res.status
      );
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ResearchApiError) throw error;
    if (signal?.aborted) throw new ResearchApiError('已停止等待研究任务。');
    if (controller.signal.aborted) throw new ResearchApiError('后端请求超时，请检查后端和模型服务。');
    throw new ResearchApiError(connection.mode === 'gateway' ? '无法连接研究网关，请检查网络或联系管理员；本次没有研究结果。' : '无法连接研究后端，请检查服务是否启动、地址、CORS 和浏览器本地网络访问权限。');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

// ---------- Backend response shapes (subset actually used) ----------

export interface EvidenceEntry {
  source_id: string;
  source_kind?: string;
  authority?: string;
  url?: string;
  legal_reference?: string;
  page?: number | null;
  excerpt?: string;
  retrieved_at?: string;
  content_hash?: string;
}

export interface ExportRecord {
  question?: string;
  jurisdiction?: string;
  scope?: string;
  as_of_date?: string;
  conclusion?: string;
  summary?: string;
  conditions_or_exceptions?: string[];
  authority?: string;
  legal_instrument?: string;
  legal_reference?: string;
  regulation_location?: string;
  official_url?: string;
  direct_evidence?: EvidenceEntry[];
  indirect_evidence?: EvidenceEntry[];
  verification_status?: 'passed' | 'failed';
  validation_gates?: Record<string, boolean>;
}

export interface ResearchEvidence {
  job_id: string;
  research_status?: string | null;
  publication_status?: string | null;
  export_record?: ExportRecord;
  evidence_gaps?: unknown[];
  crawl_errors?: unknown[];
  verification?: { passed?: boolean; gates?: Record<string, boolean>; checks?: Record<string, boolean> };
  candidate_answer?: Record<string, unknown> | null;
  decision?: Record<string, unknown> | null;
}

export interface JobStatus {
  request?: { question?: string; jurisdiction?: string; entity_scope?: string };
  job_id: string;
  status: 'queued' | 'running' | 'cancelling' | 'completed' | 'failed' | 'cancelled';
  error?: string | null;
  created_at?: string; started_at?: string; completed_at?: string;
}

// ---------- Public API ----------

export interface ResearchConnection { url: string; key: string; mode?: 'gateway' | 'direct'; token?: string }
export const getResearchConnection = (): ResearchConnection => isResearchGatewayMode()
  ? { url: getResearchApiUrl(), key: '', mode: 'gateway', token: getResearchAccess()?.token }
  : { url: getResearchApiUrl(), key: getResearchApiKey(), mode: 'direct' };

export async function submitResearch(question: string, jurisdiction: string, entityScope = '', connection = getResearchConnection(), signal?: AbortSignal): Promise<string> {
  const accepted = await call<{ job_id: string }>('/v1/research', {
    method: 'POST',
    body: JSON.stringify({ question, jurisdiction, ...(entityScope.trim() ? { entity_scope: entityScope.trim() } : {}), use_model_planner: true }),
  }, 20000, connection, signal);
  if (!accepted.job_id) throw new ResearchApiError('后端未返回研究任务 ID。');
  return accepted.job_id;
}

/** Polls until the job finishes, then returns the evidence package. */
export async function awaitEvidence(
  jobId: string,
  opts: { intervalMs?: number; maxWaitMs?: number; signal?: AbortSignal; connection?: ResearchConnection; onProgress?: (job: JobStatus) => void } = {}
): Promise<ResearchEvidence> {
  const { intervalMs = 2500, maxWaitMs = 8 * 60_000, signal, connection = getResearchConnection() } = opts;
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    if (signal?.aborted) throw new ResearchApiError('已取消。');
    const timeLeft = deadline - Date.now();
    if (timeLeft <= 0) throw new ResearchApiError('研究任务等待超时；任务可能仍在后端运行，请凭任务 ID 查询。');
    const path = `/v1/research/${encodeURIComponent(jobId)}`;
    const job = await call<JobStatus>(path, {}, Math.min(20000, timeLeft), connection, signal);
    opts.onProgress?.(job);
    if (job.status === 'completed') return call<ResearchEvidence>(`${path}/evidence`, {}, Math.min(60000, Math.max(1, deadline - Date.now())), connection, signal);
    if (job.status === 'failed') throw new ResearchApiError(job.error || '研究任务失败。');
    if (job.status === 'cancelled') throw new ResearchApiError('研究任务已取消。');
    if (Date.now() > deadline) throw new ResearchApiError('研究任务超时，请稍后在后端查看该任务。');
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new ResearchApiError('已停止等待研究任务。')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, Math.min(intervalMs, Math.max(1, deadline - Date.now())));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
}

/** Reload a durable backend task after browser refresh or a polling timeout. */
export const getResearchJob = (jobId: string, connection = getResearchConnection()) =>
  call<JobStatus>(`/v1/research/${encodeURIComponent(jobId)}`, {}, 20000, connection);

// ---------- Mapping: evidence package -> matrix cell ----------

/**
 * The matrix badge has four compliance states, but the backend returns a
 * question-specific verdict (yes / no / conditional / descriptive / ...).
 * "yes" or "no" answers a proposition; it is not a compliance judgement, so only
 * `conditional` and `insufficient_evidence` get a dedicated state. Everything else
 * is shown as neutral, with the real verdict spelled out in the badge label.
 */
const VERDICT_LABEL: Record<string, string> = {
  yes: '是（Yes）',
  no: '否（No）',
  conditional: '有条件（Conditional）',
  descriptive: '描述性结论（Descriptive）',
  not_applicable: '不适用（N/A）',
  insufficient_evidence: '证据不足（Insufficient evidence）',
};

function toCitation(entry: EvidenceEntry, index: number, direct: boolean): MatrixCitationItem {
  return {
    citationId: `${entry.source_id || 'src'}-${direct ? 'd' : 'i'}-${index}`,
    sourceTitle: [entry.legal_reference, entry.page != null ? `p.${entry.page}` : ''].filter(Boolean).join(' · ') || entry.source_id,
    authority: entry.authority || '',
    regulatorAcronym: entry.authority || '',
    effectiveDate: entry.retrieved_at ? `获取于 ${entry.retrieved_at.slice(0, 10)}` : '',
    sourceUrl: entry.url || '',
    excerpt: entry.excerpt || '',
    sha256: (entry.content_hash || '').replace(/^sha256:/, ''),
    evidenceType: direct ? 'direct' : 'indirect',
    retrievedAt: entry.retrieved_at,
    relevanceTag: direct ? '直接依据（官方一手来源）' : '间接说明（仅供参考）',
  };
}

export function evidenceToCell(evidence: ResearchEvidence): MatrixCellData {
  const rec = evidence.export_record || {};
  const verdict = rec.conclusion || 'insufficient_evidence';
  const researchState = evidenceState(evidence);
  const passed = researchState === 'review_pending';
  const status: MatrixComplianceStatus = verdict === 'conditional' ? 'conditional' : 'inconclusive';
  const citations = [
    ...(rec.direct_evidence || []).map((e, i) => toCitation(e, i, true)),
    ...(rec.indirect_evidence || []).map((e, i) => toCitation(e, i, false)),
  ];

  const lines: string[] = [];
  lines.push(`研究结论（待复核）：${VERDICT_LABEL[verdict] || verdict}`);
  if (rec.summary) lines.push(rec.summary);
  if (rec.scope) lines.push(`适用范围：${rec.scope}`);
  if (rec.regulation_location || rec.legal_instrument) {
    lines.push(`依据：${[rec.legal_instrument, rec.regulation_location].filter(Boolean).join(' — ')}`);
  }
  if (rec.conditions_or_exceptions?.length) {
    lines.push(`条件 / 例外：\n${rec.conditions_or_exceptions.map((c) => `- ${c}`).join('\n')}`);
  }
  lines.push(
    passed
      ? '机器校验通过，仍需人工复核后方可作为正式结论（review_pending）。'
      : '机器校验未通过或证据不足，请勿作为正式结论使用。'
  );

  return {
    answerMarkdown: lines.join('\n\n'),
    complianceStatus: status,
    statusBadgeLabel: researchState === 'review_pending' ? '已完成 · 待人工复核' : researchState === 'insufficient_evidence' ? '已完成 · 证据不足' : researchStateLabel(researchState),
    researchState,
    researchPhase: 'completed',
    researchJobId: evidence.job_id,
    researchEvidence: evidence,
    verifiedCitations: citations,
    keyTakeaways: rec.summary?.trim() ? [rec.summary.trim()] : [missingSummaryReason(researchState)],
    researchSummary: cellSummary({ researchState, researchEvidence: evidence } as MatrixCellData),
  };
}

export function errorToCell(message: string, jobId?: string): MatrixCellData {
  return {
    answerMarkdown: `研究未完成\n\n${message}`,
    complianceStatus: 'inconclusive',
    statusBadgeLabel: '研究失败',
    researchState: 'error',
    researchPhase: 'failed',
    researchJobId: jobId,
    researchError: message,
    researchSummary: `本次未生成可用总结：研究失败，无结果。${message}`,
    verifiedCitations: [],
  };
}

export const pendingCell = (): MatrixCellData => ({
  answerMarkdown: '研究任务正在排队或执行，尚未产生答案，通常需要数十秒到几分钟……',
  complianceStatus: 'inconclusive',
  statusBadgeLabel: '排队中',
  researchPhase: 'queued',
  researchState: 'researching',
  researchSummary: '研究中，尚未生成总结。',
  verifiedCitations: [],
});

/** Empty session whose cells are all "pending"; real answers are filled in later. */
export function createPendingSession(
  questions: string[],
  jurisdictions: MatrixJurisdictionItem[],
  title?: string
): MatrixSessionState {
  const stamp = crypto.randomUUID();
  const qItems: MatrixQuestionItem[] = questions.map((q, i) => ({
    questionId: `live-q-${i + 1}-${stamp}`,
    questionText: q,
    crossCountrySummary: '等待全部辖区完成。',
  }));
  const cells: Record<string, MatrixCellData> = {};
  qItems.forEach((q) => jurisdictions.forEach((j) => (cells[`${q.questionId}_${j.code}`] = { ...pendingCell(), researchStartedAt: new Date().toISOString() })));
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  return {
    sessionId: `matrix-sess-${stamp}`,
    sessionTitle: title || `研究：${questions[0].slice(0, 30)}${questions[0].length > 30 ? '…' : ''}`,
    activeQuestionIndex: 0,
    activeJurisdictionCode: jurisdictions[0].code,
    questions: qItems,
    jurisdictions: jurisdictions.map(j => ({ ...j, complianceStatus: 'inconclusive' })),
    mode: 'live',
    matrixCells: cells,
    isLoading: true,
    createdAt: now,
    updatedAt: now,
    creator: 'RegWatch',
    isSaved: false,
  };
}


export type ResearchState = 'researching' | 'validation_failed' | 'insufficient_evidence' | 'review_pending' | 'error';
export const researchStateLabel = (state: ResearchState) => ({
  researching: '研究中', validation_failed: '已完成 · 未通过校验',
  insufficient_evidence: '证据不足', review_pending: '待人工复核', error: '研究失败',
})[state];
export const REQUIRED_GATES = ['official_current_source', 'exact_evidence', 'legal_citation', 'substantive_support'] as const;
export function evidenceState(evidence: ResearchEvidence): ResearchState {
  const rec = evidence.export_record || {};
  const gates = rec.validation_gates || evidence.verification?.gates || {};
  if ((evidence.candidate_answer || Object.keys(gates).length > 0) && (rec.verification_status === 'failed' || evidence.verification?.passed === false)) return 'validation_failed';
  if (rec.conclusion === 'insufficient_evidence' || !rec.direct_evidence?.length || ['insufficient_evidence', 'clarification_required', 'unsupported_jurisdiction'].includes(evidence.research_status || '')) return 'insufficient_evidence';
  if (rec.verification_status === 'passed' && evidence.verification?.passed !== false && REQUIRED_GATES.every(g => gates[g] === true) && Object.values(gates).every(v => v === true)) return 'review_pending';
  return 'validation_failed';
}
export function safeOfficialUrl(url?: string): string | undefined {
  try { const parsed = new URL(url || ''); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : undefined; }
  catch { return undefined; }
}


function missingSummaryReason(state?: ResearchState): string {
  const reason = state === 'insufficient_evidence' ? '证据不足' : state === 'validation_failed' ? '校验未通过' : '后端未提供 summary';
  return `本次未生成可用总结：${reason}。`;
}

/** No inference: every substantive phrase is copied from this cell's export_record. */
export function cellSummary(cell?: MatrixCellData): string {
  if (!cell || cell.researchState === 'researching') return '研究中，尚未生成总结。';
  if (cell.researchState === 'error') return `本次未生成可用总结：研究失败，无结果。${cell.researchError || '后端未返回可用结果。'}`;
  const rec = cell.researchEvidence?.export_record || {};
  const state = cell.researchEvidence ? evidenceState(cell.researchEvidence) : cell.researchState;
  const caution = state === 'review_pending' ? '机器校验通过，仍待人工复核；不是正式结论。'
    : state === 'insufficient_evidence' ? '证据不足，没有通过校验的结论；不可作为正式结论。'
    : '校验未通过，没有通过校验的结论；不可作为正式结论。';
  return [caution, rec.summary?.trim() || missingSummaryReason(state),
    `结论：${rec.conclusion ? VERDICT_LABEL[rec.conclusion] || rec.conclusion : '未提供'}。`,
    `适用范围：${rec.scope?.trim() || '后端未提供'}。`,
    `条件与例外：${rec.conditions_or_exceptions?.length ? rec.conditions_or_exceptions.join('；') : '后端未列出'}。`,
  ].join('\n');
}

export function questionSummary(session: MatrixSessionState, question: MatrixQuestionItem): string {
  const rows = session.jurisdictions.map(jurisdiction => ({ jurisdiction, cell: session.matrixCells[`${question.questionId}_${jurisdiction.code}`] }));
  const pending = rows.filter(({ cell }) => !cell || !cell.researchState || cell.researchState === 'researching');
  if (pending.length || !rows.length) return `等待全部辖区完成。${pending.length ? '研究中：' + pending.map(r => r.jurisdiction.name).join('、') + '。' : ''}`;
  const valid = rows.filter(({ cell }) => cell.researchEvidence && evidenceState(cell.researchEvidence) === 'review_pending' && cell.researchEvidence.export_record?.conclusion?.trim());
  const unavailable = rows.filter(row => !valid.includes(row));
  const lines = [
    `有通过机器校验的结论（仍待人工复核）：${valid.length ? valid.map(r => r.jurisdiction.name).join('、') : '无'}。`,
    `没有通过校验的结论：${unavailable.length ? unavailable.map(r => r.jurisdiction.name).join('、') : '无'}。`,
  ];
  rows.forEach(({ jurisdiction, cell }) => {
    const rec = cell.researchEvidence?.export_record;
    const state = cell.researchEvidence ? evidenceState(cell.researchEvidence) : cell.researchState;
    const pointer = rec?.regulation_location || rec?.legal_reference
      || rec?.direct_evidence?.map(e => [e.legal_reference, e.page != null ? `p.${e.page}` : ''].filter(Boolean).join(' · ')).filter(Boolean).slice(0, 3).join('；')
      || '后端未提供条款位置';
    const location = [rec?.legal_instrument, pointer].filter(Boolean).join(' · ');
    lines.push(`${jurisdiction.name}：${researchStateLabel(state || 'error')}。${state === 'error' ? '无结果；' + (cell.researchError || '研究请求失败') : '结论标签：' + (rec?.conclusion ? VERDICT_LABEL[rec.conclusion] || rec.conclusion : '未提供') + '；依据位置：' + location}${state !== 'review_pending' ? '；无可用结论。' : '；不是正式结论。'}`);
  });
  if (valid.length >= 2) {
    const labels = new Map<string, string[]>();
    valid.forEach(({ jurisdiction, cell }) => {
      const verdict = cell.researchEvidence!.export_record!.conclusion!;
      labels.set(verdict, [...(labels.get(verdict) || []), jurisdiction.name]);
    });
    const shared = [...labels].filter(([, names]) => names.length >= 2);
    if (shared.length) lines.push('共同点（仅结论标签）：' + shared.map(([verdict, names]) => `${names.join('、')}均为 ${VERDICT_LABEL[verdict] || verdict}`).join('；') + '。');
    if (labels.size > 1) lines.push('差异（仅结论标签）：' + [...labels].map(([verdict, names]) => `${names.join('、')}为 ${VERDICT_LABEL[verdict] || verdict}`).join('；') + '。');
    lines.push('以上仅对照已有结论标签，不推断法规内容相同或不同；各辖区适用范围与条件仍须分别复核。');
  }
  return lines.join('\n');
}

/** Called on every cell update, including retries and restored durable jobs. */
export function refreshQuestionSummaries(session: MatrixSessionState): MatrixSessionState {
  if (session.mode !== 'live') return session;
  return { ...session, questions: session.questions.map(q => ({ ...q, crossCountrySummary: questionSummary(session, q) })) };
}

export function macroSynthesisNote(session: MatrixSessionState, question: MatrixQuestionItem): string {
  const summary = session.mode === 'live' ? questionSummary(session, question) : question.crossCountrySummary;
  return summary ? `Macro Synthesis: ${summary}` : '';
}
