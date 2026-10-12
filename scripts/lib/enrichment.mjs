import { extractOfficialText } from './source-text.mjs';
import { aiTriage, deterministicTriage } from './triage.mjs';
import { mapLimit } from './http.mjs';

export const boundedNumber = (value, fallback, max) => Math.max(1, Math.min(max, Number.parseInt(value, 10) || fallback));

export function planMonitorEnrichment(collected, previousItems, { limit = 12, maxItems = 120 } = {}) {
  const previousByUrl = new Map(previousItems.map(item => [item.official_url, item]));
  const merged = new Map(previousByUrl);
  for (const item of collected) {
    if (previousByUrl.has(item.official_url)) continue;
    const { evidence_text, ...publicItem } = item;
    merged.set(item.official_url, { ...publicItem, detection: 'new_official_publication', ...deterministicTriage(item, ''),
      source_text_chars: 0, text_extraction: 'not_attempted',
      text_extraction_error: '本轮正文抓取数量已达上限；后续轮次或手动补全重试。' });
  }
  // Allocate downloads only after choosing the notices that will be published.
  // Pending notices remain eligible even after disappearing from a source listing.
  const items = [...merged.values()].sort((a, b) => (Date.parse(b.publication_date) || 0) - (Date.parse(a.publication_date) || 0))
    .slice(0, boundedNumber(maxItems, 120, 120));
  const selectedUrls = new Set(items.filter(item => item.text_extraction === 'not_attempted')
    .slice(0, boundedNumber(limit, 12, 20)).map(item => item.official_url));
  return { items, selectedUrls };
}

export function needsBackfill(item) {
  return item.summary_method === 'title_only' || (item.summary || '').length < 80
    || /^Official .*(?:detected:|release detected:)/i.test(item.summary || '');
}
export async function enrichItem(item, { extract = extractOfficialText, ai = aiTriage } = {}) {
  // Collector evidence_text is a listing title, not a document body.
  const extracted = await extract(item.document_url || item.official_url);
  const { text, ...extraction } = extracted;
  let review;
  if (extracted.text_extraction === 'success') {
    try { review = await ai(item, text); }
    catch (error) { console.warn(`AI validation/fetch failed; using exact source excerpts: ${item.official_url}: ${error.message}`); }
  }
  const { evidence_text, text_extraction_error: staleError, ...publicItem } = item;
  return { ...publicItem, detection: item.detection || 'new_official_publication', ...extraction,
    ...(review || deterministicTriage(item, text)), human_review_required: true };
}
export async function backfillItems(items, { limit = 10, concurrency = 4, urls = [], enrich = enrichItem } = {}) {
  const candidates = items.filter(item => needsBackfill(item) && (!urls.length || urls.includes(item.official_url))).slice(0, boundedNumber(limit, 10, 20));
  const replacements = new Map(); const errors = [];
  await mapLimit(candidates, boundedNumber(concurrency, 4, 4), async item => {
    try {
      const updated = await enrich(item);
      if (updated.text_extraction !== 'success' || updated.summary_method === 'title_only') throw new Error(updated.text_extraction_error || 'No informative body passages');
      replacements.set(item.official_url, updated);
    } catch (error) { errors.push({ official_url: item.official_url, error: String(error.message || error) }); }
  });
  return { items: items.map(item => replacements.get(item.official_url) || item), report: { attempted: candidates.length, updated: replacements.size, errors } };
}
