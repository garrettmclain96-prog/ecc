# McLain Systems platform engines

This document defines how upstream projects are used inside McLain Systems without turning every fork into another standalone product.

## Core ownership

- **McLain Systems OS** — control plane, portfolio state, project routing, operator UI.
- **ECC** — engineering agent runtime: plan, implement, verify, review.
- **Aurora Core** — physical-world intelligence: diagnosis, equipment history, guided tests, verified outcomes.
- **Activepieces** — automation/integration engine.
- **Mem0** — shared persistent memory spine.
- **Electric** — local-first Postgres synchronization layer.

## Activepieces boundary

Use Activepieces for event-driven automation and cross-system workflows, not as a replacement user interface.

Initial targets:
1. OpsPost / Beachside Crew front-desk workflows.
2. Quo inbound-event routing.
3. Email and webhook automations.
4. Human approval steps before consequential actions.
5. Scheduled project/report workflows.

All credentials remain server-side. Human approval must be preserved for sends, destructive actions, account changes, payments, and high-impact external actions.

Upstream: `activepieces/activepieces`

## Mem0 boundary

Use Mem0 as the memory service behind product-specific APIs.

Canonical memory scopes:
- user
- organization
- project
- asset
- equipment
- case
- decision
- evidence

Aurora remains responsible for the semantics of repair/equipment memory. ECC remains responsible for engineering memory. Mem0 is storage/retrieval infrastructure, not the authority deciding what is true.

Upstream: `mem0ai/mem0`

## Electric boundary

Use Electric to make Postgres-backed product state available to responsive local-first clients.

First target: McLain Systems OS.
Second target: OpsPost field/staff experiences.

Do not replace authorization with synchronization. Server-side authorization and tenant/site boundaries remain authoritative.

Upstream: `electric-sql/electric`

## Integration order

1. Register engines in the McLain capability registry.
2. Establish adapters behind McLain-owned interfaces.
3. Pilot Electric sync for a narrow OS dataset.
4. Pilot Mem0 with equipment/project memory.
5. Pilot Activepieces with one OpsPost workflow.
6. Add observability and tests before expanding each engine.

## Fork policy

A fork is justified when McLain-specific patches, deployment control, or long-term divergence are required. Otherwise prefer a pinned upstream dependency or an adapter. This keeps upstream updates usable and reduces maintenance debt.
