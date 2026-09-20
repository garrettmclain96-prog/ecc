---
name: mclain-project-command-center
description: Maintain a single execution view across many active projects by reconciling current state, evidence, blockers, assets, next actions, automations, and monetization opportunities. Use when the user asks where a project stands, what to do next, what is unfinished, or how multiple workstreams connect.
metadata:
  origin: McLain Systems
---

# McLain Project Command Center

Operate projects from evidence, not memory fragments.

## Canonical Project State

```text
PROJECT
Objective:
Current state:
Latest proof:
Primary source of truth:
Assets:
Blockers:
Next 3 actions:
Automation loop:
Distribution:
Monetization:
Defensibility:
Risks:
Last verified:
```

## Rules

1. Reuse known context before asking the operator to repeat information.
2. Separate verified state from assumptions.
3. Treat a live deployment, repository commit, document, transaction, or returned tool result as stronger evidence than a prior narrative.
4. Do not report "done" unless acceptance evidence exists.
5. When the same pattern appears across projects, extract a reusable asset or automation.
6. Preserve ownership: prefer repositories, domains, exported data, documented schemas, and portable workflows.
7. Keep the next-action queue short. Three executable moves beat twenty vague tasks.

## Status Logic

- **SHIP** — working and acceptance proof exists.
- **VERIFY** — implementation exists but proof is incomplete.
- **BUILD** — requirements are sufficiently clear and implementation is missing.
- **UNBLOCK** — progress is stopped by a concrete dependency.
- **PARK** — intentionally inactive; no false urgency.

## Cross-Project Leverage Pass

Look for shared auth, reusable mobile shells, common billing, common research pipelines, shared notification layers, common project registries, shared deployment patterns, duplicated documentation, and duplicated data models. Promote repeated solutions into a platform capability.

## Output Contract

Return current state, latest proof, blockers, next three exact actions, reusable assets discovered, leverage/automation opportunity, and the acceptance test for the next milestone.
