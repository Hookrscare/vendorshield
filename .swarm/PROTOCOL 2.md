# SaaS QA Swarm Protocol

This directory is the durable source of truth for delegated QA work. Chat messages are notifications; task and result packets hold the scope, decisions, and evidence.

## Roles

- **Root Codex — Orchestrator:** decomposes work, assigns file ownership, reviews evidence, integrates approved changes, and owns final release decisions.
- **Antigravity — Heavy-Lift Agent:** handles large-context analysis, breaking dependency migrations, architecture/security reviews, exhaustive test design, and long implementation plans.
- **Specialist Worker:** implements or verifies one bounded assignment with exclusive file ownership.
- **Independent Verifier:** checks acceptance criteria and evidence without verifying its own material changes.

Only Root may merge or push `main`, handle secrets, change Stripe or Vercel settings, deploy, or perform production actions. External agents must never receive secret values.

## Routing

Route work to Antigravity when it needs broad repository context, a breaking migration, cross-cutting auth/security design, or exhaustive analysis. Keep isolated patches, focused tests, and integration work with Codex specialists.

If Antigravity is unavailable, mark the task `READY_FOR_EXTERNAL_AGENT`. Do not silently expand another worker's scope.

## Workflow

1. Root creates `.swarm/tasks/QA-###.md` from `TASK_TEMPLATE.md`.
2. Root records the owner, writable files, base commit, dependencies, and status in `STATUS.md`.
3. The worker edits only owned files and returns `.swarm/results/QA-###.md` from `RESULT_TEMPLATE.md`.
4. Root checks the diff, secret safety, tests, build, browser behavior, and risks.
5. An independent verifier checks billing, authentication, tenant isolation, security, or dependency changes.
6. Root integrates accepted work and reruns the relevant checks on the combined tree.

## Conflict Rules

- One active owner per writable file.
- Shared files are assigned sequentially.
- Workers do not merge, rebase shared branches, force-push, push `main`, or overwrite another task's work.
- Work outside the task scope becomes a proposed new task.
- Pre-existing and unrelated working-tree changes remain untouched.

## Security and Production Boundary

- Refer to environment-variable names only; never copy secret values into prompts, files, logs, screenshots, commits, or results.
- No worker may create, view, rotate, or revoke credentials; change Stripe products, prices, webhooks, customers, subscriptions, refunds, payouts, or account mode; change Vercel environment variables, domains, deployments, or aliases; alter DNS/email records; or trigger real charges.
- A production mutation requires exact target verification, an impact and rollback review, and explicit user approval.

## Required Verification

Use the checks appropriate to the change:

1. Lint, type checking, and secret scanning.
2. Targeted regression tests.
3. Full automated test suite.
4. Production-mode build.
5. Browser smoke tests for affected journeys, including failure, loading, mobile, keyboard, and reduced-motion states.
6. Stripe sandbox checks for success, cancellation, signature validation, duplicate webhooks, and failed payments.
7. Independent security review for auth, tenant isolation, authorization, input validation, dependencies, and sensitive logging.

A result is not complete without evidence. Skipped checks and assumptions must be explicit.

## Stop and Escalate

Return `BLOCKED` with evidence and safe options when secrets or permissions are missing, production would change, scope conflicts, the base has drifted materially, acceptance criteria are unclear, or a billing/security/data-loss risk is discovered.

## Completion

The swarm effort is complete only when all required tasks are `DONE`, their evidence is recorded, integrated checks pass, production-sensitive actions have explicit approval, and remaining limitations are documented.
