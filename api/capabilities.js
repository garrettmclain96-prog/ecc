'use strict';

const CAPABILITIES = [
  {
    id: 'aurora',
    name: 'Aurora Core',
    role: 'Physical-world intelligence',
    status: 'active',
    repo: 'garrettmclain96-prog/Aurora-core-beta',
    url: 'https://aurora-core-beta.vercel.app',
    purpose: 'Turns a real-world problem into a safe diagnostic case, guided tests, probable cause, verified fix, and remembered equipment.',
    routes: ['repair', 'equipment-memory', 'vision', 'hands-free'],
    useFor: ['RV and appliance diagnostics', 'resort maintenance', 'equipment history', 'TurnBot/device diagnostics']
  },
  {
    id: 'ecc',
    name: 'ECC',
    role: 'Agent engineering runtime',
    status: 'active',
    repo: 'garrettmclain96-prog/ecc',
    purpose: 'Plans, verifies, reviews, remembers, and improves agent-assisted engineering work.',
    routes: ['build', 'verify', 'review', 'skills']
  },
  {
    id: 'agent-skills',
    name: 'Agent Skills',
    role: 'Reusable capability library',
    status: 'source',
    repo: 'garrettmclain96-prog/agent-skills',
    purpose: 'Supplies reviewed reusable skills and workflow patterns for coding agents.'
  },
  {
    id: 'freellmapi',
    name: 'FreeLLMAPI',
    role: 'Model routing',
    status: 'source',
    repo: 'garrettmclain96-prog/freellmapi',
    purpose: 'Provides an OpenAI-compatible routing layer across multiple model providers and fallback paths.'
  },
  {
    id: 'needle',
    name: 'Needle',
    role: 'On-device tool routing',
    status: 'source',
    repo: 'garrettmclain96-prog/needle',
    purpose: 'Small local model for structured extraction, embeddings, and reliable tool selection on constrained devices.'
  },
  {
    id: 'agentic-inbox',
    name: 'Agentic Inbox',
    role: 'Email operations',
    status: 'source',
    repo: 'garrettmclain96-prog/agentic-inbox',
    purpose: 'Pattern library for agent-assisted inbox search, drafting, routing, and human-approved sending.'
  },
  {
    id: 'flowsint',
    name: 'Flowsint',
    role: 'Evidence graph',
    status: 'source',
    repo: 'garrettmclain96-prog/flowsint',
    purpose: 'Graph-based investigation patterns for connecting people, entities, records, sources, and evidence.'
  },
  {
    id: 'librechat',
    name: 'LibreChat',
    role: 'Agent workspace UX',
    status: 'source',
    repo: 'garrettmclain96-prog/librechat',
    purpose: 'Reference implementation for multi-agent chat, MCP, skills, tool activity, approvals, and workspaces.'
  },
  {
    id: 'covert-coder',
    name: 'Covert Coder',
    role: 'Governed coding workbench',
    status: 'source',
    repo: 'garrettmclain96-prog/covert-coder',
    purpose: 'Local-first execution, workspace, terminal, verification, memory, and approval-bound coding patterns.'
  },
  {
    id: 'hyperframes',
    name: 'HyperFrames',
    role: 'Media generation',
    status: 'source',
    repo: 'garrettmclain96-prog/hyperframes',
    purpose: 'Agent-oriented HTML-to-video and reusable media production workflows.'
  }
];

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({
    system: 'McLain Systems OS',
    architecture: {
      controlPlane: 'McLain Systems OS',
      physicalIntelligence: 'Aurora Core',
      engineeringRuntime: 'ECC'
    },
    capabilities: CAPABILITIES
  });
};
