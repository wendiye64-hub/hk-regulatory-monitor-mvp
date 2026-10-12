import { readFile, writeFile } from 'node:fs/promises';
import { mapLimit } from './lib/http.mjs';
import { deterministicTriage } from './lib/triage.mjs';
import { enrichItem, backfillItems, boundedNumber } from './lib/enrichment.mjs';
import { sources } from './source-registry.mjs';

const outputPath = new URL('../public/data/latest-run.json', import.meta.url);
const previous = JSON.parse(await readFile(outputPath, 'utf8'));
const previousByUrl = new Map((previous.items || []).map(item => [item.official_url, item]));
const startedAt = Date.now();
const concurrency = boundedNumber(process.env.TRIAGE_CONCURRENCY, 4, 4);
let payload;
if (process.env.BACKFILL === 'true') {
  const result = await backfillItems(previous.items || [], {
    limit: process.env.BACKFILL_LIMIT, concurrency,
    urls: (process.env.BACKFILL_URLS || '').split(',').map(s => s.trim()).filter(Boolean)
  });
  payload = { ...previous, generated_at: new Date().toISOString(), duration_ms: Date.now() - startedAt, items: result.items, backfill: result.report };
} else {
  const runs = await Promise.all(sources.map(async source => {
    const start = Date.now();
    try {
      const items = await source.collect();
      return { source_id: source.source_id, label: source.label, status: 'fulfilled', duration_ms: Date.now()-start, count: items.length, items };
    } catch (error) {
      return { source_id: source.source_id, label: source.label, status: 'rejected', duration_ms: Date.now()-start, count: 0, error: String(error.message || error), items: [] };
    }
  }));
  const collected = [...new Map(runs.flatMap(run => run.items).map(item => [item.official_url, item])).values()];
  if (!collected.length) throw new Error('No official-source items were collected; existing dashboard data was preserved.');
  const maximum = boundedNumber(process.env.MAX_ENRICH_ITEMS, 12, 20);
  const selected = new Set(collected.filter(item => !previousByUrl.has(item.official_url)
    || previousByUrl.get(item.official_url).text_extraction === 'not_attempted').slice(0, maximum).map(item => item.official_url));
  const items = await mapLimit(collected, concurrency, async item => {
    if (selected.has(item.official_url)) return enrichItem(item);
    if (previousByUrl.has(item.official_url)) return previousByUrl.get(item.official_url);
    const { evidence_text, ...publicItem } = item;
    return { ...publicItem, detection: 'new_official_publication', ...deterministicTriage(item, ''), source_text_chars: 0,
      text_extraction: 'not_attempted', text_extraction_error: '本轮正文抓取数量已达上限；后续轮次或手动补全重试。' };
  });
  // New/enriched records take precedence; preserve items absent from this collection.
  const merged = new Map((previous.items || []).map(item => [item.official_url, item]));
  for (const item of items) merged.set(item.official_url, item);
  payload = {
    generated_at: new Date().toISOString(), monitor_request: 'Monitor current Hong Kong regulatory updates', duration_ms: Date.now()-startedAt,
    sources_checked: runs.filter(run => run.status === 'fulfilled').length, source_runs: runs.map(({ items, ...run }) => run),
    items: [...merged.values()].sort((a,b) => new Date(b.publication_date)-new Date(a.publication_date)).slice(0, boundedNumber(process.env.MAX_DASHBOARD_ITEMS, 120, 120))
  };
}
const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(outputPath, serialized);
if (process.env.SYNC_DIST !== 'false') {
  for (const directory of ['dist', '.local-dist']) {
    try { await writeFile(new URL(`../${directory}/data/latest-run.json`, import.meta.url), serialized); } catch {}
  }
}
console.log(JSON.stringify({ items: payload.items.length, duration_ms: payload.duration_ms, backfill: payload.backfill }));
