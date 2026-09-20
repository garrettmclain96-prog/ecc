#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    return null;
  }
}

function countDir(rel, predicate) {
  try {
    return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).filter(predicate).length;
  } catch {
    return 0;
  }
}

const checks = [];
function check(id, ok, summary) {
  checks.push({ id, ok: Boolean(ok), summary });
}

const pkg = readJson('package.json') || {};
const profiles = readJson('manifests/install-profiles.json') || {};
const modules = readJson('manifests/install-modules.json') || {};
const registry = readJson('docs/COMMAND-REGISTRY.json') || {};

const mclainProfile = profiles.profiles && profiles.profiles.mclain;
const fullProfile = profiles.profiles && profiles.profiles.full;
const mclainModule = Array.isArray(modules.modules)
  ? modules.modules.find(item => item.id === 'mclain-systems')
  : null;

const skills = countDir('skills', entry => entry.isDirectory() && exists(path.join('skills', entry.name, 'SKILL.md')));
const commands = countDir('commands', entry => entry.isFile() && entry.name.endsWith('.md'));
const agents = countDir('agents', entry => entry.isFile() && entry.name.endsWith('.md'));

check('runtime-node', /^v(2[024]|[3-9]\d)\./.test(process.version), 'Node runtime is supported');
check('vercel-config', exists('vercel.json'), 'vercel.json is bundled');
check('api-runner', exists('api/run.js'), 'serverless command runner is bundled');
check('api-status', exists('api/status.js'), 'status endpoint is bundled');
check('api-profile', exists('api/profile.js'), 'profile endpoint is bundled');
check('pwa-index', exists('mclain-app/public/index.html'), 'PWA index is bundled');
check('pwa-manifest', exists('mclain-app/public/manifest.webmanifest'), 'PWA manifest is bundled');
check('pwa-service-worker', exists('mclain-app/public/sw.js'), 'service worker is bundled');

check('mclain-profile', Boolean(mclainProfile), 'McLain install profile exists');
check(
  'mclain-profile-module',
  Boolean(mclainProfile && Array.isArray(mclainProfile.modules) && mclainProfile.modules.includes('mclain-systems')),
  'McLain profile includes mclain-systems'
);
check('mclain-module', Boolean(mclainModule), 'mclain-systems module exists');
check(
  'full-profile-module',
  Boolean(fullProfile && Array.isArray(fullProfile.modules) && fullProfile.modules.includes('mclain-systems')),
  'full profile includes mclain-systems'
);

if (mclainModule && Array.isArray(mclainModule.paths)) {
  for (const rel of mclainModule.paths) {
    check('module-path:' + rel, exists(rel), rel + ' is bundled');
  }
}

check(
  'command-registry',
  Number(registry.totalCommands) === commands,
  'command registry matches command directory (' + commands + ')'
);
check('catalog-agents', agents > 0, 'agents available: ' + agents);
check('catalog-skills', skills > 0, 'skills available: ' + skills);
check('catalog-commands', commands > 0, 'commands available: ' + commands);
check(
  'app-script',
  pkg.scripts && pkg.scripts['mclain:app'] === 'node mclain-app/server.js',
  'local McLain app script is registered'
);

const failed = checks.filter(item => !item.ok);
const deployment = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || null;
const commit = process.env.VERCEL_GIT_COMMIT_SHA || null;

const lines = [
  'McLain Hosted Audit: ' + (failed.length === 0 ? 'ready' : 'attention required'),
  'Generated: ' + new Date().toISOString(),
  'Runtime: ' + process.version,
  'Environment: ' + (process.env.VERCEL ? 'Vercel' : 'Node'),
  deployment ? 'Deployment: ' + deployment : null,
  commit ? 'Commit: ' + commit : null,
  '',
  'Catalog:',
  '  agents: ' + agents,
  '  skills: ' + skills,
  '  commands: ' + commands,
  '',
  'Checks:',
  ...checks.map(item => '  ' + (item.ok ? 'PASS' : 'FAIL') + ' ' + item.id + ': ' + item.summary),
  '',
  'Result:',
  failed.length === 0
    ? '  Hosted McLain/ECC control plane is internally consistent.'
    : '  ' + failed.length + ' hosted readiness check(s) need attention.'
].filter(line => line !== null);

process.stdout.write(lines.join('\n') + '\n');
if (failed.length > 0) process.exitCode = 2;
