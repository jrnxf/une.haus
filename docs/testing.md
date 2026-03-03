# Testing Philosophy

## Two-tier approach

### Unit tests (`*.unit.test.ts`)

Use unit tests for **decision logic** — pure functions that take input and return output without side effects.

Good candidates:

- Branching logic (should this notification be created?)
- Formatting (what message text should render?)
- Validation (is this input valid?)
- Computation (what's the derived value?)

Unit tests are fast, stable, and pinpoint exactly what broke. They don't need a browser, database, or network.

**Convention:** colocate with the source file as `{name}.unit.test.ts`. Run with `bun test`.

### E2E tests (`e2e/**/*.e2e.test.ts`)

Use e2e tests for **integration smoke tests** — does the page load, can the user complete a critical flow?

Good candidates:

- Page loads and key elements render
- Multi-step user flows (create → view → edit → delete)
- Auth-gated routes redirect correctly
- Cross-component interactions that can't be tested in isolation

E2e tests are slow, flaky-prone, and expensive. Each test should verify something that _can only_ be verified by running the full app.

**Convention:** mirror the route structure under `e2e/`. Run with `bun run e2e`.

## When to use which

Ask: _can I test this with a pure function?_

- **Yes** → unit test. Extract the logic into a testable function if needed.
- **No, it requires a real browser/server** → e2e test. Keep it minimal.

### Anti-pattern: testing library behavior in e2e

Don't write e2e tests that verify third-party component behavior (tab switching, dropdown opening, accordion expanding). These are already tested by the library. An e2e test that clicks a Radix tab and checks `aria-selected` is testing Radix, not your app.

Instead, write a single smoke test that verifies the page loads with expected elements, then unit test the logic that _your code_ adds on top.

## Extract, don't mock

When business logic is tangled with database calls or API requests, extract the decision logic into a pure function rather than mocking the dependencies:

```ts
// Before: logic mixed with DB, untestable without mocks
async function createNotification(input) {
  if (input.actorId === input.userId) return
  const settings = await db.query.settings.findFirst(...)
  if (settings && !settings.likesEnabled && input.type === "like") return
  await db.insert(notifications).values(input)
}

// After: pure function is directly testable
function shouldCreateNotification(input, settings) { ... }

async function createNotification(input) {
  const settings = await db.query.settings.findFirst(...)
  if (!shouldCreateNotification(input, settings)) return
  await db.insert(notifications).values(input)
}
```

This gives you fast, deterministic tests without mock setup/teardown overhead.

## Manual testing with Playwright MCP

In development mode (`VITE_ENVIRONMENT=development`), auth codes are fixed to `9999` and no email is sent. This lets the Playwright MCP browser test authenticated flows without database access:

1. Navigate to `/auth`
2. Enter any existing user's email (e.g., `colby@jrnxf.co`) and click "send code"
3. On `/auth/verify`, enter `9999` and click "verify"

The server logs the code to console: `[dev] Auth code for <email>: 9999`

This only applies to the dev environment — production always generates random codes and sends emails via Resend.
