# Plan 001: Harden passwordless email-code auth against brute-force and email-bombing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 127860b..HEAD -- apps/web/src/lib/auth apps/web/src/lib/presence/state.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `127860b`, 2026-06-10

## Why this matters

The only login mechanism is an emailed numeric code. Today the code is **4
digits** (10,000 possibilities), `enterCode` matches a submitted code against
**every** pending `auth_codes` row with no email scoping and no attempt cap, and
there is **no rate limiting anywhere** in the auth flow. An attacker can trigger
`sendAuthCode` for a victim's email, then brute-force the 5-minute window: 10,000
guesses with no throttle is seconds of automated requests, yielding a session as
that user — full account takeover. Separately, `sendAuthCode` can be called
unboundedly for any address, turning the app into an email-spam relay (Resend
cost + sender-reputation damage). This plan raises the code space, ensures only
one active code per email, and adds an in-memory rate limiter (the same
single-box, in-memory pattern presence already uses) on both auth endpoints.

## Current state

- `apps/web/src/lib/auth/ops.server.ts` — `sendAuthCode` (lines ~25–63),
  `enterCode` (lines ~65–121), `register` (lines ~123–162). The server-only
  business logic.
- `apps/web/src/lib/auth/fns.ts` — TanStack Start server-fn wrappers
  (`sendAuthCodeServerFn`, `enterCodeServerFn`, `registerServerFn`). These call
  the ops above.
- `apps/web/src/lib/auth/schemas.ts` — zod input schemas.
- `apps/web/src/db/schema.ts` — `auth_codes` table (lines ~158–163):
  ```ts
  export const authCodes = pgTable("auth_codes", {
    id: text("id").primaryKey(),
    email: text("email"),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  })
  ```
  Note: no `userId`, no attempt counter. Codes are matched by `code` only.

Current code generation and matching (the vulnerable lines):

```ts
// ops.server.ts ~32-33  (sendAuthCode)
const inFiveMinutes = new Date(Date.now() + 1000 * 60 * 5)
const code = String(Math.floor(Math.random() * 10_000)).padStart(4, "0")
```

```ts
// ops.server.ts ~76-92  (enterCode) — matches code GLOBALLY, no email scope
const [authCode] = await db
  .select({ id: authCodes.id, expiresAt: authCodes.expiresAt, user: {...} })
  .from(authCodes)
  .where(eq(authCodes.code, code))
  .leftJoin(users, eq(users.email, authCodes.email))
  .limit(1)
```

**Conventions to follow:**

- In-memory ephemeral state keyed by IP is an established pattern here —
  see `apps/web/src/lib/presence/state.ts` (a module-level `Map`, pruned by
  timestamp, lost on restart by design — acceptable because the app runs as a
  single bun process under systemd). Model the rate limiter on it.
- Client IP is read with `getRequestHeader` from `@tanstack/react-start/server`:
  ```ts
  getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getRequestHeader("x-real-ip") ??
    "unknown"
  ```
  **CRITICAL — where this call may live:** `getRequestHeader` only works inside
  the active server-request context (it reads AsyncLocalStorage); calling it
  outside a request throws `No StartEvent found in AsyncLocalStorage`. The
  integration tests in `auth.integration.test.ts` call the ops
  (`enterCode`, `sendAuthCode`) **directly**, with no request context — so the
  ops MUST NOT call `getRequestHeader`. Instead, read the IP in the server-fn
  handlers in `fns.ts` (which DO run in request context) and pass it into the ops
  as an `ip` parameter (Step 4c). This is exactly why the wrappers exist — see
  `apps/web/src/lib/presence/fns.ts` for the thin-handler-wraps-op pattern.
- Errors thrown from ops surface to the client; existing code uses
  `throw new Error("...")` and `invariant(...)`. Match that.
- Tests: integration tests live next to the code as `*.integration.test.ts` and
  run against a real DB. See `apps/web/src/lib/auth/auth.integration.test.ts` for
  the exact setup/teardown pattern; unit tests are `*.unit.test.ts`
  (see `apps/web/src/lib/auth/schemas.unit.test.ts`).

## Commands you will need

| Purpose           | Command                                   | Expected on success |
| ----------------- | ----------------------------------------- | ------------------- |
| Typecheck         | `bun run --filter web typecheck`          | exit 0, no errors   |
| Unit tests        | `cd apps/web && bun test unit.test`       | all pass            |
| Integration tests | `cd apps/web && bun run test:integration` | all pass            |
| Lint              | `bun run lint`                            | exit 0              |
| Format check      | `bunx oxfmt --check`                      | exit 0              |

(Integration tests need a running Postgres and the app's test env — see
`apps/web/docs/testing.md`. If the integration harness cannot start, run the
unit tests + typecheck and note in your report that integration was not run.)

## Scope

**In scope** (the only files you should modify or create):

- `apps/web/src/lib/auth/ops.server.ts` — code length, single-active-code,
  call the rate limiter.
- `apps/web/src/lib/auth/rate-limit.ts` (create) — in-memory limiter utility.
- `apps/web/src/lib/auth/rate-limit.unit.test.ts` (create) — limiter unit tests.
- `apps/web/src/lib/auth/fns.ts` — read the client IP in the server-fn handlers
  (request context) and thread it into the ops (Step 4c). REQUIRED, not optional.
- `apps/web/src/lib/auth/auth.integration.test.ts` — add brute-force/throttle
  regression cases.
- `apps/web/src/routes/auth/verify.tsx` — widen the OTP input from 4 to 6 digits
  (hard prerequisite for 6-digit codes; see Step 2b). Surgical change only.

**Out of scope** (do NOT touch):

- The session mechanism (`apps/web/src/lib/session/*`) — unrelated.
- `apps/web/src/db/schema.ts` — do NOT add columns; this plan deliberately
  avoids a migration. (A `userId`/attempt-count column is a possible future
  hardening, noted below, but is out of scope here.)
- The login UI/routes under `apps/web/src/routes/auth/*` **except**
  `verify.tsx` — only the code-entry input there changes (4→6 digits). Do not
  touch any other route file, and do not redesign the verify form beyond the
  three edits in Step 2b.
- Email templates beyond what already renders `authCode.code`.

## Git workflow

- Branch: `advisor/001-harden-auth`
- Commit per logical unit; lowercase imperative messages matching `git log`
  (e.g. `Lengthen auth codes and add auth rate limiting`).
- Do NOT push or open a PR unless the operator instructed it.
- Do NOT add any `Co-Authored-By` trailer.

## Steps

### Step 1: Create the in-memory rate limiter

Create `apps/web/src/lib/auth/rate-limit.ts` with a sliding-window limiter keyed
by an arbitrary string, modeled on the pruning pattern in
`apps/web/src/lib/presence/state.ts`. Target shape:

```ts
// Ephemeral, in-memory — lost on restart by design (single-process deploy).
// Mirrors the in-memory pattern in ~/lib/presence/state.ts.
type Hit = { count: number; resetAt: number }
const buckets = new Map<string, Hit>()

/**
 * Returns true if the action is allowed, false if the limit is exceeded.
 * Counts hits per `key` within a rolling `windowMs`; allows up to `max`.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

// Exposed for tests to reset state between cases.
export function __resetRateLimits() {
  buckets.clear()
}
```

Do NOT use `Date.now()` inside test assertions in a way that flakes — the unit
test (Step 6) controls timing by choosing a large `windowMs` and asserting the
count boundary, not wall-clock expiry.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Lengthen the auth code to 6 digits

In `apps/web/src/lib/auth/ops.server.ts`, change the code generator from 4 to 6
digits:

```ts
// before
const code = String(Math.floor(Math.random() * 10_000)).padStart(4, "0")
// after
const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")
```

**Verify**: `grep -n "1_000_000" apps/web/src/lib/auth/ops.server.ts` → one match;
`grep -n "10_000" apps/web/src/lib/auth/ops.server.ts` → no match.

### Step 2b: Widen the OTP input to 6 digits (prerequisite for Step 2)

`apps/web/src/routes/auth/verify.tsx` renders an `input-otp` field hard-capped at
4 characters that auto-submits via `onComplete` at length 4. With 6-digit codes
the user could never enter a full code, so login would break. Make exactly three
edits:

1. The description copy (line ~80): `enter the 4-digit code sent to your email`
   → `enter the 6-digit code sent to your email` (keep it lowercase).
2. `<InputOTP maxLength={4}` (line ~83) → `<InputOTP maxLength={6}`.
3. Inside `<InputOTPGroup>` (lines ~95-100), add two more slots so there are six:
   ```tsx
   <InputOTPSlot index={0} />
   <InputOTPSlot index={1} />
   <InputOTPSlot index={2} />
   <InputOTPSlot index={3} />
   <InputOTPSlot index={4} />
   <InputOTPSlot index={5} />
   ```

Do NOT change anything else in this file (the mutation, layout, classes, and
`REGEXP_ONLY_DIGITS_AND_CHARS` pattern stay as-is).

**Verify**: `grep -c "InputOTPSlot index=" apps/web/src/routes/auth/verify.tsx` → 6;
`grep -n "maxLength={6}" apps/web/src/routes/auth/verify.tsx` → one match;
`grep -n "maxLength={4}" apps/web/src/routes/auth/verify.tsx` → no match;
`bun run --filter web typecheck` → exit 0.

### Step 3: Ensure only one active code per email

Still in `sendAuthCode`, before inserting the new code, delete any existing codes
for that email so a victim's window never contains multiple valid codes and old
codes can't accumulate. Add (using the already-imported `db`, `authCodes`, `eq`):

```ts
await db.delete(authCodes).where(eq(authCodes.email, input.email))
```

Place it immediately before the `db.insert(authCodes)` call. (`eq` is already
imported at the top of the file; if not, add it to the existing
`drizzle-orm` import.)

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 4: Rate-limit `sendAuthCode` (IP passed in, NOT read here)

Add an `ip` parameter to `sendAuthCode` (default `"unknown"` so direct test calls
that omit it still work) and throttle per-email and per-IP. Do **NOT** import or
call `getRequestHeader` in `ops.server.ts` — that throws when the integration
tests call the op directly (see the CRITICAL note in "Current state"). Add the
import `import { rateLimit } from "~/lib/auth/rate-limit"` at the top, and change
the signature + body:

```ts
export async function sendAuthCode({
  data: input,
  ip = "unknown",
}: {
  data: { email: string }
  ip?: string
}) {
  // Max 3 codes per email per 15 min, and 10 sends per IP per 15 min.
  const FIFTEEN_MIN = 15 * 60 * 1000
  if (!rateLimit(`send:email:${input.email}`, 3, FIFTEEN_MIN)) {
    throw new Error("Too many code requests. Please wait a few minutes.")
  }
  if (!rateLimit(`send:ip:${ip}`, 10, FIFTEEN_MIN)) {
    throw new Error("Too many code requests. Please wait a few minutes.")
  }

  // ...existing body (code generation, delete-existing, insert, Resend)...
}
```

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c "getRequestHeader" apps/web/src/lib/auth/ops.server.ts` → 0 (must NOT
appear in the ops).

### Step 4c: Read the IP in `fns.ts` and thread it into the ops

`getRequestHeader` belongs in the server-fn handlers, which run in the request
context. Edit `apps/web/src/lib/auth/fns.ts`:

1. Add `import { getRequestHeader } from "@tanstack/react-start/server"` and a
   small helper:
   ```ts
   function clientIp(): string {
     return (
       getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
       getRequestHeader("x-real-ip") ??
       "unknown"
     )
   }
   ```
2. In `sendAuthCodeServerFn`'s handler, pass the IP:
   ```ts
   .handler(async (ctx) => {
     const { sendAuthCode } = await loadAuthOps()
     return sendAuthCode({ ...ctx, ip: clientIp() })
   })
   ```
3. In `enterCodeServerFn`'s handler, pass the IP:
   ```ts
   .handler(async ({ data: input }) => {
     const session = await useServerSession()
     const { enterCode } = await loadAuthOps()
     return enterCode({ data: input, session, ip: clientIp() })
   })
   ```

Leave `registerServerFn` unchanged.

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -c "getRequestHeader" apps/web/src/lib/auth/fns.ts` → 3 (one import, two
calls inside `clientIp`).

### Step 5: Rate-limit `enterCode` (brute-force cap)

Add an `ip` parameter to `enterCode` (default `"unknown"`) and throttle
code-guessing per IP. Because `enterCode` only receives a `code` (no email), the
IP cap is the brute-force defense — with 6-digit codes (1,000,000 space) and a
hard per-IP attempt ceiling, guessing within the 5-minute window is infeasible.
Change the signature + add to the top of the body (do NOT call getRequestHeader):

```ts
export async function enterCode({
  data: input,
  session,
  ip = "unknown",
}: {
  data: { code: string }
  session: SessionStore
  ip?: string
}) {
  // Max 10 code-entry attempts per IP per 15 min.
  if (!rateLimit(`enter:ip:${ip}`, 10, 15 * 60 * 1000)) {
    throw new Error("Too many attempts. Please wait a few minutes.")
  }

  // ...existing body...
}
```

(The OTP input that must accept 6 digits was already widened in Step 2b — no
route work remains here.)

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -rn "enter:ip" apps/web/src/lib/auth/ops.server.ts` → one match.

### Step 6: Unit-test the limiter

Create `apps/web/src/lib/auth/rate-limit.unit.test.ts`. Model file structure on
`apps/web/src/lib/auth/schemas.unit.test.ts` (same `bun:test` imports). Cover:

- allows the first `max` calls for a key, denies the `(max+1)`th;
- distinct keys have independent buckets;
- `__resetRateLimits()` clears state between cases (call it in `beforeEach`).

Example assertion core:

```ts
import { beforeEach, describe, expect, it } from "bun:test"
import { __resetRateLimits, rateLimit } from "~/lib/auth/rate-limit"

beforeEach(() => __resetRateLimits())

it("denies after max within window", () => {
  for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000)).toBe(true)
  expect(rateLimit("k", 3, 60_000)).toBe(false)
})
```

**Verify**: `cd apps/web && bun test unit.test` → all pass, including the new file.

### Step 7: Integration regression for throttling

In `apps/web/src/lib/auth/auth.integration.test.ts`, add cases that:

- call `sendAuthCode` 4× for the same email and assert the 4th throws the
  "Too many code requests" error;
- assert that after a successful `sendAuthCode`, only **one** `auth_codes` row
  exists for that email (Step 3 behavior).

Follow the existing setup/teardown in that file (DB reset between tests). The new
cases do NOT need to pass `ip` — the op defaults it to `"unknown"`, and the
per-email limit (max 3) fires on the 4th call regardless of IP. Add
`__resetRateLimits()` to the file's `beforeEach` (import it from
`~/lib/auth/rate-limit`) so the module-level limiter state doesn't leak between
cases. The **pre-existing** `enterCode(...)` test calls must keep passing
unchanged — they omit `ip`, which now defaults to `"unknown"`; do not edit them.

**Verify**: `cd apps/web && bun run test:integration` → all pass, including the
**pre-existing** `enterCode` cases (these regressed in the prior attempt when
`getRequestHeader` was called inside the op — they must be green now).

## Test plan

- New unit tests: `apps/web/src/lib/auth/rate-limit.unit.test.ts` — limiter
  boundary, key isolation, reset (model after `schemas.unit.test.ts`).
- New integration cases in `auth.integration.test.ts` — send throttle fires on
  4th call; single active code per email after send.
- Verification: `cd apps/web && bun test unit.test` and
  `cd apps/web && bun run test:integration` both pass.

## Done criteria

ALL must hold:

- [ ] `bun run --filter web typecheck` exits 0
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] `cd apps/web && bun test unit.test` passes incl. new `rate-limit.unit.test.ts`
- [ ] `cd apps/web && bun run test:integration` passes incl. new auth cases (or, if
      the integration harness can't start, this is explicitly noted in the report)
- [ ] `grep -n "1_000_000" apps/web/src/lib/auth/ops.server.ts` → one match;
      `grep -n "padStart(4" apps/web/src/lib/auth/ops.server.ts` → no match
- [ ] `grep -rn "rateLimit(" apps/web/src/lib/auth/ops.server.ts` → 3 matches
      (two in `sendAuthCode`, one in `enterCode`)
- [ ] `grep -c "getRequestHeader" apps/web/src/lib/auth/ops.server.ts` → 0 (the
      ops must NOT call it); `grep -c "getRequestHeader" apps/web/src/lib/auth/fns.ts` → 3
- [ ] `grep -c "InputOTPSlot index=" apps/web/src/routes/auth/verify.tsx` → 6;
      `grep -n "maxLength={4}" apps/web/src/routes/auth/verify.tsx` → no match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the "Current state" locations doesn't match the excerpts (drift).
- After Step 4c, `bun run test:integration` still throws
  `No StartEvent found in AsyncLocalStorage` — that means `getRequestHeader` is
  still being reached from a direct (non-request) call path. Confirm it appears
  ONLY in `fns.ts`, never in `ops.server.ts`, and report if it persists.
- The OTP input in `verify.tsx` does not match the Step 2b excerpts (e.g. it is
  not an `input-otp` field, or the slot structure differs) — report instead of
  guessing at the markup.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The limiter is in-memory and resets on deploy/restart — acceptable for the
  current single-process systemd deploy (same assumption as
  `presence/state.ts`). **If the app is ever horizontally scaled, this limiter
  becomes per-instance and must move to a shared store (Postgres/Redis).** Flag
  that wherever scaling is documented (`DEPLOY.md`).
- Deferred, deliberately out of scope: adding a `userId` + `attempts` column to
  `auth_codes` so `enterCode` can scope by user and lock a specific code after N
  misses. That is the stronger structural fix but needs a migration; revisit if
  abuse continues despite the IP cap.
- Reviewer should scrutinize: that `getRequestHeader` is called within request
  scope (not module top-level), and that the thresholds don't lock out a normal
  user who mistypes a code a couple of times (10/15min is generous — keep it).
