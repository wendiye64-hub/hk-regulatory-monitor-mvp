import { readFile, writeFile } from 'node:fs/promises';
import { fetchText, mapLimit } from './lib/http.mjs';
import { clean } from './lib/collector-utils.mjs';
import { aiTriage, deterministicTriage } from './lib/triage.mjs';
import { sources } from './source-registry.mjs';

const outputPath = new URL('../public/data/latest-run.json', import.meta.url);
const builtOutputPath = new URL('../dist/data/latest-run.json', import.meta.url);
const previous = JSON.parse(await readFile(outputPath, 'utf8'));
const previousByUrl = new Map((previous.items || []).map(item => [item.official_url, item]));
const startedAt = Date.now();

async function runSource(source) {
  const start = Date.now();
  try {
    const items = await source.collect();
    return { source_id:source.source_id, label:source.label, status:'fulfilled', duration_ms:Date.now()-start, count:items.length, items };
  } catch (error) {
    return { source_id:source.source_id, label:source.label, status:'rejected', duration_ms:Date.now()-start, count:0, error:String(error.message || error), items:[] };
  }
}

const runs = await Promise.all(sources.map(runSource));
const collected = runs.flatMap(run => run.items);
if (!collected.length) throw new Error('No official-source items were collected; existing dashboard data was preserved.');

const items = await mapLimit(collected, Number(process.env.TRIAGE_CONCURRENCY || 8), async item => {
  if (previousByUrl.has(item.official_url)) return previousByUrl.get(item.official_url);
  let sourceText = item.evidence_text || '';
  if (!sourceText) {
    try { sourceText = clean(await fetchText(item.official_url)); } catch {}
  }
  let triage;
  try { triage = await aiTriage(item, sourceText); }
  catch (error) { console.warn(`AI review held for ${item.official_url}: ${error.message}`); }
  const { evidence_text, ...publicItem } = item;
  return { ...publicItem, detection:'new_official_publication', ...(triage || deterministicTriage(item, sourceText)) };
});

const merged = [...items, ...(previous.items || [])];
const payload = {
  generated_at:new Date().toISOString(),
  monitor_request:'Monitor current Hong Kong regulatory updates',
  duration_ms:Date.now()-startedAt,
  sources_checked:runs.filter(run => run.status === 'fulfilled').length,
  source_runs:runs.map(({ items:ignored, ...run }) => run),
  items:[...new Map(merged.map(item => [`${item.source_id}|${item.publication_date}|${item.title.toLowerCase()}`, item])).values()]
    .sort((a,b) => new Date(b.publication_date)-new Date(a.publication_date))
    .slice(0, Number(process.env.MAX_DASHBOARD_ITEMS || 120))
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(outputPath, serialized);
// Keep an already-built local preview fresh without requiring a full rebuild.
// CI disables this mirror so the workflow can rebase/commit only the canonical
// public artifact without an unrelated dirty dist worktree.
if (process.env.SYNC_DIST !== 'false') {
  try { await writeFile(builtOutputPath, serialized); } catch {}
}
console.log(`Updated ${payload.items.length} dashboard items from ${payload.sources_checked}/${sources.length} sources in ${payload.duration_ms}ms.`);
