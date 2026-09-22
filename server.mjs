import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '../global-regulatory-monitoring-platform');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
let running = false;
function run(command, args) { return new Promise((resolve, reject) => { const process = spawn(command, args, { cwd: backend }); let output = ''; process.stdout.on('data', (data) => { output += data; }); process.stderr.on('data', (data) => { output += data; }); process.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output || `exit ${code}`))); }); }

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/run') {
    if (running) { res.writeHead(409, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'already_running' })); }
    running = true;
    try {
      await run('node', ['mvp-hkex-monitor/run.mjs']);
      await run('node', ['mvp-hkex-monitor/run-hkma-first-scan.mjs']);
      await run('node', ['mvp-hkex-monitor/sync-hkma-observation.mjs']);
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'completed' }));
    } catch (error) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'failed', error: error.message })); }
    finally { running = false; }
    return;
  }
  const requestPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const file = path.resolve(here, 'dist', `.${requestPath}`);
  if (!file.startsWith(path.join(here, 'dist'))) { res.writeHead(403); return res.end(); }
  try { await access(file); res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); createReadStream(file).pipe(res); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('RegWatch HK backend preview: http://127.0.0.1:4173'));
