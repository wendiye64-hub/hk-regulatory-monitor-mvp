// Real-source acceptance: deliberately disables model use, never prints keys.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fetchDocument } from './lib/http.mjs';
import { extractOfficialText } from './lib/source-text.mjs';
import { enrichItem, backfillItems } from './lib/enrichment.mjs';
const path = new URL('../public/data/latest-run.json', import.meta.url);
const feed = JSON.parse(await readFile(path, 'utf8'));
const samples = [feed.items.find(i => i.official_url.endsWith('ce_HKCC_DCRC_259_2026.pdf')),
  ...feed.items.filter(i => i.source_id === 'DEDUP-00031').slice(0, 2)];
assert.equal(samples.length, 3);
const verified = []; const replacements = new Map();
const start = Date.now();
for (const item of samples) {
  const document = await fetchDocument(item.official_url);
  const extraction = await extractOfficialText(item.official_url, async () => document);
  const result = await enrichItem(item, { extract: async () => extraction, ai: async () => null });
  assert.equal(result.text_extraction, 'success', result.text_extraction_error);
  assert.equal(result.summary_method, 'extractive');
  assert.ok(result.key_points.length >= 2);
  assert.ok(result.source_excerpt.length >= 600 && result.source_excerpt.length <= 1500);
  for (const point of result.key_points) assert.ok(extraction.text.includes(point), `Nonliteral point: ${point}`);
  for (const date of result.key_dates) assert.ok(extraction.text.includes(date.evidence) && date.evidence.includes(date.date));
  for (const paragraph of result.source_excerpt.split('\n\n')) assert.ok(extraction.text.includes(paragraph));
  replacements.set(item.official_url, result);
  verified.push({ ...result, fetched_sha256: createHash('sha256').update(document.bytes).digest('hex'), verification_source_text: extraction.text });
  if (result.source_format === 'pdf') await writeFile(new URL('../tests/fixtures/hkex-margin-rates.pdf', import.meta.url), document.bytes);
  if (result.source_format === 'html' && verified.length === 2) await writeFile(new URL('../tests/fixtures/hkma-press-release.html', import.meta.url), document.bytes);
  console.log(JSON.stringify({ title: item.title, format: result.source_format, body: result.source_text_chars, summary: result.summary, points: result.key_points.length, dates: result.key_dates, excerpt: result.source_excerpt.length }));
}
const backfill = await backfillItems(feed.items, { urls: samples.map(i => i.official_url), limit: 3, enrich: async item => replacements.get(item.official_url) });
if (process.argv.includes('--update-samples')) {
  // Explicit acceptance-demo refresh of these three URLs only; BACKFILL never overwrites a long summary.
  await writeFile(path, JSON.stringify({ ...feed, items: feed.items.map(item => replacements.get(item.official_url) || item) }, null, 2) + '\n');
}
const output = new URL('../../deliverables/monitor-samples/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('verified-announcements.json', output), JSON.stringify({ checked_at: new Date().toISOString(), duration_ms: Date.now() - start, items: verified }, null, 2) + '\n');
console.log(`Three real sources verified in ${Date.now() - start}ms; canonical feed: ${Buffer.byteLength(JSON.stringify(backfill.items))} bytes.`);
