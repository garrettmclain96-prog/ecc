'use strict';

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    schema: 'mclain.provider.v1',
    id: 'ecc',
    name: 'ECC',
    role: 'execution-and-diagnostics',
    version: '2.2.2',
    repository: 'https://github.com/garrettmclain96-prog/ecc',
    capabilities: [
      'status',
      'profile',
      'capabilities',
      'repo-status',
      'safe-command-runner',
      'packet-generation',
      'activepieces-frontdesk-issue'
    ],
    routes: {
      status: '/api/status',
      profile: '/api/profile',
      capabilities: '/api/capabilities',
      repoStatus: '/api/repo-status',
      run: '/api/run',
      packet: '/api/packet',
      frontdeskIssue: '/api/activepieces-frontdesk-issue'
    },
    boundary: 'allowlisted-api',
    owner: 'mclain-os'
  });
};
