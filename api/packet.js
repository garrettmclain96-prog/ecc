'use strict';

function packet(input) {
  const workflow = String(input.workflow || 'build');
  const project = String(input.project || 'Untitled Project').trim();
  const goal = String(input.goal || '').trim();
  const context = String(input.context || '').trim();
  const common = [
    `## Project\n${project}`,
    `## Goal\n${goal || 'Define the desired operator outcome.'}`,
    `## Context\n${context || 'No additional context provided.'}`
  ];
  const templates = {
    build: [
      '# McLain Systems Build Packet','',...common,'',
      '## System','- Input:','- Engine:','- Output:','- Feedback:','- Automation:','- Ownership:','',
      '## Durable assets','- [ ] Source of truth','- [ ] Reusable operating artifact','- [ ] Acceptance proof','',
      '## Leverage pass','- Recurring value:','- Distribution:','- Monetization:','- Defensibility:','',
      '## Next exact action','-'
    ],
    control: [
      '# McLain Project Control Packet','',...common,'',
      '## Current state','- Status: BUILD','- Latest proof:','- Primary source of truth:','',
      '## Blockers','-','','## Next 3 actions','1.','2.','3.','',
      '## Reusable asset / automation opportunity','-','','## Acceptance criterion','-'
    ],
    research: [
      '# McLain Evidence Research Packet','',...common,'',
      '## Proof ladder','1. Primary source:','2. Independent corroboration:','3. Chain of custody / provenance:','4. Contradictions to resolve:','',
      '## Findings','- Fact:','- Inference:','- Unknown:','','## Next evidence request','-'
    ]
  };
  return (templates[workflow] || templates.build).join('\n');
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const raw = JSON.stringify(req.body || {});
  if (Buffer.byteLength(raw) > 65536) return res.status(413).json({ error: 'Body too large' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ markdown: packet(req.body || {}) });
};
