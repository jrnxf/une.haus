# Plan 009: Notify game participants when someone responds to their set

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9653040..HEAD -- apps/web/src/db/schema.ts apps/web/src/lib/notifications apps/web/src/lib/notification-settings apps/web/src/lib/games apps/web/src/routes/_authed/notifications/settings.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction (engagement)
- **Planned at**: commit `9653040`, 2026-06-12

## Why this matters

The three games are the site's core engagement loop, but the loop has no
feedback signal at its most important moment:

- **Rack It Up (RIU)**: when someone submits a video response to your set
  (`createSubmission`), you are never notified. Likes and comments on the set
  notify you; the actual game action — someone attempting your set — does not.
- **Back It Up (BIU) / Stack It Up (SIU)**: when someone continues the chain
  by backing up / stacking on your set (`backUp` / set creation with a
  `parentSetId`), the owner of the set that was just continued is never
  notified. Only the actor's _followers_ get a generic `new_content`
  notification.

The person most invested in the event — the one whose move was answered — is
the only one who doesn't hear about it. Fixing this closes the game loop:
play → someone responds → you come back.

## Current state

### Notification system (all paths under `apps/web/`)

- `src/db/schema.ts:72-90` — the notification type enum:

```ts
export const NOTIFICATION_TYPES = [
  "like",
  "message_like",
  "comment",
  "follow",
  "new_content",
  "archive_request",
  "chain_archived",
  "review",
  "flag",
  "mention",
] as const
...
export const notificationTypeEnum = pgEnum(
  "notification_type",
  NOTIFICATION_TYPES,
)
```

- `src/db/schema.ts:751-766` — per-user toggles (one boolean column per
  notification class):

```ts
export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  likesEnabled: boolean("likes_enabled").notNull().default(true),
  commentsEnabled: boolean("comments_enabled").notNull().default(true),
  followsEnabled: boolean("follows_enabled").notNull().default(true),
  newContentEnabled: boolean("new_content_enabled").notNull().default(true),
  mentionsEnabled: boolean("mentions_enabled").notNull().default(true),
  ...
```

- `src/lib/notifications/helpers.server.ts:21-45` — preference plumbing.
  `NotificationPreferences` mirrors the five booleans; `TYPE_TO_SETTING` maps
  each type to its toggle; `SYSTEM_TYPES` bypass preferences.
  `createNotification(input)` (line ~85) checks prefs then inserts one row;
  it also skips self-notifications (`actorId === userId`).
  `notifyFollowers(args)` (line ~110) batch-notifies all followers of the
  actor with type `new_content`.

- `src/lib/notifications/schemas.ts` — `createNotificationSchema` validates
  `type: z.enum(NOTIFICATION_TYPES)`, so new enum members flow through
  automatically. `data` supports `actorName`, `actorAvatarId`, `entityTitle`,
  `entityPreview`, `trickId`, `messageId`.

- `src/lib/notifications/utils.ts` — `getNotificationText(type, ...)` and
  `getNotificationAction(type, ...)` switch over the type to build the
  human-readable string (e.g. `case "comment": return \`${actorText} commented
  on your ...\``). Both have a `default` fallback.
  `getNotificationUrl(entityType, entityId, data)` already maps the entity
  types we need: `riuSubmission` → `/games/rius/submissions/${entityId}`,
`biuSet`→`/games/bius/sets/${entityId}`, `siuSet` → `/games/sius/sets/${entityId}`.

- `src/components/notifications/notification-item.tsx` — `NotificationIcon`
  switches on type with a `default` branch that renders
  `<ContentIcon entityType={entityType} />`, which already has cases for
  `riuSubmission`, `biuSet`, `siuSet`. **No change needed in this file** —
  the default branch covers new types with the right per-game icons.

- `src/lib/notification-settings/schemas.ts` — `updateNotificationSettingsSchema`
  lists each toggle as `z.boolean().optional()`.
- `src/routes/_authed/notifications/settings.tsx:136-172` — the settings page
  builds a toggle list; each entry looks like:

```ts
{
  key: "commentsEnabled" as const,
  label: "comments",
  description: "when someone comments on your content",
  icon: MessageCircle,
  enabled: settings.commentsEnabled,
},
```

### Game ops (the three injection points)

- `src/lib/games/rius/ops.server.ts` — `createSubmission` (~lines 175-236).
  It already loads the parent set with owner:

```ts
const [riuSet] = await db
  .select({
    id: riuSets.id,
    userId: riuSets.userId,
    riu: { status: rius.status },
  })
  .from(riuSets)
  .innerJoin(rius, eq(riuSets.riuId, rius.id))
  .where(eq(riuSets.id, input.riuSetId))
```

then guards (`status === "active"`, not own set, no duplicate), inserts into
`riuSubmissions` with `.returning()`, and returns. **No notification is
created.** Note: `createSubmission` rejects submitting to your own set, so
the recipient is always ≠ actor here.

- `src/lib/games/bius/ops.server.ts` — `backUp` (~lines 215-280). Inside a
  `db.transaction`, it loads `parentSet` (has `userId`, `position`, `id`),
  guards `parentSet.userId !== userId`, inserts the new set
  (`parentSetId: parentSet.id`), then fires followers-only notification:

```ts
// Notify followers about the new BIU set
notifyFollowers({
  actorId: userId,
  actorName: context.user.name,
  actorAvatarId: context.user.avatarId,
  type: "new_content",
  entityType: "biuSet",
  entityId: set.id,
  entityTitle: set.name,
}).catch(logRejection("games.bius.notify"))
```

- `src/lib/games/sius/ops.server.ts` — the set-creation op (~lines 160-210)
  has the identical shape: loads a `parentSet`, inserts with
  `position: parentSet.position + 1, parentSetId: parentSet.id`, then
  `notifyFollowers({... entityType: "siuSet", entityId: set.id ...})`.
  NOTE: in SIU, stacking on your own set may be allowed (there is no
  "cannot back up your own set" invariant visible for SIU) —
  `createNotification`'s built-in self-check handles that case.

### Conventions

- Server fire-and-forget notifications use
  `.catch(logRejection("games.<game>.notify"))` (`logRejection` from
  `~/lib/logger`). Match it.
- Migrations: edit `src/db/schema.ts`, then `bun run --filter web db:generate`
  produces a numbered migration under `apps/web/drizzle/`; `bun run --filter
web db:check` (also part of preflight) fails if schema and migrations drift.
- All user-facing static text lowercase. `type` not `interface`.

## Commands you will need

| Purpose            | Command                             | Expected on success                                                    |
| ------------------ | ----------------------------------- | ---------------------------------------------------------------------- |
| Install            | `bun install` (repo root)           | exit 0                                                                 |
| Generate migration | `bun run --filter web db:generate`  | new file in `apps/web/drizzle/`                                        |
| Drift check        | `bun run --filter web db:check`     | exit 0                                                                 |
| Typecheck          | `bun run --filter web typecheck`    | exit 0                                                                 |
| Unit tests         | `cd apps/web && bun test unit.test` | all pass                                                               |
| Integration tests  | `bun test:integration` (repo root)  | all pass (needs local Postgres; `docker-compose up -d` if not running) |
| Full gate          | `bun preflight` (repo root)         | all checks pass                                                        |

## Scope

**In scope** (the only files you should modify):

- `apps/web/src/db/schema.ts` (enum value + settings column)
- `apps/web/drizzle/**` (generated migration — generated, not hand-written)
- `apps/web/src/lib/notifications/helpers.server.ts`
- `apps/web/src/lib/notifications/utils.ts`
- `apps/web/src/lib/notifications/utils.unit.test.ts`
- `apps/web/src/lib/notifications/helpers.unit.test.ts`
- `apps/web/src/lib/notification-settings/schemas.ts`
- `apps/web/src/routes/_authed/notifications/settings.tsx`
- `apps/web/src/lib/games/rius/ops.server.ts`
- `apps/web/src/lib/games/bius/ops.server.ts`
- `apps/web/src/lib/games/sius/ops.server.ts`
- `apps/web/src/lib/games/rius/rius.integration.test.ts`
- `apps/web/src/lib/games/bius/bius.integration.test.ts`
- `apps/web/src/lib/games/sius/sius.integration.test.ts`

**Out of scope** (do NOT touch):

- `src/components/notifications/notification-item.tsx` — default branches
  already handle the new type.
- Email digest / reminder tasks (`server/tasks/**`) — in-app only for now.
- `src/lib/messages/**`, `src/lib/reactions/**` — comment/like notifications
  already work.
- Any change to existing notification types' behavior.

## Git workflow

- Branch: `advisor/009-game-participant-notifications`
- Commit per step; style: short imperative summary (e.g. `Add game_activity
notification type`), no attribution trailers.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Schema — new type + new toggle

In `apps/web/src/db/schema.ts`:

1. Append `"game_activity"` to `NOTIFICATION_TYPES` (append at the END of the
   array — Postgres enum values are added with `ALTER TYPE ... ADD VALUE`;
   appending avoids ordering issues).
2. In `userNotificationSettings`, after `mentionsEnabled`, add:

```ts
gameActivityEnabled: boolean("game_activity_enabled").notNull().default(true),
```

Then generate the migration: `bun run --filter web db:generate`.
Inspect the generated SQL file: it must contain ONLY
`ALTER TYPE "public"."notification_type" ADD VALUE 'game_activity'` (or
equivalent) and `ALTER TABLE "user_notification_settings" ADD COLUMN
"game_activity_enabled" boolean DEFAULT true NOT NULL`. If it contains any
DROP or unrelated DDL → STOP condition.

**Verify**: `bun run --filter web db:check` → exit 0.
**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 2: Preference plumbing

In `apps/web/src/lib/notifications/helpers.server.ts`:

1. Add `gameActivityEnabled: boolean` to the `NotificationPreferences` type.
2. Add to `TYPE_TO_SETTING`: `game_activity: "gameActivityEnabled",`.
3. Do NOT add `game_activity` to `SYSTEM_TYPES` (users may turn it off).

In `apps/web/src/lib/notification-settings/schemas.ts`, add
`gameActivityEnabled: z.boolean().optional(),` alongside the other toggles.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 3: Notification copy

In `apps/web/src/lib/notifications/utils.ts`, add a `case "game_activity"` to
BOTH `getNotificationText` and `getNotificationAction`. The event means
"someone responded to / built on your set". Use the entity type to pick the
verb:

- `entityType === "riuSubmission"` → action text `submitted to your set`
- otherwise (biuSet / siuSet) → action text `built on your set`

Follow the structure of the existing `comment` case, including the
`entityTitle` suffix (`: "<title>"` in `getNotificationText`,
` "<title>"` in `getNotificationAction`).

**Verify**: `cd apps/web && bun test unit.test` → existing tests pass.

### Step 4: Settings page toggle

In `apps/web/src/routes/_authed/notifications/settings.tsx`, add one entry to
the toggle list after `commentsEnabled` (match the object shape exactly):

```ts
{
  key: "gameActivityEnabled" as const,
  label: "game activity",
  description: "when someone submits to or builds on one of your sets",
  icon: ArrowLeftRightIcon,
  enabled: settings.gameActivityEnabled,
},
```

Import `ArrowLeftRightIcon` from `lucide-react` if not already imported in
that file (check first — pick any already-imported game-ish icon if the
import list conflicts with lint rules).

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 5: RIU — notify the set owner on submission

In `apps/web/src/lib/games/rius/ops.server.ts`, `createSubmission`:

1. Add `name: riuSets.name` to the existing `riuSet` select (for the title).
2. After the `riuSubmissions` insert succeeds (after `.returning()`), add:

```ts
createNotification({
  userId: riuSet.userId,
  actorId: userId,
  type: "game_activity",
  entityType: "riuSubmission",
  entityId: riuSubmission.id,
  data: {
    actorName: context.user.name,
    actorAvatarId: context.user.avatarId,
    entityTitle: riuSet.name,
  },
}).catch(logRejection("games.rius.notify"))
```

Import `createNotification` from `~/lib/notifications/helpers.server` and
`logRejection` from `~/lib/logger` if not already imported (the file already
imports `notifyFollowers` from the same helper module).
Check the `AuthenticatedContext` type in this file includes `name` and
`avatarId` (other game ops use them); if `createSubmission`'s context lacks
them, widen its context type to match the file's existing
`AuthenticatedContext`.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 6: BIU + SIU — notify the parent-set owner on continuation

In `apps/web/src/lib/games/bius/ops.server.ts` (`backUp`) and
`apps/web/src/lib/games/sius/ops.server.ts` (the set-creation op with
`parentSetId`), immediately next to the existing `notifyFollowers(...)` call,
add:

```ts
createNotification({
  userId: parentSet.userId,
  actorId: userId,
  type: "game_activity",
  entityType: "biuSet", // "siuSet" in the SIU file
  entityId: set.id,
  data: {
    actorName: context.user.name,
    actorAvatarId: context.user.avatarId,
    entityTitle: set.name,
  },
}).catch(logRejection("games.bius.notify")) // games.sius.notify in SIU
```

Notes:

- `entityId` is the NEW set's id, so the notification links to the responding
  set (`getNotificationUrl` → `/games/bius/sets/<newSetId>`).
- If `parentSet` in either file does not already select `userId`, add it to
  the columns.
- The SIU op may allow self-continuation; `createNotification` already
  no-ops when `actorId === userId`, so no extra guard is needed.
- Do NOT move these calls inside/outside the transaction differently from how
  `notifyFollowers` is invoked in the same function — mirror its placement.

**Verify**: `bun run --filter web typecheck` → exit 0.

### Step 7: Tests (see test plan), then full gate

**Verify**: `bun preflight` → all checks pass.
**Verify**: `bun test:integration` → all pass, including the new tests.

## Test plan

- `apps/web/src/lib/notifications/helpers.unit.test.ts` — extend the
  `shouldCreateNotification` cases (the existing tests show the pattern):
  1. `game_activity` allowed when settings are null (defaults on).
  2. `game_activity` blocked when `gameActivityEnabled: false`.
  3. `game_activity` self-notification (actorId === userId) blocked.
     You will need to add `gameActivityEnabled: true/false` to any existing
     settings fixture objects to satisfy the widened `NotificationPreferences`
     type.
- `apps/web/src/lib/notifications/utils.unit.test.ts` — two cases:
  `getNotificationAction("game_activity", "riuSubmission")` →
  `"submitted to your set"`, and with `"biuSet"` → `"built on your set"`
  (match the existing label-assertion style in that file).
- Integration (model after the existing tests in each game's
  `*.integration.test.ts`, which already create users/rounds/sets):
  1. `rius.integration.test.ts` — user B submits to user A's set → exactly one
     `notifications` row for A with `type = "game_activity"`,
     `entityType = "riuSubmission"`, `entityId = <submission id>`.
  2. `bius.integration.test.ts` — user B backs up A's set → one
     `game_activity` row for A pointing at the new set; AND user B's follower
     C still gets the `new_content` row (both fire).
  3. `sius.integration.test.ts` — same as BIU for stacking; plus: continuing
     your own set creates NO `game_activity` row.
- Verification: `bun test:integration` → all pass; `cd apps/web && bun test
unit.test` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun preflight` exits 0 (includes db:check drift gate)
- [ ] A new migration file exists under `apps/web/drizzle/` containing the
      enum value and the new column, and nothing destructive
- [ ] `grep -n "game_activity" apps/web/src/lib/games/rius/ops.server.ts apps/web/src/lib/games/bius/ops.server.ts apps/web/src/lib/games/sius/ops.server.ts` → one match per file
- [ ] `bun test:integration` exits 0 with the 4+ new integration cases present
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The generated migration contains anything beyond the enum ADD VALUE and the
  ADD COLUMN (e.g. drops, renames, unrelated diffs) — the schema has drifted.
- `createSubmission` / `backUp` / the SIU set op don't match the shapes in
  "Current state" (e.g. `parentSet` no longer carries `userId`).
- You find an existing notification already firing to the parent-set owner in
  any of the three ops (the gap may have been fixed independently).
- Adding `gameActivityEnabled` to `NotificationPreferences` breaks more than
  ~5 call sites — report the list instead of mass-editing.

## Maintenance notes

- Anyone adding a fourth game should wire the same `game_activity`
  notification at its "respond to a set" moment.
- The email digest (`server/tasks/notifications/send-digests.ts`) counts
  unread notifications generically, so `game_activity` rows flow into digests
  automatically — reviewer should confirm that's desired (it almost certainly
  is).
- Deliberately deferred: an in-app "new round is live" broadcast when RIU
  rotates (audience is a product decision — all users vs. past participants),
  and any notification batching/digesting of rapid chain activity.
- Reviewer should scrutinize: notification copy lowercase; the BIU/SIU calls
  reference the NEW set id, not the parent's.
