import { fetchJson } from './http.mjs';

function baseDomain(title) {
  const value = title.toLowerCase();
  if (/listing|listed issuer|connected transaction|spin-off/.test(value)) return 'listing_rules';
  if (/payment|clearing|settlement|infrastructure|market data|collateral/.test(value)) return 'market_infrastructure';
  if (/licen|authori[sz]|register/.test(value)) return 'licensing_benchmark';
  if (/disciplin|enforcement|penalt|fraud|anti-money|aml|sanction/.test(value)) return 'enforcement';
  if (/capital|liquidity|prudential|banking|risk|supervis/.test(value)) return 'prudential';
  return 'other_regulatory';
}

export function deterministicTriage(item, sourceText) {
  const evidence = sourceText.includes(item.title) ? [item.title] : [];
  const domain = baseDomain(item.title);
  const sourceRules = {
    'HKEX-CORP-NEWS':['corporate_news','no_clear_impact','Official HKEX corporate news'],
    'HKEX-MARKET-CONSULT':['consultation_paper','potential_impact','Official HKEX market consultation'],
    'HKEX-MARKET-COMMS':['market_communication','review_required','Official HKEX market communication'],
    'HKEX-PARTICIPANT-CIRC':['participant_circular','review_required','Official HKEX participant circular'],
    'HKEX-MARKET-DATA-NOTICES':['official_notice','review_required','Official HKEX market data notice'],
    'HKEX-HOSTING-NOTICES':['official_notice','review_required','Official HKEX hosting notice'],
    'HKMA-CIRCULARS':['regulatory_circular','potential_impact','Official HKMA circular'],
    'HKMA-GUIDELINES':['regulatory_guideline','potential_impact','Official HKMA guideline'],
    'HKMA-SPM':['supervisory_policy','potential_impact','Official HKMA supervisory policy document'],
    'HKMA-CONSULTATIONS':['consultation_paper','potential_impact','Official HKMA consultation'],
    'HKMA-GTA':['authorization_guide','potential_impact','Official HKMA authorization guide'],
    'HKMA-CODES':['code_of_practice','potential_impact','Official HKMA code of practice']
  };
  if (sourceRules[item.source_id]) {
    const [change_type, impact_status, prefix] = sourceRules[item.source_id];
    return { regulatory_domain:domain, change_type, impact_status, summary:`${prefix} detected: ${item.title}`, evidence, human_review_required:true };
  }
  let change_type = 'official_release';
  let impact_status = 'review_required';
  if (/consultation/i.test(item.title)) { change_type = 'consultation_paper'; impact_status = 'potential_impact'; }
  else if (/circular|guideline|rule|requirement/i.test(item.title)) { change_type = 'regulatory_update'; impact_status = 'potential_impact'; }
  return { regulatory_domain:domain, change_type, impact_status, summary:`Official release detected: ${item.title}`, evidence, human_review_required:true };
}

export async function aiTriage(item, sourceText) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const prompt = `Classify this Hong Kong official regulatory release using only the supplied source. Return strict JSON with regulatory_domain, change_type, impact_status, summary, evidence. regulatory_domain: listing_rules, market_infrastructure, licensing_benchmark, enforcement, prudential, other_regulatory, or unclear. impact_status: no_clear_impact, potential_impact, or review_required. summary max 25 words. evidence must contain 1-3 exact source excerpts. TITLE: ${item.title}\nSOURCE: ${sourceText.slice(0,12000)}`;
  const data = await fetchJson('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{ authorization:`Bearer ${key}`, 'content-type':'application/json' },
    body:JSON.stringify({ model:process.env.OPENAI_MODEL || 'gpt-5-mini', input:prompt }),
    timeoutMs:60000,
    attempts:1
  });
  const text = data.output_text || data.output?.flatMap(output => output.content || []).find(content => content.type === 'output_text')?.text || '';
  const review = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  const domains = new Set(['listing_rules','market_infrastructure','licensing_benchmark','enforcement','prudential','other_regulatory','unclear']);
  const impacts = new Set(['no_clear_impact','potential_impact','review_required']);
  if (!domains.has(review.regulatory_domain) || !impacts.has(review.impact_status) || !Array.isArray(review.evidence) || review.evidence.some(quote => !sourceText.includes(quote))) throw new Error('AI evidence validation failed');
  return { ...review, human_review_required:true };
}
