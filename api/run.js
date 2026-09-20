'use strict';

const { spawn } = require('child_process');

const ROOT = process.cwd();
const MAX_OUTPUT = 1024 * 1024;
const RUNNERS = {
  'catalog-check': ['scripts/ci/catalog.js', '--text'],
  'command-registry-check': ['scripts/ci/generate-command-registry.js', '--check'],
  'skills-health': ['scripts/skills-health.js'],
  'harness-audit': ['scripts/harness-audit.js'],
  'platform-audit': ['scripts/platform-audit.js'],
  'doctor': ['scripts/doctor.js']
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = String(req.body?.command || '');
  const args = RUNNERS[key];
  if (!args) return res.status(400).json({ ok: false, error: 'Unknown command' });

  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', NO_COLOR: '1' }
    });
    let stdout = '', stderr = '', size = 0, finished = false;

    const collect = target => chunk => {
      if (finished) return;
      size += chunk.length;
      if (size > MAX_OUTPUT) {
        finished = true;
        child.kill('SIGKILL');
        return resolve({ ok:false, status:413, error:'Output exceeded 1 MiB' });
      }
      if (target === 'out') stdout += chunk.toString();
      else stderr += chunk.toString();
    };
    child.stdout.on('data', collect('out'));
    child.stderr.on('data', collect('err'));

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill('SIGKILL');
      resolve({ ok:false, status:504, error:'Command timed out', stdout, stderr });
    }, 50000);

    child.on('close', (exitCode, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        ok: exitCode === 0,
        status: exitCode === 0 ? 200 : 500,
        command:key, exitCode, signal, stdout, stderr
      });
    });
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(result.status || 500).json(result);
};
