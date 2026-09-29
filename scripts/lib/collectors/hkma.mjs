import { fetchJson, fetchText } from '../http.mjs';
import { clean, isoDate, uniqueRows } from '../collector-utils.mjs';

const BRDR_URL = 'https://brdr.hkma.gov.hk/restapi/doc-search';
const typeGroups = [
  { source_id:'HKMA-CIRCULARS', label:'HKMA Circulars', codes:['CIR'] },
  { source_id:'HKMA-GUIDELINES', label:'HKMA Guidelines', codes:['GLI','IGL'] },
  { source_id:'HKMA-SPM', label:'HKMA Supervisory Policy Manual', codes:['SPM','SPM-NGL','SPM-SGL'] },
  { source_id:'HKMA-CONSULTATIONS', label:'HKMA Consultation Papers', codes:['CPR'] },
  { source_id:'HKMA-GTA', label:'HKMA Guide to Authorization', codes:['GTA'] },
  { source_id:'HKMA-CODES', label:'HKMA Codes of Practice', codes:['COP'] }
];

async function collectPressReleases() {
  const html = await fetchText('https://www.hkma.gov.hk/eng/news-and-media/press-releases/', { timeoutMs:15000, attempts:1 });
  const rows = [...html.matchAll(/<ul>\s*<li>([^<]+)<\/li>\s*<li><a href="([^"]+)" title="([^"]+)"/gi)].slice(0, 12).map(match => ({
    publication_date: isoDate(match[1].trim()),
    title: clean(match[3]),
    official_url: new URL(match[2], 'https://www.hkma.gov.hk').href,
    source_id: 'DEDUP-00031',
    source_label: 'HKMA Press Releases',
    evidence_text: clean(match[3])
  }));
  if (!rows.length) throw new Error('HKMA Press Releases returned no parseable records');
  return rows;
}

function createBrdrBatch() {
  let cached;
  return async function collectBrdr() {
    if (!cached) cached = fetchJson(BRDR_URL, {
      method: 'POST',
      headers: { 'content-type':'application/json; charset=utf-8' },
      body: JSON.stringify({
        langCode:'eng', pageNumber:1, pageSize:100, sortBy:'ISSUE_DATE_DESCENDING',
        docSrchCriteriaDtoList:[
          { fieldCode:'docType', valueList:typeGroups.flatMap(group => group.codes) },
          { fieldCode:'version', valueList:['CURRENT'] },
          { fieldCode:'language', valueList:['eng'] },
          { fieldCode:'issueDateGrp', valueList:['THIS_YEAR'] }
        ]
      })
    }).then(payload => payload?.resultList || []);
    return cached;
  };
}

export function createHkmaSources() {
  const collectBrdr = createBrdrBatch();
  return [
    { source_id:'DEDUP-00031', label:'HKMA Press Releases', collect:collectPressReleases },
    ...typeGroups.map(group => ({
      source_id:group.source_id,
      label:group.label,
      collect:async () => {
        const records = await collectBrdr();
        const rows = records.filter(record => group.codes.includes(record.docTypeCode)).map(record => {
          const title = clean(record.docLongTitle);
          return {
            publication_date: isoDate(record.issueDateStr),
            title,
            official_url: `https://brdr.hkma.gov.hk/eng/doc-ldg/docId/${record.docId}`,
            reference: record.spmCode || record.docId,
            document_type: record.docTypeDesc,
            source_id: group.source_id,
            source_label: group.label,
            evidence_text: title
          };
        });
        return uniqueRows(rows, row => `${row.publication_date}|${row.title.toLowerCase()}`).slice(0, 12);
      }
    }))
  ];
}
