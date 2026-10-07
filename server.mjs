import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
let running = false;
let lastRun = null;
function json(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(payload)); }
function run(command, args) { return new Promise((resolve, reject) => { const child = spawn(command, args, { cwd: here, env: process.env }); let output = ''; child.stdout.on('data', (data) => { output += data; }); child.stderr.on('data', (data) => { output += data; }); child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output || `exit ${code}`))); }); }

const port = Number(process.env.PORT || 4173);

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/run/status') {
    return json(res, 200, { status: running ? 'running' : 'idle', last_run: lastRun });
  }
  if (req.method === 'POST' && req.url === '/api/run') {
    if (running) return json(res, 409, { status: 'already_running' });
    running = true;
    try {
      const output = await run(process.execPath, ['scripts/monitor.mjs']);
      const payload = JSON.parse(await readFile(path.join(here, 'dist/data/latest-run.json'), 'utf8'));
      lastRun = { generated_at: payload.generated_at, sources_checked: payload.sources_checked, items: payload.items?.length || 0 };
      return json(res, 200, { status: 'completed', ...lastRun, output: output.trim() });
    } catch (error) { return json(res, 500, { status: 'failed', error: error.message }); }
    finally { running = false; }
  }
  const requestPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const file = path.resolve(here, 'dist', `.${requestPath}`);
  if (!file.startsWith(path.join(here, 'dist'))) { res.writeHead(403); return res.end(); }
  try { await access(file); res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); createReadStream(file).pipe(res); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`RegWatch HK backend preview: http://127.0.0.1:${port}`));
