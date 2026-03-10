# Testing Philosophy

This app uses a two-layer test strategy:

1. Unit tests for pure decision logic.
2. Integration tests for server-side behavior against a real Postgres database.

The goal is to put each assertion at the cheapest layer that still proves the behavior we care about.

## Unit tests

Unit tests cover pure functions and extracted branching logic.

Good candidates:

- Formatting and presentation logic.
- Ranking and sorting rules.
- Validation and parsing.
- Small business-rule helpers such as `shouldCreateNotification`.

Unit tests should not need a browser, a database, or network access.

Convention:

- Colocate with the source file as `{name}.unit.test.ts`.
- Run with `bun run test:unit`.

## Integration tests

Integration tests cover real database behavior without a browser.

This is the layer for:

- `insert` / `update` / `delete` behavior.
- Multi-table side effects.
- Notification fanout.
- Cascades and cleanup rules.
- Query correctness where SQL shape matters.

Examples in this codebase:

- Message creation creating both comment and mention notifications.
- SIU archive voting crossing the notification threshold.
- Soft-delete vs hard-delete behavior for game sets.
- Notification read-state updates.

Convention:

- Place integration suites under `src/`, next to the feature they cover.
- Use the `{feature}.integration.test.ts` filename.
- Keep `bun run test:unit` scoped to `.unit.test.ts` / `.unit.test.tsx` files only so integration suites stay opt-in.
- Run them with `bun run test:integration`.

### Why integration tests exist here

For this app, a lot of important behavior lives between pure logic and full browser flows:

- Postgres-specific SQL in notification grouping and unread logic.
- Foreign-key and cascade behavior.
- Background side effects triggered by server handlers.
- Domain rules that depend on actual persisted state.

Mocking the database here would test our mocks more than the app. Integration tests are the right layer: real DB, real handler logic, minimal setup.

### Real Postgres, not in-memory Postgres

The integration layer uses a disposable real Postgres container, not an in-memory emulator.

Why:

- We use Postgres-specific behavior such as advisory locks and aggregate SQL.
- We want the real query planner, real constraints, real timestamps, real cascades.
- An emulator can be useful for experiments, but it is not the source of truth for DB behavior.

### Runner design

The runner is [src/scripts/run-integration-tests.ts](/Users/colby/Dev/une.haus/src/scripts/run-integration-tests.ts).

It does four things:

1. Starts a throwaway `postgres:16-alpine` container.
2. Overrides `DATABASE_URL` and related DB env vars for the test process.
3. Applies the current schema with `drizzle-kit push`.
4. Runs the integration suites and destroys the container on exit.

This keeps integration tests isolated from the checked-in Neon `DATABASE_URL` and avoids polluting local development data.

### Per-test isolation

Within a single integration run, each test truncates all public tables and restarts identities before the next test.

That gives us:

- Deterministic IDs.
- Small fixtures.
- No inter-test coupling.
- No need to manage a long stack of rollback transactions across app code.

We intentionally chose truncate/reset over trying to force every handler through one outer transaction, because the app code uses shared DB access patterns and handler-level side effects that are simpler and clearer to verify with clean-state tests.

### Test shape

Integration tests should:

- Seed only the rows required for the behavior under test.
- Assert the persisted state after the handler runs.
- Prefer one behavior per test.
- Avoid browser setup.
- Avoid mocking the database.

### Handler seam

For server functions, the integration layer tests exported implementation functions rather than TanStack Start's `__executeServer` wrapper.

Why:

- The TanStack wrapper requires framework async-local context that is part of TanStack runtime plumbing, not app behavior.
- The app behavior we care about is inside the handler body: database writes, derived queries, and side effects.
- Keeping the wrapper thin lets us test the meaningful logic directly with an explicit auth context and a real database.

Pattern:

```ts
export async function voteToArchiveImpl({ data, context }) {
  // real handler logic
}

export const voteToArchiveServerFn = createServerFn({ method: "POST" })
  .inputValidator(...)
  .middleware([authMiddleware])
  .handler(voteToArchiveImpl)
```

This keeps runtime behavior unchanged while giving the test layer a stable seam.

### Shared helpers

Shared integration helpers live in [src/testing/integration.ts](/Users/colby/Dev/une.haus/src/testing/integration.ts).

Use them for:

- Truncating tables.
- Minimal seed helpers.
- Auth context helpers.
- Waiting for fire-and-forget side effects to settle when necessary.

### Current suites

Current integration suites live in:

- [src/lib/messages/messages.integration.test.ts](/Users/colby/Dev/une.haus/src/lib/messages/messages.integration.test.ts)
- [src/lib/notifications/notifications.integration.test.ts](/Users/colby/Dev/une.haus/src/lib/notifications/notifications.integration.test.ts)
- [src/lib/games/sius/sius.integration.test.ts](/Users/colby/Dev/une.haus/src/lib/games/sius/sius.integration.test.ts)

## How to choose the layer

Ask these in order:

1. Can the behavior be expressed as pure input/output?
   Use a unit test.
2. Does the behavior depend on actual persisted state or SQL behavior?
   Use an integration test.

Examples:

- "Should we create this notification?" -> unit test.
- "Does archiving the SIU round create the right notification rows?" -> integration test.

## Extract, don't mock

When business logic is tangled with framework wrappers, DB access, or side effects, extract the meaningful implementation into a callable function and keep the wrapper thin.

Before:

```ts
export const someServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    // all app logic here
  })
```

After:

```ts
export async function someImpl({ data, context }) {
  // all app logic here
}

export const someServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(someImpl)
```

This gives us:

- Unit-testable helpers when logic is pure.
- Integration-testable handlers when logic is stateful.
- Minimal framework-specific surface area in tests.

## Commands

Use these commands:

- Unit tests: `bun run test:unit`
- Integration tests: `bun run test:integration`

## Manual testing with Playwright MCP

Auth codes are always random and sent via email (Resend). To test authenticated flows locally:

1. Navigate to `/auth`
2. Enter any existing user's email, for example `colby@jrnxf.co`
3. Click "send code"
4. Check the email inbox for the 4-digit code
5. On `/auth/verify`, enter the code
6. Click "verify"
