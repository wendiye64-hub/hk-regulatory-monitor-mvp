export function clean(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&rsquo;/gi, '’')
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isoDate(value) {
  const match = String(value).match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return value;
  const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  return `${match[3]}-${months[match[2]]}-${match[1].padStart(2, '0')}`;
}

export function isoSlashDate(value) {
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : value;
}

export function uniqueRows(rows, keyFor = row => row.official_url) {
  return [...new Map(rows.map(row => [keyFor(row), row])).values()];
}
