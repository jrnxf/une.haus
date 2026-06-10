# Plan 002: Sign unsubscribe links so they can't be forged for other users

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 127860b..HEAD -- apps/web/src/routes/api/unsubscribe.ts apps/web/server/tasks/notifications`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `127860b`, 2026-06-10

## Why this matters

The unsubscribe endpoint trusts a raw `userId` query parameter with no signature
or session check. `GET /api/unsubscribe?type=all&userId=<n>` unsubscribes user
`<n>` from **all** email notifications — user IDs are small sequential integers,
so anyone can disable every user's emails by iterating IDs (a trivial griefing /
denial-of-communication attack, and a way to suppress security-relevant mail).
The fix is a stateless HMAC token derived from `userId+type` using the existing
`SESSION_SECRET`, generated when the email is sent and verified before
unsubscribing — no new storage, no migration.

## Current state

- `apps/web/src/routes/api/unsubscribe.ts` — the GET handler. Reads `type` and
  `userId` from the query string and calls `unsubscribe()` with no verification:
  ```ts
  const type = url.searchParams.get("type")
  const userId = url.searchParams.get("userId")
  // ...validates type is in a set, userId is a number...
  await unsubscribe({ type: type as ..., userId: userIdNum })
  ```
- `apps/web/server/tasks/notifications/send-digests.ts:184-185` — builds the
  links with a plaintext userId:
  ```ts
  unsubscribeDigestUrl: `https://une.haus/api/unsubscribe?type=digest&userId=${user.userId}`,
  unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}`,
  ```
- `apps/web/server/tasks/notifications/game-start-reminders.ts:143-144` — same
  pattern for `type=game_start` and `type=all`.
- `apps/web/src/lib/notification-settings/ops.server.ts` — exports
  `unsubscribe({ type, userId })`. Leave its behavior unchanged.
- `apps/web/src/lib/env.ts` — `SESSION_SECRET` is a validated server env var
  (`server: { SESSION_SECRET: z.string() }`). Import via `~/lib/env`.

**Conventions to follow:**

- Server-only modules start with `import "@tanstack/react-start/server-only"`
  (see `notification-settings/ops.server.ts:1`). The new token helper is
  server-only — start it the same way.
- Crypto: use Node's built-in `node:crypto` (`createHmac`). Bun supports it
  natively. No new dependency.
- Tests: pure functions get `*.unit.test.ts` with `bun:test` (see
  `apps/web/src/lib/auth/schemas.unit.test.ts` for structure).

## Commands you will need

| Purpose      | Command                             | Expected on success |
| ------------ | ----------------------------------- | ------------------- |
| Typecheck    | `bun run --filter web typecheck`    | exit 0, no errors   |
| Unit tests   | `cd apps/web && bun test unit.test` | all pass            |
| Lint         | `bun run lint`                      | exit 0              |
| Format check | `bunx oxfmt --check`                | exit 0              |

## Scope

**In scope** (the only files you should modify or create):

- `apps/web/src/lib/notification-settings/unsubscribe-token.ts` (create) —
  `signUnsubscribe(userId, type)` and `verifyUnsubscribe(userId, type, token)`.
- `apps/web/src/lib/notification-settings/unsubscribe-token.unit.test.ts` (create).
- `apps/web/src/routes/api/unsubscribe.ts` — require + verify the token.
- `apps/web/server/tasks/notifications/send-digests.ts` — append `&token=...`.
- `apps/web/server/tasks/notifications/game-start-reminders.ts` — append
  `&token=...`.

**Out of scope** (do NOT touch):

- `apps/web/src/lib/notification-settings/ops.server.ts` — `unsubscribe()` logic
  is correct; only its caller (the route) gains a gate.
- The email templates themselves (they already render whatever URL string the
  task passes in).
- Any change that would require storing tokens in the DB — the scheme is
  stateless by design.

## Git workflow

- Branch: `advisor/002-sign-unsubscribe`
- Lowercase imperative commit messages matching `git log`
  (e.g. `Sign unsubscribe links with an hmac token`).
- Do NOT push or open a PR unless instructed. No `Co-Authored-By` trailer.

## Steps

### Step 1: Create the token helper

Create `apps/web/src/lib/notification-settings/unsubscribe-token.ts`:

```ts
import "@tanstack/react-start/server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "~/lib/env"

type UnsubscribeType = "all" | "digest" | "game_start"

export function signUnsubscribe(userId: number, type: UnsubscribeType): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`${userId}:${type}`)
    .digest("hex")
}

export function verifyUnsubscribe(
  userId: number,
  type: UnsubscribeType,
  token: string,
): boolean {
  const expected = signUnsubscribe(userId, type)
  // Constant-time compare; lengths must match for timingSafeEqual.
  if (token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}
```

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Verify the token in the route

In `apps/web/src/routes/api/unsubscribe.ts`, read a `token` param and verify it
before calling `unsubscribe()`. After the existing `userIdNum` NaN check, add:

```ts
const token = url.searchParams.get("token")
if (!token || !verifyUnsubscribe(userIdNum, type as UnsubscribeType, token)) {
  return new Response("Invalid or missing unsubscribe token", { status: 403 })
}
```

Add the import at the top:
`import { verifyUnsubscribe } from "~/lib/notification-settings/unsubscribe-token"`.
The `type` variable is already narrowed to the valid set above; cast it to the
same union the file already uses when calling `unsubscribe`.

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -n "verifyUnsubscribe" apps/web/src/routes/api/unsubscribe.ts` → one match.

### Step 3: Append signed tokens to digest links

In `apps/web/server/tasks/notifications/send-digests.ts`, import the signer and
append `&token=` to both URLs (lines ~184-185):

```ts
import { signUnsubscribe } from "~/lib/notification-settings/unsubscribe-token"
// ...
unsubscribeDigestUrl: `https://une.haus/api/unsubscribe?type=digest&userId=${user.userId}&token=${signUnsubscribe(user.userId, "digest")}`,
unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}&token=${signUnsubscribe(user.userId, "all")}`,
```

Confirm `user.userId` is a `number` here (it is the same value already
interpolated). If the import path alias `~/` does not resolve in
`apps/web/server/` files, check how other imports in this same file are written
and match them (STOP if neither `~/...` nor a relative path resolves).

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 4: Append signed tokens to game-start reminder links

In `apps/web/server/tasks/notifications/game-start-reminders.ts` (lines ~143-144),
do the same for `game_start` and `all`:

```ts
unsubscribeReminderUrl: `https://une.haus/api/unsubscribe?type=game_start&userId=${user.userId}&token=${signUnsubscribe(user.userId, "game_start")}`,
unsubscribeAllUrl: `https://une.haus/api/unsubscribe?type=all&userId=${user.userId}&token=${signUnsubscribe(user.userId, "all")}`,
```

Import `signUnsubscribe` the same way as Step 3.

**Verify**: `bun run --filter web typecheck` → exit 0;
`grep -rn "token=\${signUnsubscribe" apps/web/server/tasks/notifications` → 4 matches.

### Step 5: Unit-test the round-trip

Create `apps/web/src/lib/notification-settings/unsubscribe-token.unit.test.ts`.
Model on `apps/web/src/lib/auth/schemas.unit.test.ts`. Cases:

- `verifyUnsubscribe(id, type, signUnsubscribe(id, type))` → `true`;
- wrong `userId` → `false`;
- wrong `type` → `false`;
- tampered/garbage token → `false`.

Note: this test imports a server-only module. If `bun test unit.test` fails to
load it because of the `server-only` import guard, mirror how
`apps/web/src/lib/auth/auth.integration.test.ts` imports server-only code, or
move the assertions to an integration test instead — choose whichever the
existing suite already does for server-only units. (If neither works, STOP and
report; do not delete the `server-only` import.)

**Verify**: `cd apps/web && bun test unit.test` → all pass including the new file.

## Test plan

- New unit test: `unsubscribe-token.unit.test.ts` — sign/verify round-trip plus
  three rejection cases (wrong user, wrong type, tampered token).
- Verification: `cd apps/web && bun test unit.test` passes.

## Done criteria

ALL must hold:

- [ ] `bun run --filter web typecheck` exits 0
- [ ] `bun run lint` exits 0 and `bunx oxfmt --check` exits 0
- [ ] `cd apps/web && bun test unit.test` passes incl. new token test
- [ ] `grep -rn "token=\${signUnsubscribe" apps/web/server/tasks/notifications` → 4 matches
- [ ] `grep -n "verifyUnsubscribe" apps/web/src/routes/api/unsubscribe.ts` → 1 match
- [ ] A request to `/api/unsubscribe?type=all&userId=1` **without** a valid token
      returns 403 (verified by reading the route logic — no token branch returns 403)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The route or task files don't match the "Current state" excerpts (drift).
- The `~/` import alias does not resolve inside `apps/web/server/tasks/...` and
  no relative-path equivalent works.
- The server-only unit test cannot be loaded by the unit runner and there is no
  existing precedent in the suite for testing a `server-only` module.
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Tokens are stateless and never expire — fine for unsubscribe (idempotent,
  low-stakes). If `SESSION_SECRET` is rotated, previously-sent links stop
  working; acceptable.
- Any **new** email that includes an unsubscribe link must use `signUnsubscribe`
  for its `type` — grep for `api/unsubscribe?` when adding emails. Consider this
  the canonical pattern.
- Reviewer should scrutinize: that the same `type` string is used for both
  signing and the URL `type=` param (a mismatch silently 403s real users), and
  that `timingSafeEqual` is guarded by the length check (it throws on unequal
  lengths otherwise).
