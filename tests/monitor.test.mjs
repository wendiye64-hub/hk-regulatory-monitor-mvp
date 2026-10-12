import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { extractHtml, extractOfficialText, usableText, bodyText } from '../scripts/lib/source-text.mjs';
import { deterministicTriage, extractKeyDates, validateAiReview, selectExcerpt } from '../scripts/lib/triage.mjs';
import { enrichItem, backfillItems, planMonitorEnrichment } from '../scripts/lib/enrichment.mjs';
const item = { title: 'New settlement arrangements', source_label: 'HKEX Circulars', source_id: 'HKEX-PARTICIPANT-CIRC', official_url: 'https://www.hkex.com.hk/test.pdf', evidence_text: 'New settlement arrangements' };
const body = 'To: Exchange Participants\n\nThe new settlement arrangements apply to Exchange Participants and will become effective on 13 October 2026.\n\nParticipants must submit their response on or before 20 October 2026 using the form published with this circular.\n\nThe consultation period closes on 21 October 2026. Participants should read the detailed procedures in the attached official circular before submitting a response.\n\nThis paragraph provides additional information about the arrangements described in the circular and the official contact details for further enquiries.';
const canonical = bodyText(body);

test('HTML extracts article paragraphs and excludes navigation/footer/related releases', async () => {
  const html = '<nav>FAKE NAVIGATION DEADLINE 1 January 2099</nav><main><article><p>' + body + '</p></article><aside>OTHER NOTICE</aside></main><footer>FOOTER</footer>';
  const text = extractHtml(html);
  assert.match(text, /settlement arrangements/); assert.doesNotMatch(text, /FAKE|FOOTER|OTHER NOTICE/);
  const real = extractHtml(await readFile(new URL('fixtures/hkma-press-release.html', import.meta.url), 'utf8'));
  assert.match(real, /published today \(9 October\)/);
  assert.doesNotMatch(real, /Latest Press Releases|Skip to main|View All|Last revision/);
  const excerpt = selectExcerpt(real);
  assert.ok(excerpt.length <= 1500);
  assert.ok(excerpt.split('\n\n').every(quote => real.includes(quote)));
  assert.ok(!excerpt.endsWith('market')); // Never cut an original sentence to fill the cap.
});

test('real HKEX PDF text layer includes operative rates and effective date, not binary bytes', async () => {
  const bytes = await readFile(new URL('fixtures/hkex-margin-rates.pdf', import.meta.url));
  const result = await extractOfficialText(item.official_url, async () => ({ bytes, contentType: 'application/pdf' }));
  assert.equal(result.text_extraction, 'success'); assert.equal(result.source_format, 'pdf');
  assert.match(result.text, /13 October 2026/); assert.match(result.text, /minimum margin rates/);
  assert.equal(result.source_text_chars, result.text.length);
  const review = deterministicTriage({ ...item, title: 'Margin Rates pdf' }, result.text);
  assert.ok(review.summary.length >= 80 && review.summary.length <= 150);
  assert.match(review.summary, /Margin Rates/); assert.doesNotMatch(review.summary, /A wholly-owned subsidiary/);
  assert.equal(review.key_dates[0].date, '13 October 2026');
  assert.ok(review.source_excerpt.length <= 1500);
  review.source_excerpt.split('\n\n').forEach(quote => assert.ok(result.text.includes(quote)));
});

test('corrupt, image-only, title-only and unreachable documents have explicit extraction failure', async () => {
  assert.equal(usableText('\u0000\ufffd'.repeat(300)), false);
  for (const bytes of [Buffer.from('%PDF-1.7\ninvalid'), Buffer.from('<html><body>Title only</body></html>'), Buffer.from('<html><body><h1>' + 'A long title '.repeat(20) + '</h1></body></html>')]) {
    const result = await extractOfficialText(item.official_url, async () => ({ bytes, contentType: 'text/html' }));
    assert.equal(result.text_extraction, 'failed'); assert.equal(result.text, ''); assert.equal(result.source_text_chars, 0);
  }
  const result = await extractOfficialText(item.official_url, async () => { throw new Error('HTTP 503'); });
  assert.match(result.text_extraction_error, /503/);
  const review = deterministicTriage(item, item.title);
  assert.equal(review.summary, '仅能获取标题，未能抽取正文'); assert.deepEqual(review.key_points, []);
});

test('no model key is needed: points/dates/parties and excerpt are exact source content', async () => {
  const result = await enrichItem(item, { extract: async () => ({ text: canonical, source_text_chars: canonical.length, text_extraction: 'success' }), ai: async () => null });
  assert.equal(result.summary_method, 'extractive'); assert.equal(result.human_review_required, true);
  const retried = await enrichItem({ ...item, text_extraction_error: 'Old timeout' }, { extract: async () => ({ text: canonical, text_extraction: 'success' }), ai: async () => null });
  assert.equal(retried.text_extraction_error, undefined);
  assert.ok(result.key_points.length >= 2 && result.key_points.length <= 5);
  result.key_points.forEach(point => assert.ok(canonical.includes(point)));
  assert.deepEqual(result.key_dates.map(d => d.kind), ['effective','deadline','consultation']);
  result.key_dates.forEach(d => assert.ok(canonical.includes(d.evidence) && d.evidence.includes(d.date)));
  assert.ok(result.affected_parties.includes('Exchange Participants'));
  assert.deepEqual(extractKeyDates('Published 13 October 2026. No change is announced.'), []);
  const two = extractKeyDates('A circular dated 1 October 2026 will be effective on 13 October 2026 and responses must be submitted on or before 20 October 2026.');
  assert.deepEqual(two.map(d => [d.date, d.kind]), [['13 October 2026', 'effective'], ['20 October 2026', 'deadline']]);
  assert.deepEqual(extractKeyDates('These rules are not effective on 13 October 2026.'), []);
});

test('AI validation rejects invented summaries, points, dates, parties and empty evidence', async () => {
  const review = { ...deterministicTriage(item, canonical), summary: canonical.split('\n\n')[1] };
  assert.equal(validateAiReview(review, canonical), true);
  for (const patch of [{ summary: 'invented '.repeat(12) }, { key_points: ['An invented legal obligation', review.key_points[0]] },
    { key_dates: [{ date: '1 January 2099', kind: 'effective', evidence: canonical }] }, { affected_parties: ['Risk Management'] }, { evidence: [] }]) {
    assert.throws(() => validateAiReview({ ...review, ...patch }, canonical), /validation failed/);
  }
  const fallback = await enrichItem(item, { extract: async () => ({ text: canonical, text_extraction: 'success' }), ai: async () => { throw new Error('AI evidence validation failed'); } });
  assert.equal(fallback.summary_method, 'extractive');
});

test('backfill touches only short/template summaries, respects cap and preserves failed records verbatim', async () => {
  const complete = { ...item, summary: 'A full existing summary that should remain untouched. '.repeat(3), official_url: 'https://www.hkex.com.hk/complete' };
  const short = { ...item, summary: 'Short' };
  const failed = { ...short, official_url: 'https://www.hkex.com.hk/failed' };
  const extra = { ...short, official_url: 'https://www.hkex.com.hk/over-cap' };
  let calls = 0;
  const result = await backfillItems([complete, short, failed, extra], { limit: 2, enrich: async old => {
    calls++; return old === failed ? { text_extraction: 'failed', text_extraction_error: 'timeout' } : { ...old, summary: 'Updated', text_extraction: 'success', summary_method: 'extractive' };
  } });
  assert.equal(calls, 2); assert.equal(result.report.updated, 1);
  assert.equal(result.items[0], complete); assert.equal(result.items[2], failed); assert.equal(result.items[3], extra);
  assert.match(result.report.errors[0].error, /timeout/);
});

test('automatic extraction prioritizes new dates across sources and spends no budget on notices outside the published window', () => {
  const previous = Array.from({ length: 120 }, (_, i) => ({ ...item, publication_date: '2026-10-09',
    official_url: `https://www.hkex.com.hk/retained-${i}`, text_extraction: 'success', source_excerpt: canonical }));
  const olderSource = Array.from({ length: 30 }, (_, i) => ({ ...item, publication_date: '2026-01-01',
    official_url: `https://www.hkex.com.hk/old-${i}` }));
  const today = { ...item, publication_date: '2026-10-12', title: 'RE-COMMENCEMENT OF TRADING pdf' };
  const plan = planMonitorEnrichment([...olderSource, today], previous);
  assert.equal(plan.items.length, 120);
  assert.deepEqual([...plan.selectedUrls], [today.official_url]);
  assert.equal(plan.items[0].official_url, today.official_url);
  assert.equal(plan.items[1], previous[0]);
  assert.ok(plan.items.every(row => !row.official_url.includes('/old-')));
});

test('automatic pending queue drains across runs even after notices disappear from source listings', () => {
  const pending = Array.from({ length: 13 }, (_, i) => ({ ...item, publication_date: '2026-10-11',
    official_url: `https://www.hkex.com.hk/pending-${i}`, text_extraction: 'not_attempted' }));
  const complete = { ...item, publication_date: '2026-10-12', text_extraction: 'success', source_excerpt: canonical };
  const failed = { ...item, official_url: 'https://www.hkex.com.hk/failed', text_extraction: 'failed' };
  const legacy = { ...item, official_url: 'https://www.hkex.com.hk/legacy', summary: 'Existing legacy summary' };
  const first = planMonitorEnrichment([complete], [...pending, complete, failed, legacy]);
  assert.equal(first.selectedUrls.size, 12);
  const nextItems = first.items.map(row => first.selectedUrls.has(row.official_url) ? { ...row, text_extraction: 'success' } : row);
  const second = planMonitorEnrichment([complete], nextItems);
  assert.deepEqual([...second.selectedUrls], [pending[12].official_url]);
  assert.equal(second.items.find(row => row.official_url === complete.official_url), complete);
  assert.equal(second.items.find(row => row.official_url === failed.official_url), failed);
  assert.equal(second.items.find(row => row.official_url === legacy.official_url), legacy);
});

test('automatic extraction respects both configured and hard caps and puts undated notices after dated notices', () => {
  const notices = Array.from({ length: 130 }, (_, i) => ({ ...item, publication_date: '2026-10-12',
    official_url: `https://www.hkex.com.hk/notice-${i}` }));
  const undated = { ...item, publication_date: 'invalid' };
  assert.equal(planMonitorEnrichment([undated, ...notices], [], { limit: 999, maxItems: 999 }).selectedUrls.size, 20);
  const small = planMonitorEnrichment([undated, ...notices], [], { limit: 2, maxItems: 3 });
  assert.equal(small.items.length, 3);
  assert.deepEqual([...small.selectedUrls], notices.slice(0, 2).map(row => row.official_url));
  assert.deepEqual(planMonitorEnrichment([undated, notices[0]], []).items.map(row => row.official_url), [notices[0].official_url, undated.official_url]);
});

test('adapter maps new structured fields, labels failures and accepts legacy records without invented evidence or effective dates', async () => {
  const source = await readFile(new URL('../src/services/backendAdapters.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const adapter = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  const structured = { ...item, publication_date: '2026-10-09', ...deterministicTriage(item, canonical), source_text_chars: canonical.length, text_extraction: 'success' };
  const { regulations, alerts } = adapter.adaptBackendMonitorFeed([structured, { ...structured, source_excerpt: undefined, key_points: undefined, key_dates: undefined, text_extraction: undefined, evidence: [item.title] },
    { ...structured, text_extraction: 'failed', source_excerpt: 'untrusted body', text_extraction_error: 'HTTP 503' }]);
  assert.equal(regulations[0].authenticExcerpt, structured.source_excerpt);
  assert.deepEqual(regulations[0].keyPoints, structured.key_points);
  assert.equal(regulations[0].effectiveDate, '13 October 2026');
  assert.equal(regulations[1].authenticExcerpt, item.title); assert.equal(regulations[1].effectiveDate, '未提供');
  assert.equal(regulations[2].authenticExcerpt, '仅能获取标题，未能抽取正文');
  assert.deepEqual(regulations[0].affectedBusinessUnits, []); assert.equal(alerts[0].aiRelevanceSummary, structured.summary);
  const backfilled = adapter.adaptBackendMonitorFeed({ items: [structured], backfill: { attempted: 1, updated: 0, errors: [{ official_url: structured.official_url, error: 'timeout' }] } });
  assert.equal(backfilled.regulations[0].backfillError, 'timeout');
  assert.equal(backfilled.regulations[0].authenticExcerpt, structured.source_excerpt);
});
