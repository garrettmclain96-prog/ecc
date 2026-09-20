#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY = 64 * 1024;
const MAX_OUTPUT = 1024 * 1024;

const RUNNERS = {
  'catalog-check': ['scripts/ci/catalog.js', '--text'],
  'command-registry-check': ['scripts/ci/generate-command-registry.js', '--check'],
  'skills-health': ['scripts/skills-health.js'],
  'harness-audit': ['scripts/harness-audit.js'],
  'platform-audit': ['scripts/mclain-hosted-audit.js'],
  'doctor': ['scripts/doctor.js']
};

function sendJson(res, code, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
    'x-content-type-options': 'nosniff'
  });
  res.end(payload);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function countEntries(rel, kind) {
  return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })
    .filter(entry => kind === 'dir' ? entry.isDirectory() : entry.isFile() && entry.name.endsWith(kind))
    .length;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function runAllowed(key) {
  return new Promise(resolve => {
    const args = RUNNERS[key];
    if (!args) return resolve({ ok: false, httpCode: 400, error: 'Unknown command' });

    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', NO_COLOR: '1' }
    });

    let stdout = '';
    let stderr = '';
    let size = 0;
    let done = false;

    const collect = target => chunk => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_OUTPUT) {
        done = true;
        child.kill('SIGKILL');
        return resolve({ ok: false, httpCode: 413, error: 'Output exceeded 1 MiB' });
      }
      if (target === 'stdout') stdout += chunk.toString();
      else stderr += chunk.toString();
    };

    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));

    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill('SIGKILL');
      resolve({ ok: false, httpCode: 504, error: 'Command timed out after 90 seconds', stdout, stderr });
    }, 90000);

    child.on('close', (exitCode, signal) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      resolve({
        ok: exitCode === 0,
        httpCode: exitCode === 0 ? 200 : 500,
        command: key,
        exitCode,
        signal,
        stdout,
        stderr
      });
    });
  });
}

function makePacket(input) {
  const workflow = String(input.workflow || 'build');
  const project = String(input.project || 'Untitled Project').trim();
  const goal = String(input.goal || '').trim();
  const context = String(input.context || '').trim();

  const common = [
    `## Project\n${project}`,
    `## Goal\n${goal || 'Define the desired operator outcome.'}`,
    `## Context\n${context || 'No additional context provided.'}`
  ];

  const packets = {
    build: [
      '# McLain Systems Build Packet', '',
      ...common, '',
      '## System',
      '- Input:',
      '- Engine:',
      '- Output:',
      '- Feedback:',
      '- Automation:',
      '- Ownership:', '',
      '## Durable assets',
      '- [ ] Source of truth',
      '- [ ] Reusable operating artifact',
      '- [ ] Acceptance proof', '',
      '## Leverage pass',
      '- Recurring value:',
      '- Distribution:',
      '- Monetization:',
      '- Defensibility:', '',
      '## Next exact action',
      '-'
    ],
    control: [
      '# McLain Project Control Packet', '',
      ...common, '',
      '## Current state',
      '- Status: BUILD',
      '- Latest proof:',
      '- Primary source of truth:', '',
      '## Blockers',
      '-', '',
      '## Next 3 actions',
      '1.',
      '2.',
      '3.', '',
      '## Reusable asset / automation opportunity',
      '-', '',
      '## Acceptance test',
      '-'
    ],
    research: [
      '# McLain Evidence Research Packet', '',
      ...common, '',
      '## Proof ladder',
      '1. Primary source:',
      '2. Independent corroboration:',
      '3. Chain of custody / provenance:',
      '4. Contradictions to resolve:', '',
      '## Findings',
      '- Fact:',
      '- Inference:',
      '- Unknown:', '',
      '## Next evidence request',
      '-'
    ]
  };

  return (packets[workflow] || packets.build).join('\n');
}

function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = path.resolve(PUBLIC, rel);
  if (!target.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const type = {
      '.html': 'text/html; charset=utf-8',
      '.webmanifest': 'application/manifest+json; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.svg': 'image/svg+xml'
    }[path.extname(target)] || 'application/octet-stream';

    res.writeHead(200, {
      'content-type': type,
      'cache-control': pathname === '/' ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const pkg = readJson('package.json');
      const profiles = readJson('manifests/install-profiles.json');
      return sendJson(res, 200, {
        app: 'McLain Systems OS',
        repository: pkg.name,
        version: pkg.version,
        node: process.version,
        uptimeSeconds: Math.round(process.uptime()),
        profileAvailable: Boolean(profiles.profiles && profiles.profiles.mclain),
        counts: {
          skills: countEntries('skills', 'dir'),
          commands: countEntries('commands', '.md')
        },
        commands: Object.keys(RUNNERS)
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/profile') {
      const profiles = readJson('manifests/install-profiles.json');
      const modules = readJson('manifests/install-modules.json');
      return sendJson(res, 200, {
        profile: profiles.profiles.mclain || null,
        module: modules.modules.find(item => item.id === 'mclain-systems') || null
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/run') {
      const input = await parseBody(req);
      const result = await runAllowed(String(input.command || ''));
      return sendJson(res, result.httpCode, result);
    }

    if (req.method === 'POST' && url.pathname === '/api/packet') {
      const input = await parseBody(req);
      return sendJson(res, 200, { markdown: makePacket(input) });
    }

    if (req.method === 'GET') return serveStatic(res, url.pathname);

    res.writeHead(405, { allow: 'GET, POST' });
    res.end('Method not allowed');
  } catch (error) {
    const code = error.message === 'BODY_TOO_LARGE' ? 413 : error.message === 'INVALID_JSON' ? 400 : 500;
    sendJson(res, code, { ok: false, error: error.message || 'Internal error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`McLain Systems OS running on http://0.0.0.0:${PORT}`);
});
