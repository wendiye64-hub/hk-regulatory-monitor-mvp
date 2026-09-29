import { fetchText } from '../http.mjs';
import { clean, isoDate, isoSlashDate, uniqueRows } from '../collector-utils.mjs';

async function collectRegulatoryAnnouncements() {
  const html = await fetchText('https://www.hkex.com.hk/News/Regulatory-Announcements?sc_lang=en');
  const rows = [];
  for (const match of html.matchAll(/<div class="whats_on_tdy_text_2"><a href="([^"]+)" title="([^"]*)" target="_blank">([\s\S]*?)<\/a>/gi)) {
    const official_url = new URL(match[1].replace(/&amp;/g, '&'), 'https://www.hkex.com.hk').href;
    const title = clean(match[3] || match[2]);
    const id = official_url.match(/\/(\d{4})\/(\d{6,})news/i)?.[2];
    if (title && id) rows.push({ publication_date:`20${id.slice(0,2)}-${id.slice(2,4)}-${id.slice(4,6)}`, title, official_url, source_id:'DEDUP-00033', source_label:'HKEX Regulatory Announcements', evidence_text:title });
  }
  return uniqueRows(rows, row => `${row.publication_date}|${row.title.toLowerCase()}`).slice(0, 10);
}

async function collectListing(listing, source_id, source_label) {
  const html = await fetchText(listing);
  const rows = [];
  for (const match of html.matchAll(/<div class="whats_on_tdy_row">([\s\S]*?)<div class="whats_on_tdy_btn_set">/gi)) {
    const row = match[1];
    const date = row.match(/whats_on_tdy_ball_number"><div>(\d{1,2})<\/div><\/div><div>([A-Za-z]{3}\s+\d{4})<\/div>/i);
    const release = row.match(/whats_on_tdy_text_2"><a href="([^"]+)" title="([^"]*)" target="_blank">([\s\S]*?)<\/a>/i);
    if (!date || !release) continue;
    const official_url = new URL(release[1].replace(/&amp;/g, '&'), 'https://www.hkex.com.hk').href;
    const title = clean(release[3] || release[2]);
    if (title) rows.push({ publication_date:isoDate(`${date[1]} ${date[2]}`), title, official_url, source_id, source_label, evidence_text:title });
  }
  return uniqueRows(rows, row => `${row.publication_date}|${row.title.toLowerCase()}`).slice(0, 10);
}

async function collectNotices(listing, source_id, source_label) {
  const html = await fetchText(listing);
  const rows = [];
  for (const match of html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1]);
    if (cells.length < 3) continue;
    const publication_date = isoSlashDate(clean(cells[0]));
    const reference = clean(cells[1]);
    const release = cells[2].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publication_date) || !release) continue;
    const official_url = new URL(release[1].replace(/&amp;/g, '&'), 'https://www.hkex.com.hk').href;
    const title = clean(release[2]);
    if (title) rows.push({ publication_date, title, official_url, reference, source_id, source_label, evidence_text:title });
  }
  return uniqueRows(rows).slice(0, 10);
}

export function createHkexSources() {
  return [
    { source_id:'DEDUP-00033', label:'HKEX Regulatory Announcements', collect:collectRegulatoryAnnouncements },
    { source_id:'HKEX-CORP-NEWS', label:'HKEX Corporate News Releases', collect:() => collectListing('https://www.hkex.com.hk/News/News-Release?Category=Corporate&sc_lang=en', 'HKEX-CORP-NEWS', 'HKEX Corporate News Releases') },
    { source_id:'HKEX-MARKET-COMMS', label:'HKEX Market Communications', collect:() => collectListing('https://www.hkex.com.hk/News/Market-Communications?sc_lang=en', 'HKEX-MARKET-COMMS', 'HKEX Market Communications') },
    { source_id:'HKEX-MARKET-CONSULT', label:'HKEX Market Consultations', collect:() => collectListing('https://www.hkex.com.hk/News/Market-Consultations?sc_lang=en', 'HKEX-MARKET-CONSULT', 'HKEX Market Consultations') },
    { source_id:'HKEX-PARTICIPANT-CIRC', label:'HKEX Participant and Members Circulars', collect:() => collectListing('https://www.hkex.com.hk/Services/Circulars-and-Notices/Participant-and-Members-Circulars?sc_lang=en', 'HKEX-PARTICIPANT-CIRC', 'HKEX Participant and Members Circulars') },
    { source_id:'HKEX-MARKET-DATA-NOTICES', label:'HKEX Market Data Client Notices', collect:() => collectNotices('https://www.hkex.com.hk/eng/prod/dataprod/2026notices.htm', 'HKEX-MARKET-DATA-NOTICES', 'HKEX Market Data Client Notices') },
    { source_id:'HKEX-HOSTING-NOTICES', label:'HKEX Hosting Subscriber Notices', collect:() => collectNotices('https://www.hkex.com.hk/Services/Connectivity/Hosting-Services/Subscriber-Notices-and-Guidance-Note?sc_lang=en', 'HKEX-HOSTING-NOTICES', 'HKEX Hosting Subscriber Notices') }
  ];
}
