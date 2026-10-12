import { load } from 'cheerio';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fetchDocument } from './http.mjs';

export const normalizeText = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
export const bodyText = value => normalizeText(value).split(/\n{2,}/).map(paragraph => paragraph.replace(/\n/g, ' ')).join('\n\n');

export function usableText(text) {
  if (text.length < 80 || /%PDF-|<!doctype|<html/i.test(text)) return false;
  const corrupt = (text.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/g) || []).length;
  const readable = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  return corrupt / text.length < 0.005 && readable / text.length > 0.4;
}

export function extractHtml(html) {
  const $ = load(html);
  $('script,style,nav,footer,header,aside,noscript,form,svg,[role="navigation"],.breadcrumb,.breadcrumbs,.cookie-banner,.cookie-consent,.share-tools,.right-content,.latest-press-release-list,.pr-revision,.share,.skip-to-content').remove();
  // Prefer publisher body containers before considering the entire page.
  const selectors = ['.template-content-area', '.press-release', '.pressRelease', '#press-release', '.press-release-content', '.content-detail', '.article-content', '.news-detail', 'article', 'main', '#main-content', '#content', '.content', 'body'];
  for (const selector of selectors) {
    const candidates = $(selector).toArray().map(node => {
      const clone = $(node).clone();
      if (!clone.find('p,li,td').toArray().some(element => $(element).text().trim().length >= 40)) return '';
      clone.find('br').replaceWith('\n');
      clone.find('p,li,h1,h2,h3,h4,tr,div').append('\n\n');
      return normalizeText(clone.text());
    }).filter(text => usableText(text) && !(text.length < 1000 && /enable javascript|javascript is (?:disabled|required)|you need to enable/i.test(text))).sort((a, b) => b.length - a.length);
    if (candidates.length) return candidates[0];
  }
  throw new Error('HTML contains no usable body text (possibly a JavaScript-only page)');
}

export async function extractPdf(bytes) {
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const timer = setTimeout(() => { void task.destroy(); }, 15000);
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 200) throw new Error('PDF exceeds 200 page extraction limit');
    const pages = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      let lineY; let previousLineY; let text = '';
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const y = item.transform[5];
        if (lineY === undefined) {
          if (previousLineY !== undefined && Math.abs(previousLineY - y) > 20) text += '\n';
          lineY = y;
        }
        text += item.str + (item.hasEOL ? '\n' : ' ');
        if (item.hasEOL) { previousLineY = lineY; lineY = undefined; }
      }
      pages.push(text);
      page.cleanup();
    }
    const text = normalizeText(pages.join('\n\n'));
    if (!usableText(text)) throw new Error('PDF has no readable text layer; image-only or corrupt document');
    return text;
  } finally { clearTimeout(timer); await task.destroy(); }
}

export async function extractOfficialText(url, loader = fetchDocument) {
  try {
    const document = await loader(url);
    const isPdf = document.bytes.subarray(0, 5).toString() === '%PDF-';
    if (!isPdf && /application\/pdf/i.test(document.contentType)) throw new Error('Invalid PDF response');
    const text = bodyText(isPdf ? await extractPdf(document.bytes) : extractHtml(document.bytes.toString('utf8')));
    return { text, source_text_chars: text.length, text_extraction: 'success', source_format: isPdf ? 'pdf' : 'html', source_text_url: document.url || url };
  } catch (error) {
    return { text: '', source_text_chars: 0, text_extraction: 'failed', text_extraction_error: String(error.message || error) };
  }
}
