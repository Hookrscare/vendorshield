# Testing

Tests make fast product work safe. The goal is complete coverage of business logic, error paths, and customer-critical flows so changes can ship with confidence.

## Frameworks

- Vitest 4 with jsdom for unit and component tests
- Testing Library for React behavior tests
- Playwright for browser-level checkout and access-control flows

## Commands

```bash
npm run test:run
npm run test
npm run test:e2e
```

## Test layers

- Unit tests live beside source files as `*.test.ts` or `*.test.tsx` and cover pure logic and error handling.
- Component tests use Testing Library and assert visible behavior instead of implementation details.
- Integration tests exercise route handlers with external services mocked.
- End-to-end tests live in `e2e/` and cover critical customer journeys in Chromium.

## Conventions

- Use `describe` for the unit under test and `it` for one observable behavior.
- Name the precondition and expected result in each test title.
- Add a regression test for every fixed bug, including both success and failure branches.
- Never place credentials, production tokens, or customer data in fixtures.
