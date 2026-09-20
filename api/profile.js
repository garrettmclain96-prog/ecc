'use strict';

const fs = require('fs');
const path = require('path');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const profiles = readJson('manifests/install-profiles.json');
  const modules = readJson('manifests/install-modules.json');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    profile: profiles.profiles.mclain || null,
    module: modules.modules.find(item => item.id === 'mclain-systems') || null
  });
};
