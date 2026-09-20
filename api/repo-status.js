'use strict';

function parseRepoRef(owner, repo) {
  const safe = /^[A-Za-z0-9_.-]{1,100}$/;
  if (!safe.test(String(owner || '')) || !safe.test(String(repo || ''))) return null;
  return { owner: String(owner), repo: String(repo).replace(/\.git$/i, '') };
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const ref = parseRepoRef(req.query?.owner, req.query?.repo);
  if (!ref) return res.status(400).json({ error: 'Invalid repository reference' });

  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'mclain-systems-os' },
      redirect: 'error', signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ error: response.status === 404 ? 'Repository not found' : 'GitHub status unavailable' });
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({
      repository: data.full_name,
      branch: data.default_branch,
      openIssues: data.open_issues_count,
      lastPush: data.pushed_at ? new Date(data.pushed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'unknown',
      visibility: data.private ? 'private' : 'public',
      archived: Boolean(data.archived)
    });
  } catch {
    return res.status(502).json({ error: 'GitHub status unavailable' });
  }
}

handler.parseRepoRef = parseRepoRef;
module.exports = handler;
