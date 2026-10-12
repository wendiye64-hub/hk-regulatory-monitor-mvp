import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the actual TypeScript client against HTTP, with test-only responses.
const source = await readFile(new URL('../src/services/researchApi.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), clear: () => values.clear() };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
let server, base, handler, received;
const send = (res, status, value, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(value)); };
const record = () => ({
  job_id: 'test-job', research_status: 'verified',
  verification: { passed: true },
  export_record: { conclusion: 'yes', summary: 'Test-only research answer', scope: 'Test scope', verification_status: 'passed',
    validation_gates: { official_current_source: true, exact_evidence: true, legal_citation: true, substantive_support: true },
    direct_evidence: [{ source_id: 'test-source', authority: 'Test Authority', excerpt: 'Test quotation', url: 'https://official.example/test', content_hash: 'sha256:abc', retrieved_at: '2026-10-12T01:00:00Z' }],
    indirect_evidence: [{ source_id: 'test-explanation', excerpt: 'Test explanation' }] },
});
before(async () => {
  server = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    received.push({ method: req.method, path: req.url, key: req.headers['x-api-key'], authorization: req.headers.authorization, body: body ? JSON.parse(body) : undefined });
    handler(req, res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  received = []; localStorage.clear(); sessionStorage.clear(); api.setResearchApiUrl(base);
  handler = (req, res) => send(res, 500, { detail: 'Unconfigured test endpoint' });
});

test('one submission polls queued/running/completed then fetches the full evidence package', async () => {
  api.setResearchApiKey('test-session-key');
  const states = ['queued', 'running', 'completed'];
  handler = (req, res) => {
    assert.equal(req.headers['x-api-key'], 'test-session-key');
    if (req.method === 'POST') return send(res, 202, { job_id: 'test-job' });
    if (req.url.endsWith('/evidence')) return send(res, 200, record());
    send(res, 200, { job_id: 'test-job', status: states.shift() });
  };
  const jobId = await api.submitResearch('What rule applies?', 'Hong Kong', 'Hong Kong companies');
  const evidence = await api.awaitEvidence(jobId, { intervalMs: 1 });
  assert.deepEqual(received.map(r => `${r.method} ${r.path}`), ['POST /v1/research', 'GET /v1/research/test-job', 'GET /v1/research/test-job', 'GET /v1/research/test-job', 'GET /v1/research/test-job/evidence']);
  assert.equal(received[0].body.entity_scope, 'Hong Kong companies');
  const cell = api.evidenceToCell(evidence);
  assert.equal(cell.researchJobId, jobId);
  assert.deepEqual(cell.researchEvidence, evidence);
  assert.equal(cell.researchState, 'review_pending');
  assert.equal(cell.complianceStatus, 'inconclusive');
  assert.deepEqual(cell.verifiedCitations.map(c => c.evidenceType), ['direct', 'indirect']);
  assert.ok(cell.verifiedCitations.every(c => c.relevanceScore === undefined));
});

test('missing URL leaves demo mode available; keys are session-only', () => {
  api.setResearchApiUrl(''); assert.equal(api.isResearchApiConfigured(), false);
  api.setResearchApiKey('test-key'); assert.equal(sessionStorage.getItem('hk_research_api_key'), 'test-key');
  assert.equal(localStorage.getItem('hk_research_api_key'), null);
});

test('401 and 429 produce actionable errors with no invented citations', async () => {
  for (const [status, message] of [[401, /API Key/], [429, /7 秒/]]) {
    handler = (req, res) => send(res, status, { detail: 'Denied' }, { 'Retry-After': '7' });
    let failure;
    try { await api.submitResearch('What rule applies?', 'Hong Kong'); } catch (error) { failure = error; }
    assert.match(failure.message, message);
    const cell = api.errorToCell(failure.message);
    assert.equal(cell.researchState, 'error'); assert.deepEqual(cell.verifiedCitations, []); assert.equal(cell.researchEvidence, undefined);
  }
});

test('backend failure is surfaced and evidence endpoint is never read', async () => {
  handler = (req, res) => send(res, 200, { job_id: 'test-job', status: 'failed', error: 'Model unavailable' });
  await assert.rejects(api.awaitEvidence('test-job'), /Model unavailable/);
  assert.ok(received.every(r => !r.path.endsWith('/evidence')));
});

test('request timeout and total polling deadline remain bounded', async () => {
  handler = () => {}; // HTTP accepts but never returns a response.
  await assert.rejects(api.awaitEvidence('test-job', { maxWaitMs: 40 }), /请求超时/);
  handler = (req, res) => send(res, 200, { status: 'running' });
  await assert.rejects(api.awaitEvidence('test-job', { maxWaitMs: 30, intervalMs: 5 }), /超时/);
});

test('unavailable server and cancellation do not fall back to demo answers', async () => {
  const unavailable = http.createServer(); await new Promise(resolve => unavailable.listen(0, '127.0.0.1', resolve));
  const closed = `http://127.0.0.1:${unavailable.address().port}`;
  await new Promise(resolve => unavailable.close(resolve)); api.setResearchApiUrl(closed);
  await assert.rejects(api.submitResearch('What rule applies?', 'Hong Kong'), /无法连接研究后端/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(api.awaitEvidence('test-job', { signal: controller.signal }), /取消/);
});

test('incomplete or failed verification never becomes a formal or compliant conclusion', () => {
  for (const verdict of ['yes', 'no', 'descriptive', 'not_applicable']) {
    const evidence = record(); evidence.export_record.conclusion = verdict;
    assert.equal(api.evidenceToCell(evidence).complianceStatus, 'inconclusive');
    assert.equal(api.evidenceToCell(evidence).researchState, 'review_pending');
  }
  const failed = record(); failed.candidate_answer = { verdict: 'yes' }; failed.export_record.conclusion = 'insufficient_evidence'; failed.export_record.verification_status = 'failed';
  assert.equal(api.evidenceToCell(failed).researchState, 'validation_failed');
  delete failed.candidate_answer; assert.equal(api.evidenceState(failed), 'validation_failed');
  const missing = record(); missing.export_record.direct_evidence = []; assert.equal(api.evidenceState(missing), 'insufficient_evidence');
  const unchecked = record(); delete unchecked.export_record.validation_gates.exact_evidence; assert.equal(api.evidenceState(unchecked), 'validation_failed');
  const version = record(); version.export_record.validation_gates.legal_version = false; assert.equal(api.evidenceState(version), 'validation_failed');
  assert.equal(api.safeOfficialUrl('javascript:alert(1)'), undefined);
});

const jurisdictions = [{ code: 'HK', name: 'Hong Kong' }, { code: 'JP', name: 'Japan' }];
function completedCell(verdict = 'yes', jurisdiction = 'Hong Kong') {
  const evidence = record();
  Object.assign(evidence.export_record, { conclusion: verdict, jurisdiction, legal_instrument: `${jurisdiction} Test Act`, regulation_location: 'Section 12', conditions_or_exceptions: ['Only for the specified test scope'] });
  return api.evidenceToCell(evidence);
}
function setCell(session, q, code, cell) { session.matrixCells[`${session.questions[q].questionId}_${code}`] = cell; }

test('single-jurisdiction summary contains only stored verdict, scope, conditions and citations', () => {
  const session = api.createPendingSession(['Test question?'], jurisdictions.slice(0, 1));
  setCell(session, 0, 'HK', completedCell());
  const result = api.refreshQuestionSummaries(session);
  const summary = result.questions[0].crossCountrySummary;
  assert.match(summary, /Hong Kong Test Act · Section 12/);
  assert.match(summary, /仍待人工复核/);
  assert.doesNotMatch(summary, /共同点|差异|合规|违规/);
  assert.match(session.matrixCells[`${session.questions[0].questionId}_HK`].researchSummary, /Test scope/);
  assert.match(api.macroSynthesisNote(result, result.questions[0]), /^Macro Synthesis: .*仍待人工复核/s);
});

test('waits for all jurisdictions; failures name the jurisdiction with no result and do not trigger comparison', () => {
  const session = api.createPendingSession(['Test question?'], jurisdictions);
  assert.match(session.questions[0].crossCountrySummary, /等待全部辖区完成/);
  setCell(session, 0, 'HK', completedCell());
  assert.match(api.questionSummary(session, session.questions[0]), /等待全部辖区完成.*Japan/);
  setCell(session, 0, 'JP', api.errorToCell('无法连接研究后端'));
  const summary = api.questionSummary(session, session.questions[0]);
  assert.match(summary, /没有通过校验的结论：Japan/);
  assert.match(summary, /Japan：研究失败。无结果；无法连接研究后端/);
  assert.doesNotMatch(summary, /共同点|差异|Japan Test Act/);
});

test('missing summary and insufficient or failed gates are explicit and never become formal conclusions', () => {
  const session = api.createPendingSession(['Test question?'], jurisdictions);
  const insufficient = record(); insufficient.export_record.summary = ''; insufficient.export_record.direct_evidence = [];
  const failed = record(); failed.export_record.summary = ''; failed.export_record.validation_gates.exact_evidence = false;
  const a = api.evidenceToCell(insufficient), b = api.evidenceToCell(failed);
  assert.match(a.researchSummary, /本次未生成可用总结：证据不足/);
  assert.match(b.researchSummary, /本次未生成可用总结：校验未通过/);
  setCell(session, 0, 'HK', a); setCell(session, 0, 'JP', b);
  const summary = api.questionSummary(session, session.questions[0]);
  assert.match(summary, /有通过机器校验的结论（仍待人工复核）：无/);
  assert.match(summary, /Hong Kong：证据不足/);
  assert.match(summary, /Japan：已完成 · 未通过校验/);
  assert.doesNotMatch(summary, /共同点|差异/);
});

test('comparison uses only verdict labels after two verified results; retry resets synthesis and other questions stay independent', () => {
  const session = api.createPendingSession(['First?', 'Second?'], jurisdictions);
  setCell(session, 0, 'HK', completedCell('yes')); setCell(session, 0, 'JP', completedCell('no', 'Japan'));
  let refreshed = api.refreshQuestionSummaries(session);
  assert.match(refreshed.questions[0].crossCountrySummary, /差异（仅结论标签）/);
  assert.match(refreshed.questions[1].crossCountrySummary, /等待全部辖区完成/);
  setCell(session, 0, 'JP', completedCell('yes', 'Japan'));
  assert.match(api.questionSummary(session, session.questions[0]), /共同点（仅结论标签）/);
  setCell(session, 0, 'JP', api.pendingCell());
  refreshed = api.refreshQuestionSummaries(session);
  assert.match(refreshed.questions[0].crossCountrySummary, /等待全部辖区完成/);
  assert.match(api.macroSynthesisNote(refreshed, refreshed.questions[0]), /等待全部辖区完成/);
  assert.equal(api.refreshQuestionSummaries({ ...session, mode: 'demo' }).questions, session.questions);
});

// Gateway responses below are test-only protocol fixtures, never application demo fallbacks.
test('gateway auth saves only a session token and sends bearer without backend keys', async () => {
  api.setResearchApiKey('test-local-backend-key');
  const issued = { token: 'test-only-signed-token', expires_at: new Date(Date.now()+3600000).toISOString() };
  handler = (req, res) => req.url === '/auth' ? send(res, 200, issued) : send(res, 202, { job_id: 'test-job' });
  await api.authenticateResearch('test-only-access-password', base);
  assert.deepEqual(api.getResearchAccess(base).token, issued.token);
  assert.ok(!sessionStorage.getItem('hk_research_access_token').includes('test-only-access-password'));
  assert.equal(localStorage.getItem('hk_research_access_token'), null);
  await api.submitResearch('What rule applies?', 'Hong Kong', '', { url: base, key: 'test-never-send-key', mode: 'gateway', token: issued.token });
  assert.equal(received[1].key, undefined); assert.equal(received[1].authorization, `Bearer ${issued.token}`);
});

test('gateway expiry/revocation clears token and pause/quota/offline reasons stay specific', async () => {
  const connection = { url: base, key: '', mode: 'gateway', token: 'test-only-token' };
  for (const [status, code, detail] of [[401, 'TOKEN_EXPIRED', '访问令牌已过期'], [401, 'ACCESS_REVOKED', '此访问口令已停用'], [429, 'DAILY_TASK_LIMIT', '今天的研究任务额度已用完'], [503, 'RESEARCH_PAUSED', '实时研究已由管理员暂停'], [503, 'BACKEND_OFFLINE', '本机后端离线、Mac 休眠']]) {
    sessionStorage.setItem('hk_research_access_token', JSON.stringify({ token: connection.token, expires_at: new Date(Date.now()+3600000).toISOString(), url: base }));
    handler = (req, res) => send(res, status, { code, detail });
    await assert.rejects(api.submitResearch('What rule applies?', 'Hong Kong', '', connection), error => error.message === detail && error.code === code);
    if (status === 401) assert.equal(api.getResearchAccess(base), null);
  }
  sessionStorage.setItem('hk_research_access_token', JSON.stringify({ token: 'test-expired', expires_at: new Date(Date.now()-1000).toISOString(), url: base }));
  assert.equal(api.getResearchAccess(base), null);
  assert.match(api.getResearchAccessError(), /已过期/);
  // Re-reading an empty token (e.g. sidebar mount on refresh) preserves the reason.
  assert.equal(api.getResearchAccess(base), null); assert.match(api.getResearchAccessError(), /已过期/);
});

test('polling reports queued/running/completed phases without converting machine verification to approval', async () => {
  const states = ['queued', 'running', 'completed'], phases = [];
  handler = (req, res) => req.url.endsWith('/evidence') ? send(res, 200, record()) : send(res, 200, { job_id: 'test-job', status: states.shift() });
  const evidence = await api.awaitEvidence('test-job', { intervalMs: 1, onProgress: job => phases.push(job.status) });
  assert.deepEqual(phases, ['queued', 'running', 'completed']);
  assert.equal(api.evidenceToCell(evidence).researchState, 'review_pending');
});

test('public build cannot bypass gateway via saved local URL and never falls back when Worker URL is missing', async () => {
  const buildApi = async config => {
    const modified = source.replace('(import.meta as any).env || {}', JSON.stringify(config));
    const { outputText } = ts.transpileModule(modified, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  };
  const missing = await buildApi({ VITE_RESEARCH_ACCESS_MODE: 'gateway' });
  assert.equal(missing.isResearchApiConfigured(), true); assert.equal(missing.getResearchApiUrl(), '');
  assert.throws(() => missing.setResearchApiUrl(base), /构建配置/);
  const live = await buildApi({ VITE_RESEARCH_GATEWAY_URL: 'https://test-worker.example' });
  assert.equal(live.getResearchApiUrl(), 'https://test-worker.example'); assert.equal(live.getResearchConnection().key, '');
});
