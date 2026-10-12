import { readFile, writeFile } from 'node:fs/promises';
import { mapLimit } from './lib/http.mjs';
import { enrichItem, backfillItems, boundedNumber, planMonitorEnrichment } from './lib/enrichment.mjs';
import { sources } from './source-registry.mjs';

const outputPath = new URL('../public/data/latest-run.json', import.meta.url);
const previous = JSON.parse(await readFile(outputPath, 'utf8'));
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
  const collectedByUrl = new Map(collected.map(item => [item.official_url, item]));
  const plan = planMonitorEnrichment(collected, previous.items || [], {
    limit: maximum, maxItems: process.env.MAX_DASHBOARD_ITEMS
  });
  const items = await mapLimit(plan.items, concurrency, async item => {
    if (plan.selectedUrls.has(item.official_url)) return enrichItem(collectedByUrl.get(item.official_url) || item);
    return item;
  });
  payload = {
    generated_at: new Date().toISOString(), monitor_request: 'Monitor current Hong Kong regulatory updates', duration_ms: Date.now()-startedAt,
    sources_checked: runs.filter(run => run.status === 'fulfilled').length, source_runs: runs.map(({ items, ...run }) => run),
    items, enrichment: { limit: maximum, attempted: plan.selectedUrls.size,
      succeeded: items.filter(item => plan.selectedUrls.has(item.official_url) && item.text_extraction === 'success').length,
      failed: items.filter(item => plan.selectedUrls.has(item.official_url) && item.text_extraction === 'failed').length,
      pending: items.filter(item => item.text_extraction === 'not_attempted').length }
  };
}
const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(outputPath, serialized);
if (process.env.SYNC_DIST !== 'false') {
  for (const directory of ['dist', '.local-dist']) {
    try { await writeFile(new URL(`../${directory}/data/latest-run.json`, import.meta.url), serialized); } catch {}
  }
}
console.log(JSON.stringify({ items: payload.items.length, duration_ms: payload.duration_ms, backfill: payload.backfill, enrichment: payload.enrichment }));
