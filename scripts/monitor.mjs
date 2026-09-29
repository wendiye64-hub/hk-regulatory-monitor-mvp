import { readFile, writeFile } from 'node:fs/promises';

const outputPath = new URL('../dist/data/latest-run.json', import.meta.url);
const previous = JSON.parse(await readFile(outputPath, 'utf8'));
const previousByUrl = new Map((previous.items || []).map(item => [item.official_url, item]));
const headers = {accept:'text/html,application/xhtml+xml','user-agent':'RegWatch-HK/1.0 (official-public-source monitor)'};

function clean(value){return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim()}
function isoDate(value){const m=String(value).match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);if(!m)return value;const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};return `${m[3]}-${months[m[2]]}-${m[1].padStart(2,'0')}`}
function isoSlashDate(value){const m=String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:value}

async function fetchText(url){const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}`);return response.text()}

async function collectHkex(){
  const listing='https://www.hkex.com.hk/News/Regulatory-Announcements?sc_lang=en';
  const html=await fetchText(listing);const rows=[];
  for(const match of html.matchAll(/<div class="whats_on_tdy_text_2"><a href="([^"]+)" title="([^"]*)" target="_blank">([\s\S]*?)<\/a>/gi)){
    const url=new URL(match[1].replace(/&amp;/g,'&'),'https://www.hkex.com.hk').href,title=clean(match[3]||match[2]),id=url.match(/\/(\d{4})\/(\d{6,})news/i)?.[2];
    if(title&&id)rows.push({publication_date:`20${id.slice(0,2)}-${id.slice(2,4)}-${id.slice(4,6)}`,title,official_url:url,source_id:'DEDUP-00033',source_label:'HKEX Regulatory Announcements'});
  }
  return [...new Map(rows.map(row=>[`${row.publication_date}|${row.title.toLowerCase()}`,row])).values()].slice(0,10);
}

async function collectHkexListing(listing,source_id,source_label){
  const html=await fetchText(listing);const rows=[];
  for(const match of html.matchAll(/<div class="whats_on_tdy_row">([\s\S]*?)<div class="whats_on_tdy_btn_set">/gi)){
    const row=match[1];
    const date=row.match(/whats_on_tdy_ball_number"><div>(\d{1,2})<\/div><\/div><div>([A-Za-z]{3}\s+\d{4})<\/div>/i);
    const release=row.match(/whats_on_tdy_text_2"><a href="([^"]+)" title="([^"]*)" target="_blank">([\s\S]*?)<\/a>/i);
    if(!date||!release)continue;
    const official_url=new URL(release[1].replace(/&amp;/g,'&'),'https://www.hkex.com.hk').href;
    const title=clean(release[3]||release[2]);
    if(title)rows.push({publication_date:isoDate(`${date[1]} ${date[2]}`),title,official_url,source_id,source_label});
  }
  return [...new Map(rows.map(row=>[`${row.publication_date}|${row.title.toLowerCase()}`,row])).values()].slice(0,10);
}

async function collectHkexNotices(listing,source_id,source_label){
  const html=await fetchText(listing);const rows=[];
  for(const match of html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell=>cell[1]);
    if(cells.length<3)continue;
    const publication_date=isoSlashDate(clean(cells[0]));
    const reference=clean(cells[1]);
    const release=cells[2].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(publication_date)||!release)continue;
    const official_url=new URL(release[1].replace(/&amp;/g,'&'),'https://www.hkex.com.hk').href;
    const title=clean(release[2]);
    if(title)rows.push({publication_date,title,official_url,reference,source_id,source_label});
  }
  return [...new Map(rows.map(row=>[row.official_url,row])).values()].slice(0,10);
}

async function collectHkma(){
  const html=await fetchText('https://www.hkma.gov.hk/eng/news-and-media/press-releases/');
  return [...html.matchAll(/<ul>\s*<li>([^<]+)<\/li>\s*<li><a href="([^"]+)" title="([^"]+)"/gi)].slice(0,10).map(match=>({publication_date:isoDate(match[1].trim()),official_url:new URL(match[2],'https://www.hkma.gov.hk').href,title:clean(match[3]),source_id:'DEDUP-00031',source_label:'HKMA Press Releases'}));
}

function deterministicTriage(item,sourceText){
  if(item.source_id==='HKEX-CORP-NEWS'){
    const evidence=sourceText.includes(item.title)?[item.title]:[];
    return {regulatory_domain:'other_regulatory',change_type:'corporate_news',impact_status:'no_clear_impact',summary:`Official HKEX corporate news detected: ${item.title}`,evidence,human_review_required:true};
  }
  if(item.source_id==='HKEX-MARKET-CONSULT'){
    const evidence=sourceText.includes(item.title)?[item.title]:[];
    return {regulatory_domain:'listing_rules',change_type:'consultation_paper',impact_status:'potential_impact',summary:`Official HKEX market consultation detected: ${item.title}`,evidence,human_review_required:true};
  }
  if(item.source_id==='HKEX-MARKET-COMMS'||item.source_id==='HKEX-PARTICIPANT-CIRC'||item.source_id.includes('NOTICES')){
    const evidence=sourceText.includes(item.title)?[item.title]:[];
    const change_type=item.source_id==='HKEX-MARKET-COMMS'?'market_communication':item.source_id==='HKEX-PARTICIPANT-CIRC'?'participant_circular':'official_notice';
    return {regulatory_domain:'market_infrastructure',change_type,impact_status:'review_required',summary:`Official HKEX ${change_type.replaceAll('_',' ')} detected: ${item.title}`,evidence,human_review_required:true};
  }
  const title=item.title.toLowerCase();let regulatory_domain='other_regulatory',change_type='official_release',impact_status='review_required';
  if(/listing|listed issuer|connected transaction|spin-off/.test(title))regulatory_domain='listing_rules';
  else if(/payment|clearing|settlement|infrastructure/.test(title))regulatory_domain='market_infrastructure';
  else if(/licen|authori[sz]|register/.test(title))regulatory_domain='licensing_benchmark';
  else if(/disciplin|enforcement|penalt|fraud/.test(title))regulatory_domain='enforcement';
  else if(/capital|liquidity|prudential|banking/.test(title))regulatory_domain='prudential';
  if(/consultation/.test(title)){change_type='consultation_paper';impact_status='potential_impact'}
  else if(/circular|guideline|rule|requirement/.test(title)){change_type='regulatory_update';impact_status='potential_impact'}
  const evidence=sourceText.includes(item.title)?[item.title]:[];
  return {regulatory_domain,change_type,impact_status,summary:`Official release detected: ${item.title}`,evidence,human_review_required:true};
}

async function aiTriage(item,sourceText){
  const key=process.env.OPENAI_API_KEY;if(!key)return null;
  const prompt=`Classify this Hong Kong official regulatory release using only the supplied source. Return strict JSON with regulatory_domain, change_type, impact_status, summary, evidence. regulatory_domain: listing_rules, market_infrastructure, licensing_benchmark, enforcement, prudential, other_regulatory, or unclear. impact_status: no_clear_impact, potential_impact, or review_required. summary max 25 words. evidence must contain 1-3 exact source excerpts. TITLE: ${item.title}\nSOURCE: ${sourceText.slice(0,12000)}`;
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5-mini',input:prompt}),signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`AI returned HTTP ${response.status}`);const data=await response.json();const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'';const review=JSON.parse(text.match(/\{[\s\S]*\}/)?.[0]||'{}');
  const domains=new Set(['listing_rules','market_infrastructure','licensing_benchmark','enforcement','prudential','other_regulatory','unclear']),impacts=new Set(['no_clear_impact','potential_impact','review_required']);
  if(!domains.has(review.regulatory_domain)||!impacts.has(review.impact_status)||!Array.isArray(review.evidence)||review.evidence.some(q=>!sourceText.includes(q)))throw new Error('AI evidence validation failed');
  return {...review,human_review_required:true};
}

const monitors=[
  {source_id:'DEDUP-00033',label:'HKEX Regulatory Announcements',collect:collectHkex},
  {source_id:'DEDUP-00031',label:'HKMA Press Releases',collect:collectHkma},
  {source_id:'HKEX-CORP-NEWS',label:'HKEX Corporate News Releases',collect:()=>collectHkexListing('https://www.hkex.com.hk/News/News-Release?Category=Corporate&sc_lang=en','HKEX-CORP-NEWS','HKEX Corporate News Releases')},
  {source_id:'HKEX-MARKET-COMMS',label:'HKEX Market Communications',collect:()=>collectHkexListing('https://www.hkex.com.hk/News/Market-Communications?sc_lang=en','HKEX-MARKET-COMMS','HKEX Market Communications')},
  {source_id:'HKEX-MARKET-CONSULT',label:'HKEX Market Consultations',collect:()=>collectHkexListing('https://www.hkex.com.hk/News/Market-Consultations?sc_lang=en','HKEX-MARKET-CONSULT','HKEX Market Consultations')},
  {source_id:'HKEX-PARTICIPANT-CIRC',label:'HKEX Participant and Members Circulars',collect:()=>collectHkexListing('https://www.hkex.com.hk/Services/Circulars-and-Notices/Participant-and-Members-Circulars?sc_lang=en','HKEX-PARTICIPANT-CIRC','HKEX Participant and Members Circulars')},
  {source_id:'HKEX-MARKET-DATA-NOTICES',label:'HKEX Market Data Client Notices',collect:()=>collectHkexNotices('https://www.hkex.com.hk/eng/prod/dataprod/2026notices.htm','HKEX-MARKET-DATA-NOTICES','HKEX Market Data Client Notices')},
  {source_id:'HKEX-HOSTING-NOTICES',label:'HKEX Hosting Subscriber Notices',collect:()=>collectHkexNotices('https://www.hkex.com.hk/Services/Connectivity/Hosting-Services/Subscriber-Notices-and-Guidance-Note?sc_lang=en','HKEX-HOSTING-NOTICES','HKEX Hosting Subscriber Notices')}
];
const results=await Promise.allSettled(monitors.map(monitor=>monitor.collect()));
const collected=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
if(!collected.length)throw new Error('No official-source items were collected; existing dashboard data was preserved.');
const items=[];
const listingEvidenceSources=new Set(['HKEX-CORP-NEWS','HKEX-MARKET-COMMS','HKEX-MARKET-CONSULT','HKEX-PARTICIPANT-CIRC','HKEX-MARKET-DATA-NOTICES','HKEX-HOSTING-NOTICES']);
for(const item of collected){
  if(previousByUrl.has(item.official_url)){items.push(previousByUrl.get(item.official_url));continue}
  let sourceText=listingEvidenceSources.has(item.source_id)?item.title:'';if(!sourceText)try{sourceText=clean(await fetchText(item.official_url))}catch{}
  let triage;try{triage=await aiTriage(item,sourceText)}catch(error){console.warn(`AI review held for ${item.official_url}: ${error.message}`)}
  items.push({...item,detection:'new_official_publication',...(triage||deterministicTriage(item,sourceText))});
}
const merged=[...items,...(previous.items||[])];
const payload={generated_at:new Date().toISOString(),monitor_request:'Monitor current Hong Kong regulatory updates',sources_checked:results.filter(r=>r.status==='fulfilled').length,source_runs:monitors.map((monitor,index)=>({source_id:monitor.source_id,label:monitor.label,status:results[index].status})),items:[...new Map(merged.map(item=>[`${item.source_id}|${item.publication_date}|${item.title.toLowerCase()}`,item])).values()].sort((a,b)=>new Date(b.publication_date)-new Date(a.publication_date)).slice(0,80)};
await writeFile(outputPath,JSON.stringify(payload,null,2)+'\n');
console.log(`Updated ${payload.items.length} dashboard items from ${payload.sources_checked} sources.`);
