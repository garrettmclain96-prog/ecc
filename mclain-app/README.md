# McLain Systems Console

An iPhone-first control plane layered on top of ECC.

## What it is

- installable PWA shell,
- safe allowlisted ECC command runner,
- live status/profile view,
- execution-packet generator for build, project-control, and evidence-research workflows,
- offline-cached UI shell.

## Run

From the repository root:

```bash
npm run mclain:app
```

Default: `http://localhost:8787`.

A hosted deployment can set `PORT` automatically.

## iPhone

1. Deploy this branch to a Node-capable host.
2. Open the HTTPS URL in Safari.
3. Share → **Add to Home Screen**.
4. Launch **McLain Systems** like an app.

The shell remains available offline. ECC command execution requires connectivity.

## Safety model

The browser cannot send arbitrary shell text. `POST /api/run` accepts only keys in the server-side allowlist. Commands run with `shell: false`, fixed arguments, a 90-second timeout, and a 1 MiB output ceiling.

## Current allowlist

- doctor
- catalog-check
- command-registry-check
- skills-health
- harness-audit
- platform-audit
