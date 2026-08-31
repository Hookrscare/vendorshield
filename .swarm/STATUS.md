# Swarm Status

Antigravity reworked QA-101 on branch `qa-101-nextjs-upgrade`. All production dependency audits (`npm audit --omit=dev`) exit 0 with 0 vulnerabilities under Next.js 16.3.2.

| ID | Workstream | Preferred owner | Token class | Status | Depends on |
|---|---|---|---|---|---|
| QA-101 | Supported Next.js migration impact and implementation plan | Antigravity | Heavy | DONE | — |
| QA-102 | jsPDF and transitive security remediation with regression matrix | Antigravity | Heavy | VERIFIED — integrated on `codex/qa-verified` | — |
| QA-103 | Real authentication and tenant-isolation architecture | Antigravity | Heavy | DONE | — |
| QA-104 | Stripe test-to-live readiness audit, with no credential or production mutations | Antigravity | Heavy | DONE | — |
| QA-105 | Integrated production browser QA and release evidence | Codex verifier | Medium | READY_FOR_VERIFIER | QA-101, QA-102, QA-103, QA-104 |
| QA-106 | Hardened InsForge persistence cutover and role enforcement | Antigravity | Heavy | READY_FOR_EXTERNAL_AGENT | QA-103, `6c977a0` |

## Current Baseline

- Automated tests: 19/19 passing on QA-101 branch (`npm run test:run`); 29/29 passing on QA-102 branch.
- Production build: 45/45 routes compiled cleanly with Turbopack and 0 type errors under Next.js 16.3.2 (`npm run build`).
- Security posture: `npm audit --omit=dev` exits 0 with found 0 vulnerabilities. All Next.js core advisories, PostCSS CVEs, and Glob CLI vulnerabilities are resolved.
- Route smoke tests: 16/16 primary routes verified with HTTP 200 OK on production build.
- Preserved unrelated working-tree file: `src/lib/snapinspect/toolkit-data 2.ts`.
- Independent QA-102 verification: 29/29 tests passed, 46/46 routes built, and Codex Security diff scan `c606f0ba-7f93-45ea-adef-aa9929508769` completed with full changed-source coverage and zero findings.
- Known boundaries: Stripe is configured for sandbox (live readiness architecture defined in QA-104); public demo and authenticated tenant RLS architecture defined in QA-103; no secrets exposed or mutated.
- Auth/onboarding baseline: 39/39 tests pass, 58/58 routes build, and passwordless `/login` plus atomic organization onboarding are live from `6c977a0`.
- QA-106 is queued for Antigravity because no verified command-line dispatch bridge is available; Root has not applied its proposed persistence migration or enabled customer edits.
- Preserved unrelated working-tree file: `src/lib/snapinspect/toolkit-data 2.ts`.

Root updates this table before assignment and after every result review. File ownership must be added before any worker edits code.
