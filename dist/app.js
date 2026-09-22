const ACCESS_KEY='regwatch-demo-access';
if(sessionStorage.getItem(ACCESS_KEY)!=='granted')window.location.replace('index.html');

const state={run:null,items:[],view:'monitor',displayMode:'board',catalog:'regulations',acknowledged:new Set(),dismissed:new Set()};
const sourceConfig={
  'DEDUP-00033':{authority:'Hong Kong Exchanges and Clearing',acronym:'HKEX',endpoint:'https://www.hkex.com.hk/News/Regulatory-Announcements?sc_lang=en',category:'Securities & Capital Markets'},
  'DEDUP-00031':{authority:'Hong Kong Monetary Authority',acronym:'HKMA',endpoint:'https://www.hkma.gov.hk/eng/news-and-media/press-releases/',category:'Banking & Financial Stability'}
};
const domainLabels={listing_rules:'Market conduct and listing rules',market_infrastructure:'Market infrastructure',licensing_benchmark:'Licensing & benchmarks',enforcement:'Enforcement',prudential:'Prudential and capital requirements',other_regulatory:'Other regulatory',unclear:'Unclear'};
const changeLabels={consultation_paper:'Consultation Paper',regulatory_update:'Regulatory Update',official_release:'Official Release'};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'#'}catch{return '#'}};
const materiality=item=>item.impact_status==='potential_impact'?'High':item.impact_status==='review_required'?'Medium':'Low';
const sourceFor=item=>sourceConfig[item.source_id]||{authority:item.source_label||'Official authority',acronym:'HK',endpoint:item.official_url,category:'Official Law & Publication'};
const themeFor=item=>domainLabels[item.regulatory_domain]||'Regulatory review';
const formatDate=value=>{const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?String(value||'Unknown'):date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})};
const formatRun=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'Run time unavailable':date.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'})+' HKT'};
const recentItems=()=>{if(!state.items.length)return[];const newest=Math.max(...state.items.map(item=>new Date(`${item.publication_date}T00:00:00`).getTime()).filter(Number.isFinite));const cutoff=newest-7*86400000;const weekly=state.items.filter(item=>new Date(`${item.publication_date}T00:00:00`).getTime()>=cutoff);return weekly.length?weekly:state.items.slice(0,6)};

function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600)}
function emptyState(title,message){return `<div class="empty-state"><b>${esc(title)}</b>${esc(message)}</div>`}

function alertCard(item){
  const source=sourceFor(item),level=materiality(item),tableClass=state.displayMode==='table'?' table-row':'';
  return `<article class="alert-card${tableClass}" data-url="${esc(item.official_url)}" tabindex="0">
    <div class="card-top"><div class="authority"><b>${esc(source.acronym)}</b><span>${esc(source.authority)}</span></div><span class="materiality ${level.toLowerCase()}">${level}</span></div>
    <div><h4>${esc(item.title)}</h4><div class="tag-row"><span class="mini-tag">Hong Kong</span><span class="mini-tag">${esc(themeFor(item))}</span></div><p class="ai-summary"><b>AI preliminary triage:</b> ${esc(item.summary||'Awaiting evidence-based summary.')}</p></div>
    <div class="card-bottom"><span>Published ${esc(formatDate(item.publication_date))}</span><div class="card-actions"><button class="acknowledge" data-action="acknowledge">Acknowledge</button><button class="dismiss" data-action="dismiss">Dismiss</button></div></div>
  </article>`;
}

function bindAlertCards(){
  $$('.alert-card').forEach(card=>{
    const item=state.items.find(entry=>entry.official_url===card.dataset.url);
    card.addEventListener('click',event=>{if(event.target.closest('button'))return;openDrawer(item)});
    card.addEventListener('keydown',event=>{if(event.key==='Enter')openDrawer(item)});
    card.querySelector('[data-action="acknowledge"]')?.addEventListener('click',()=>{state.acknowledged.add(item.official_url);state.dismissed.delete(item.official_url);showToast('Alert acknowledged and retained for review');renderAll()});
    card.querySelector('[data-action="dismiss"]')?.addEventListener('click',()=>{state.dismissed.add(item.official_url);showToast('Alert dismissed from the priority feed');renderAll()});
  });
}

function renderAlerts(){
  const query=$('#alert-search').value.trim().toLowerCase();
  const items=recentItems().filter(item=>!state.dismissed.has(item.official_url)&&!state.acknowledged.has(item.official_url)&&(!query||`${item.title} ${item.source_label} ${themeFor(item)}`.toLowerCase().includes(query)));
  $('#priority-feed').classList.toggle('table-mode',state.displayMode==='table');
  $('#priority-feed').innerHTML=items.length?items.map(alertCard).join(''):emptyState(state.items.length?'No matching pending alerts':'No live regulatory data','No template or fallback items are being shown. Refresh the published monitor results or wait for the next scheduled run.');
  $('#priority-count').textContent=`${items.length} actionable`;
  $('#nav-alert-count').textContent=items.length;
  bindAlertCards();
}

function regulationRows(items){
  if(!items.length)return emptyState('No regulations match the current filters','Try a different search or materiality filter.');
  return `<table class="data-table"><thead><tr><th>Publication</th><th>Regulation / release</th><th>Authority</th><th>Theme</th><th>Materiality</th><th>Review status</th><th>Official source</th></tr></thead><tbody>${items.map(item=>{const source=sourceFor(item),level=materiality(item);return `<tr data-detail="${esc(item.official_url)}"><td>${esc(formatDate(item.publication_date))}</td><td><strong>${esc(item.title)}</strong><small>${esc(changeLabels[item.change_type]||item.change_type||'Official Release')} · ${esc(item.source_id)}</small></td><td><strong>${esc(source.acronym)}</strong><small>${esc(source.authority)}</small></td><td>${esc(themeFor(item))}</td><td><span class="materiality ${level.toLowerCase()}">${level}</span></td><td><span class="status-pill review">● Human review</span></td><td><a href="${esc(safeUrl(item.official_url))}" target="_blank" rel="noreferrer">Open ↗</a></td></tr>`}).join('')}</tbody></table>`;
}

function regulatorData(){
  const runs=state.run?.source_runs||[];
  return runs.map(run=>{const config=sourceConfig[run.source_id]||{authority:run.label,acronym:'HK',endpoint:'#',category:'Official authority'};const publications=state.items.filter(item=>item.source_id===run.source_id);return {...run,...config,publications,latest:publications[0]?.publication_date||'—'}});
}
function regulatorRows(items){
  if(!items.length)return emptyState('No connected regulators','The latest monitor run did not report a connected source.');
  return `<table class="data-table"><thead><tr><th>Authority</th><th>Jurisdiction</th><th>Category</th><th>Cadence</th><th>Last checked</th><th>Latest publication</th><th>Endpoint health</th><th>Open alerts</th></tr></thead><tbody>${items.map(item=>`<tr><td><strong>${esc(item.authority)} (${esc(item.acronym)})</strong><small><a href="${esc(safeUrl(item.endpoint))}" target="_blank" rel="noreferrer">Official endpoint ↗</a></small></td><td>Hong Kong</td><td>${esc(item.category)}</td><td>Every 6 hours</td><td>${esc(formatRun(state.run.generated_at))}</td><td>${esc(formatDate(item.latest))}</td><td><span class="status-pill">● ${item.status==='fulfilled'?'Healthy':'Failed'}</span></td><td>${item.publications.filter(entry=>!state.dismissed.has(entry.official_url)).length}</td></tr>`).join('')}</tbody></table>`;
}

function renderCatalog(){
  const query=$('#catalog-search').value.trim().toLowerCase(),selected=$('#materiality-filter').value;
  if(state.catalog==='regulations'){
    const items=state.items.filter(item=>(selected==='All materiality'||materiality(item)===selected)&&(!query||`${item.title} ${item.source_label} ${item.source_id}`.toLowerCase().includes(query)));
    $('#catalog-content').innerHTML=regulationRows(items);$('#matching-count').textContent=`${items.length} results`;
    $$('[data-detail]').forEach(row=>row.addEventListener('click',event=>{if(event.target.closest('a'))return;openDrawer(state.items.find(item=>item.official_url===row.dataset.detail))}));
  }else{
    const items=regulatorData().filter(item=>!query||`${item.authority} ${item.acronym} ${item.category}`.toLowerCase().includes(query));
    $('#catalog-content').innerHTML=regulatorRows(items);$('#matching-count').textContent=`${items.length} results`;
  }
}

function renderSources(){
  const sources=regulatorData(),healthy=sources.filter(item=>item.status==='fulfilled').length;
  $('#connected-count').textContent=sources.length;$('#healthy-count').textContent=healthy;$('#regulator-count').textContent=sources.length;
  $('#source-table').innerHTML=sources.length?`<table class="data-table"><thead><tr><th>Source ID</th><th>Authority / endpoint</th><th>Collector</th><th>Latest run</th><th>Status</th></tr></thead><tbody>${sources.map(source=>`<tr><td><strong>${esc(source.source_id)}</strong></td><td><strong>${esc(source.authority)}</strong><small><a href="${esc(safeUrl(source.endpoint))}" target="_blank" rel="noreferrer">${esc(source.endpoint)}</a></small></td><td>Validated listing parser</td><td>${esc(formatRun(state.run.generated_at))}</td><td><span class="status-pill${source.status==='fulfilled'?'':' review'}">● ${source.status==='fulfilled'?'Active':'Failed'}</span></td></tr>`).join('')}</tbody></table>`:emptyState('No source run available','The monitor has not published a source status payload.');
}

function renderRunMeta(){
  const run=state.run;if(!run)return;
  $('#last-run').textContent=`Last run ${formatRun(run.generated_at)}`;
  $('#source-health').textContent=`${run.sources_checked||0} official sources checked`;
  $('#regulation-count').textContent=state.items.length;
  renderSources();
}
function renderAll(){renderAlerts();renderCatalog();renderRunMeta()}

function openDrawer(item){
  if(!item)return;const source=sourceFor(item),level=materiality(item),evidence=(item.evidence||[]).filter(text=>text&&String(text).trim());
  $('#drawer-content').innerHTML=`<p class="drawer-label">OFFICIAL REGULATORY RELEASE</p><span class="materiality ${level.toLowerCase()}">${level} materiality</span><h2>${esc(item.title)}</h2><p class="drawer-meta">Published ${esc(formatDate(item.publication_date))} · ${esc(source.authority)} · ${esc(item.source_id)}</p><div class="drawer-facts"><div><small>Jurisdiction</small><b>Hong Kong</b></div><div><small>Change type</small><b>${esc(changeLabels[item.change_type]||item.change_type||'Official Release')}</b></div><div><small>Regulatory theme</small><b>${esc(themeFor(item))}</b></div><div><small>Decision status</small><b>Human review required</b></div></div><section class="detail-section"><h3>AI preliminary triage</h3><p>${esc(item.summary||'No evidence-based summary was returned.')}</p></section><section class="detail-section evidence-box"><h3>Evidence retained from the official source</h3>${evidence.length?`<ul>${evidence.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:'<p>No exact excerpt was retained. Review the primary document before making a decision.</p>'}<p><b>Control:</b> this classification is not a legal or business conclusion.</p></section><a class="official-link" href="${esc(safeUrl(item.official_url))}" target="_blank" rel="noreferrer">Open official source ↗</a>`;
  $('#drawer-backdrop').classList.remove('hidden');$('#detail-drawer').classList.add('open');$('#detail-drawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){$('#drawer-backdrop').classList.add('hidden');$('#detail-drawer').classList.remove('open');$('#detail-drawer').setAttribute('aria-hidden','true')}

async function hydrate({notify=false}={}){
  const button=$('#run');button.classList.add('loading');button.disabled=true;
  try{const response=await fetch(`data/latest-run.json?ts=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const run=await response.json();if(!Array.isArray(run.items))throw new Error('Invalid monitor payload');state.run=run;state.items=run.items;renderAll();if(notify)showToast('Latest published monitor results loaded')}
  catch(error){state.run=null;state.items=[];renderAll();$('#last-run').textContent='Latest run unavailable';$('#source-health').textContent='No fallback data displayed';if(notify)showToast('Unable to load the live monitor payload')}
  finally{button.classList.remove('loading');button.disabled=false}
}

function changeView(view){state.view=view;$$('.view').forEach(section=>section.classList.toggle('hidden',section.id!==view));$$('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));$('#page-title').textContent={monitor:'Frameworks & Monitor',sources:'Source Registry',method:'Validation Controls'}[view]}

$('#sign-out').addEventListener('click',()=>{sessionStorage.removeItem(ACCESS_KEY);sessionStorage.removeItem('regwatch-demo-email');window.location.replace('index.html')});
$$('[data-view]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.view)));
$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>{state.displayMode=button.dataset.mode;$$('[data-mode]').forEach(item=>item.classList.toggle('active',item===button));renderAlerts()}));
$$('[data-catalog]').forEach(button=>button.addEventListener('click',()=>{state.catalog=button.dataset.catalog;$$('[data-catalog]').forEach(item=>item.classList.toggle('active',item===button));$('#materiality-filter').style.display=state.catalog==='regulations'?'block':'none';renderCatalog()}));
$('#alert-search').addEventListener('input',renderAlerts);$('#catalog-search').addEventListener('input',renderCatalog);$('#materiality-filter').addEventListener('change',renderCatalog);$('#run').addEventListener('click',()=>hydrate({notify:true}));$('#drawer-close').addEventListener('click',closeDrawer);$('#drawer-backdrop').addEventListener('click',closeDrawer);document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer()});
hydrate();
