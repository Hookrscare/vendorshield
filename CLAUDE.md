# Project Guidance

## Testing

- Run unit and component tests with `npm run test:run`.
- Run browser tests from `e2e/` with `npm run test:e2e`.
- See `TESTING.md` for the complete testing structure and conventions.
- Complete test coverage is the goal. New functions require corresponding tests.
- Bug fixes require regression tests that reproduce the original failure.
- Error handling requires a test that triggers the error.
- Conditionals require tests for both branches.
- Never commit code that makes existing tests fail.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
