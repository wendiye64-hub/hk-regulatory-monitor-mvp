import { extractOfficialText } from './source-text.mjs';
import { aiTriage, deterministicTriage } from './triage.mjs';
import { mapLimit } from './http.mjs';

export const boundedNumber = (value, fallback, max) => Math.max(1, Math.min(max, Number.parseInt(value, 10) || fallback));
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
