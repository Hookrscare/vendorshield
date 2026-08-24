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
