# Task Packet: QA-###

```yaml
id: QA-###
title:
owner:
status: QUEUED # QUEUED | READY_FOR_EXTERNAL_AGENT | ACTIVE | BLOCKED | REVIEW | DONE
objective:
why_this_agent:
repository: /Users/castro/Documents/SaaS
base_commit:
owned_files: []
read_only_files: []
forbidden_actions:
  - expose or request secret values
  - mutate Stripe, Vercel, DNS, email, or production state
  - merge, rebase shared branches, or push main
inputs: []
acceptance_criteria: []
required_checks: []
expected_artifacts: []
known_risks: []
dependencies: []
token_class: heavy # light | medium | heavy
```

## Instructions

Deliver one verifiable outcome. Edit only `owned_files`. Record any out-of-scope discovery as a proposed follow-up. Return a result packet using `.swarm/RESULT_TEMPLATE.md`.
