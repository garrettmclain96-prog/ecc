'use strict';

const fs = require('fs');
const path = require('path');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));
}

function count(rel, kind) {
  return fs.readdirSync(path.join(process.cwd(), rel), { withFileTypes: true })
    .filter(entry => kind === 'dir' ? entry.isDirectory() : entry.isFile() && entry.name.endsWith(kind))
    .length;
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const pkg = readJson('package.json');
  const profiles = readJson('manifests/install-profiles.json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    app: 'McLain Systems OS',
    repository: pkg.name,
    version: pkg.version,
    node: process.version,
    profileAvailable: Boolean(profiles.profiles && profiles.profiles.mclain),
    counts: {
      skills: count('skills', 'dir'),
      commands: count('commands', '.md')
    },
    commands: ['doctor','catalog-check','command-registry-check','skills-health','harness-audit','platform-audit']
  });
};
