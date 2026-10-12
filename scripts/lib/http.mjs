const headers = {
  accept: 'text/html,application/xhtml+xml,application/pdf,application/json',
  'user-agent': 'RegWatch-HK/2.0 (official-public-source monitor)'
};

async function request(url, options = {}) {
  const { attempts = 2, timeoutMs = Number(process.env.COLLECTOR_TIMEOUT_MS || 20000), ...fetchOptions } = options;
  let lastError;
  for (let attempt = 1; attempt <= Number(attempts); attempt += 1) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: { ...headers, ...(fetchOptions.headers || {}) },
        signal: AbortSignal.timeout(Number(timeoutMs))
      });
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < Number(attempts)) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError;
}

export async function fetchText(url, options) {
  return (await request(url, options)).text();
}

export async function fetchJson(url, options) {
  return (await request(url, options)).json();
}

export async function fetchDocument(url, options = {}) {
  const response = await request(url, { timeoutMs: 10000, attempts: 1, ...options });
  const maximum = 12 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > maximum) throw new Error('Document exceeds 12 MB extraction limit');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximum) throw new Error('Document exceeds 12 MB extraction limit');
    chunks.push(chunk);
  }
  return { bytes: Buffer.concat(chunks), contentType: response.headers.get('content-type') || '', url: response.url };
}

export async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Number(limit), items.length) }, worker));
  return output;
}
