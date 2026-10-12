import { fetchJson } from './http.mjs';
import { bodyText, usableText } from './source-text.mjs';

function baseDomain(title) {
  const value = title.toLowerCase();
  if (/listing|listed issuer|connected transaction|spin-off/.test(value)) return 'listing_rules';
  if (/payment|clearing|settlement|infrastructure|market data|collateral/.test(value)) return 'market_infrastructure';
  if (/licen|authori[sz]|register/.test(value)) return 'licensing_benchmark';
  if (/disciplin|enforcement|penalt|fraud|anti-money|aml|sanction/.test(value)) return 'enforcement';
  if (/capital|liquidity|prudential|banking|risk|supervis/.test(value)) return 'prudential';
  return 'other_regulatory';
}
const sourceRules = {
  'HKEX-CORP-NEWS':['corporate_news','no_clear_impact'],
  'HKEX-MARKET-CONSULT':['consultation_paper','potential_impact'],
  'HKEX-MARKET-COMMS':['market_communication','review_required'],
  'HKEX-PARTICIPANT-CIRC':['participant_circular','review_required'],
  'HKEX-MARKET-DATA-NOTICES':['official_notice','review_required'],
  'HKEX-HOSTING-NOTICES':['official_notice','review_required'],
  'HKMA-CIRCULARS':['regulatory_circular','potential_impact'],
  'HKMA-GUIDELINES':['regulatory_guideline','potential_impact'],
  'HKMA-SPM':['supervisory_policy','potential_impact'],
  'HKMA-CONSULTATIONS':['consultation_paper','potential_impact'],
  'HKMA-GTA':['authorization_guide','potential_impact'],
  'HKMA-CODES':['code_of_practice','potential_impact']
};
const datePattern = /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{4}-\d{2}-\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b|\d{4}年\d{1,2}月\d{1,2}日/gi;
const kinds = { effective: /(?:with effect|effective|come[s]? into (?:effect|force)|commenc|生效)/i, deadline: /(?:deadline|no later than|on or before|submit.{0,40}\bby\b|截止)/i, consultation: /(?:consultation.{0,100}(?:end|close|period|until)|諮詢期|咨询期)/i };

// Excerpts and all extracted facts use one canonical, whitespace-normalized body.
export function informativePassages(sourceText, title = '') {
  const text = bodyText(sourceText);
  const passages = text.split(/\n\n|(?<=[。！？])|(?<=[.!?])\s+(?=[A-Z])/u)
    .map(value => value.trim()).filter(value => (value.length >= 60 || /^[•*-]\s+\S/.test(value)) && value !== title && !/^(?:copyright|all rights reserved|privacy|disclaimer|contact us|skip to)/i.test(value));
  const informative = passages.filter(value => /\b(?:announce[sd]?|publish(?:ed|es)?|issu(?:ed|es)|will|shall|should|must|require[sd]?|pursuant|effective|has|have|is|are|inform|please|can|appoint|invite)\b|生效|公布|規定|规定|^[•*-]\s+\S/i.test(value));
  return informative.length ? informative : passages;
}
function shortQuote(text, maximum = 280) { return text.length <= maximum ? text : text.slice(0, maximum).replace(/\s+\S*$/, ''); }

export function extractKeyDates(sourceText) {
  const text = bodyText(sourceText);
  const dates = [];
  for (const paragraph of text.split(/\n\n|(?<=[。！？])|(?<=[.!?])\s+(?=[A-Z])/u)) {
    for (const match of paragraph.matchAll(datePattern)) {
      const context = paragraph.slice(Math.max(0, match.index - 120), match.index + match[0].length + 80);
      const before = paragraph.slice(Math.max(0, match.index - 120), match.index);
      const cues = Object.entries(kinds).flatMap(([kind, pattern]) => [...before.matchAll(new RegExp(pattern.source, 'gi'))].map(cue => ({ kind, index: cue.index, end: cue.index + cue[0].length })));
      const cue = cues.sort((a, b) => b.index - a.index)[0];
      // A keyword after a publication date does not make it an effective date.
      // Do not carry a cue across an intervening date or a negation.
      const intervening = cue ? before.slice(cue.end) : '';
      const kind = cue && ![...intervening.matchAll(datePattern)].length && !/\b(?:not|no)\s*$/i.test(before.slice(0, cue.index)) ? cue.kind : undefined;
      if (!kind) continue; // Publication dates alone are not effective dates/deadlines.
      const evidence = paragraph.length <= 600 ? paragraph.trim() : context.trim();
      if (!dates.some(d => d.date === match[0] && d.kind === kind)) dates.push({ date: match[0], kind, evidence });
    }
  }
  return dates.slice(0, 8);
}
export function extractAffectedParties(sourceText) {
  // Only explicit addressees / applicability clauses; never guess business units.
  const lines = sourceText.split(/\n+/);
  const parties = [];
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(/^\s*(?:To\s*:\s*|To all\s+)(.{3,160})$/i);
    if (match) parties.push(match[1].trim());
  }
  for (const match of sourceText.matchAll(/\b(?:applies to|applicable to)\s+([^.;\n]{3,140})/gi)) parties.push(match[1].trim());
  for (const match of sourceText.matchAll(/\b(Exchange Participants|Clearing Participants|Authorized Institutions|Primary Dealers|bondholders)\s+(?:should|must|are(?:\s+also)? required|are(?:\s+also)? expected)/gi)) parties.push(match[1]);
  return [...new Set(parties)].slice(0, 5);
}
export function selectExcerpt(sourceText, points = [], dates = []) {
  const paragraphs = bodyText(sourceText).split('\n\n');
  const contextual = [...points, ...dates.map(d => d.evidence)].map(quote => paragraphs.find(paragraph => paragraph.includes(quote)) || quote);
  const chunks = [];
  let length = 0;
  for (const quote of [...contextual, ...paragraphs]) {
    if (!quote || chunks.some(chunk => chunk.includes(quote))) continue;
    const sentences = quote.length <= 1500 - length - (chunks.length ? 2 : 0) ? [quote]
      : quote.split(/(?<=[。！？])|(?<=[.!?])\s+(?=[A-Z])/u).map(value => value.trim());
    for (const sentence of sentences) {
      if (!sentence || chunks.some(chunk => chunk.includes(sentence))) continue;
      const room = 1500 - length - (chunks.length ? 2 : 0);
      if (sentence.length > room) continue;
      chunks.push(sentence); length += sentence.length + (chunks.length > 1 ? 2 : 0);
    }
  }
  return chunks.join('\n\n');
}
export function deterministicTriage(item, sourceText) {
  const [change_type, impact_status] = sourceRules[item.source_id] || [/consultation/i.test(item.title) ? 'consultation_paper' : 'official_release', 'review_required'];
  const base = { regulatory_domain: baseDomain(item.title), change_type, impact_status, human_review_required: true };
  const canonical = bodyText(sourceText);
  const passages = informativePassages(canonical, item.title);
  if (!usableText(canonical) || !passages.length) return { ...base, summary: '仅能获取标题，未能抽取正文', key_points: [], key_dates: [], affected_parties: [], evidence: [], source_excerpt: '', summary_method: 'title_only' };
  // Cover separate body paragraphs before filling with further sentences.
  // Keep full sentences (including exceptions), not mid-clause truncations.
  const whole = passages.filter(passage => passage.length <= 600);
  const paragraphLeads = canonical.split('\n\n').map(paragraph => whole.find(passage => paragraph.includes(passage))).filter(Boolean);
  const key_points = [...new Set([...paragraphLeads, ...whole])].slice(0, 5);
  const key_dates = extractKeyDates(canonical);
  const affected_parties = extractAffectedParties(sourceText);
  const issuer = item.source_label?.includes('HKEX') ? 'HKEX' : item.source_label?.includes('HKMA') ? 'HKMA' : item.source_label;
  const topic = item.title.replace(/\s+pdf$/i, '');
  const title = shortQuote(topic, 35) + (topic.length > 35 ? '…' : '');
  const parties = affected_parties.length ? `；对象：${shortQuote(affected_parties[0], 30)}` : '';
  const prefix = `${issuer || '官方来源'}发布《${title}》${parties}。正文：`;
  // An extractive preview, not a fabricated paraphrase; full original sentences below.
  const offset = passages[0].search(/\b(?:published|announced|determined|will|shall|must)\b/i);
  const preview = offset >= 0 ? passages[0].slice(offset) : passages[0];
  let summary = prefix + shortQuote(preview, 149 - prefix.length);
  if (summary.length < 80 && passages[1]) summary = prefix + shortQuote([preview, passages[1]].join(' '), 149 - prefix.length);
  if (!preview.endsWith(summary.slice(prefix.length))) summary += '…';
  return { ...base, summary, key_points, key_dates, affected_parties, evidence: key_points.slice(0, 3), source_excerpt: selectExcerpt(canonical, key_points, key_dates), summary_method: 'extractive' };
}

export function validateAiReview(review, sourceText) {
  const exact = value => typeof value === 'string' && value.trim().length > 0 && sourceText.includes(value);
  const passages = informativePassages(sourceText);
  const completePoints = new Set([...passages, ...bodyText(sourceText).split('\n\n').filter(paragraph => passages.some(passage => paragraph.includes(passage)))]);
  const domains = new Set(['listing_rules','market_infrastructure','licensing_benchmark','enforcement','prudential','other_regulatory','unclear']);
  const impacts = new Set(['no_clear_impact','potential_impact','review_required']);
  if (!domains.has(review.regulatory_domain) || !impacts.has(review.impact_status) || typeof review.change_type !== 'string'
    || !exact(review.summary) || review.summary.length < 80 || review.summary.length > 150
    || !Array.isArray(review.evidence) || review.evidence.length < 1 || review.evidence.length > 3 || !review.evidence.every(quote => exact(quote) && quote.length <= 500)
    || !Array.isArray(review.key_points) || review.key_points.length < 2 || review.key_points.length > 5 || !review.key_points.every(point => exact(point) && point.length <= 600 && completePoints.has(point))
    || !Array.isArray(review.key_dates) || review.key_dates.length > 8
    || !review.key_dates.every(d => exact(d.evidence) && d.evidence.length <= 600 && typeof d.date === 'string' && d.date.length <= 50 && d.evidence.includes(d.date) && extractKeyDates(d.evidence).some(found => found.date === d.date && found.kind === d.kind))
    || !Array.isArray(review.affected_parties) || review.affected_parties.length > 5 || !review.affected_parties.every(p => extractAffectedParties(sourceText).includes(p))) throw new Error('AI evidence validation failed');
  return true;
}
export async function aiTriage(item, sourceText) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !usableText(sourceText)) return null;
  const body = bodyText(sourceText);
  const prompt = `Use only this official source. Return strict JSON: regulatory_domain, change_type, impact_status, summary, key_points, key_dates, affected_parties, evidence. Domains: listing_rules, market_infrastructure, licensing_benchmark, enforcement, prudential, other_regulatory, unclear. Impacts: no_clear_impact, potential_impact, review_required. summary: an exact contiguous informative source excerpt of 80-150 characters, no paraphrase. key_points: 2-5 exact complete source sentences or bullets, max 600 characters each; retain qualifications and exceptions. evidence: 1-3 exact excerpts, max 500 characters each. key_dates: [{date,kind,evidence}] only explicitly effective, deadline or consultation dates, with exact date spelling and exact contextual quote, max 600 characters; empty if none. affected_parties: only exact addressee/applicability phrases; empty if not explicit. No inferred impact or compliance conclusion. TITLE: ${item.title}\nSOURCE: ${body.slice(0,12000)}`;
  const data = await fetchJson('https://api.openai.com/v1/responses', {
    method:'POST', headers:{ authorization:`Bearer ${key}`, 'content-type':'application/json' },
    body:JSON.stringify({ model:process.env.OPENAI_MODEL || 'gpt-5-mini', input:prompt }), timeoutMs:20000, attempts:1
  });
  const text = data.output_text || data.output?.flatMap(output => output.content || []).find(content => content.type === 'output_text')?.text || '';
  const review = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  validateAiReview(review, body);
  // Whitelist fields: the model cannot override URL, review policy or extraction status.
  const { regulatory_domain, change_type, impact_status, summary, key_points, key_dates, affected_parties, evidence } = review;
  return { regulatory_domain, change_type, impact_status, summary, key_points, key_dates, affected_parties, evidence,
    source_excerpt: selectExcerpt(body, key_points, key_dates), summary_method: 'ai', human_review_required: true };
}
