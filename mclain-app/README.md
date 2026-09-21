# McLain Systems Console

An iPhone-first control plane layered on top of ECC.

## What it is

- installable PWA shell,
- safe allowlisted ECC command runner,
- live status/profile view,
- execution-packet generator for build, project-control, and evidence-research workflows,
- offline-cached UI shell,
- Vercel-ready serverless adapter at the repository root.

## Run locally or on a persistent Node host

From the repository root:

```bash
npm run mclain:app
```

Default: `http://localhost:8787`.

A hosted Node service can set `PORT` automatically.

## Deploy on Vercel

The repository root now contains `vercel.json` and `api/*.js`, so no framework conversion is required.

1. In Vercel, create a new project and import `garrettmclain96-prog/ecc`.
2. Use the repository root (`.`) as the Root Directory.
3. Framework preset: **Other**.
4. Leave Build Command and Output Directory unset unless Vercel auto-detects a harmless default.
5. No environment variables are required for the current console.
6. Deploy.

The root route is rewritten to `mclain-app/public/index.html`, while `/api/status`, `/api/profile`, `/api/packet`, and `/api/run` use Vercel Functions.

## Install on iPhone

1. Open the HTTPS deployment URL in Safari.
2. Tap Share.
3. Tap **Add to Home Screen**.
4. Launch **McLain Systems** like an app.

The UI shell is cached for offline use. Server-backed ECC checks require connectivity.

## Safety model

The browser cannot submit arbitrary shell text. `POST /api/run` accepts only keys in a server-side allowlist. Commands run with `shell: false`, fixed arguments, an execution timeout, and a 1 MiB output ceiling.

## Work-order pilot status

The System view can submit a front-desk test issue after staff sign-in and save the returned draft to the shared `public.ops_work_orders` table in the Jamaica Beach Supabase project. The Ops review list supports manager review, proposed assignment, evidence and resolution. Duplicate intake is ignored using `(site_id, dedupe_key)`. The first manager account requires an existing resort site membership (`profiles.user_id` joined to `site_memberships.profile_id` with `access_level = 'manager'` or `owner`). New self-registered accounts receive no site membership automatically. The table migration is in `mclain-app/supabase/work_orders.sql`. Anonymous access has no grant, staff members can read and insert new drafts, and managers can update them.

Old device drafts remain local until an approved member taps **Move old device drafts**. Backups contain local drafts and a read-only snapshot of the last loaded shared queue; importing a backup does not overwrite shared records. `/api/activepieces-frontdesk-issue` returns a preview with no authorization; with a valid site-member Bearer token, it saves to the shared queue. Activepieces still needs a dedicated member account and token refresh step before its live webhook can save events. Proposed assignees are not dispatched; marking a draft resolved does not close an external ticket. There is no live Vonage, OCR, voice, document search, scheduling, or Hugging Face integration.

## Current allowlist

- doctor
- catalog-check
- command-registry-check
- skills-health
- harness-audit
- platform-audit

## Operator workflows

- **Build** — turn an idea or problem into a reusable system.
- **Control** — reconcile project state, proof, blockers, next actions, and automation opportunities.
- **Research** — structure an evidence/proof ladder without copying private source material into the public repository.
