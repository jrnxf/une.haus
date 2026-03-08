# Integration Testing TODOs

This is the backlog for server-side behaviors that are still good candidates for real-Postgres integration tests.

Already covered:

- `messages`: create message -> owner comment notification + mention fanout.
- `notifications`: `markRead`, `markGroupRead`, `markAllRead`.
- `sius`: archive vote threshold path, soft-delete-with-child cleanup path.

This file intentionally does not try to cover every server function. The focus is:

- real `insert` / `update` / `delete` behavior
- multi-table side effects
- notification fanout
- authorization-sensitive write paths
- query correctness where SQL shape matters

## Highest Priority

### Notifications

- `src/lib/notifications/fns.ts` -> `listGroupedNotificationsServerFn`
  Cover grouping by `(type, entityType, entityId)`, unread-only filtering, `isRead`, latest-first ordering, actor deduping, and actor recency ordering.
- `src/lib/notifications/fns.ts` -> `listNotificationsServerFn`
  Cover cursor pagination, unread-only filtering, and user scoping.
- `src/lib/notifications/fns.ts` -> `getUnreadCountServerFn`
  Cover auth-optional behavior, unread-only counting, and per-user isolation.
- `src/lib/notifications/fns.ts` -> `deleteNotificationServerFn`
  Cover deleting only the current user's notification and leaving other users' rows untouched.

### Messages

- `src/lib/messages/fns.ts` -> `updateMessageServerFn`
  Cover "new mentions only" behavior, self-mention suppression, correct parent entity lookup for non-chat messages, and no duplicate notification when an existing mention remains in edited content.
- `src/lib/messages/fns.ts` -> `createMessageImpl`
  Add chat-specific coverage: chat mentions should use `entityType: "chat"` and `entityId: 0`, and chat messages should not create owner comment notifications.
- `src/lib/messages/fns.ts` -> `deleteMessageServerFn`
  Cover owner-only delete behavior and verify another user's message is untouched.

### SIUs

- `src/lib/games/sius/fns.ts` -> `voteToArchiveImpl`
  Add threshold-edge tests: `4 -> 5` notifies admins, `5 -> 6` does not re-notify, duplicate vote is rejected, and vote count is returned correctly.
- `src/lib/games/sius/fns.ts` -> `removeArchiveVoteServerFn`
  Cover deleting only the current user's vote and returning the updated count.
- `src/lib/games/sius/fns.ts` -> `archiveRoundServerFn`
  Cover active -> archived transition, `endedAt` population, unique participant notification fanout, and rejection when the round is already archived.
- `src/lib/games/sius/fns.ts` -> `createFirstSetServerFn`
  Cover one-first-set invariant, optional instruction-message creation, and transaction behavior around the advisory lock.
- `src/lib/games/sius/fns.ts` -> `addSetServerFn`
  Cover latest-set lookup, self-backup rejection, duplicate-child rejection, position incrementing, optional instructions, and follower notification side effects.
- `src/lib/games/sius/fns.ts` -> `deleteSiuSetImpl`
  Add hard-delete coverage for leaf sets and the "deleting the first/only set archives the round" branch.

### BIUs

- `src/lib/games/bius/fns.ts` -> `createFirstSetServerFn`
  Cover creating exactly one first set in an empty round and optional instruction-message creation.
- `src/lib/games/bius/fns.ts` -> `backUpSetServerFn`
  Cover latest-only continuation, self-backup rejection, duplicate-child rejection, position incrementing, optional instructions, and follower notifications.
- `src/lib/games/bius/fns.ts` -> `deleteSetServerFn`
  Add both branches explicitly: soft delete with engagement cleanup when a child exists, and hard delete when it does not.

## High Priority

### Posts, Reactions, and Follows

- `src/lib/posts/fns.ts` -> `createPostServerFn`
  Cover media-field persistence, follower notification fanout, mention notification fanout, and self-mention suppression.
- `src/lib/posts/fns.ts` -> `updatePostServerFn`
  Cover owner-only updates and "only newly added mentions get notified."
- `src/lib/posts/fns.ts` -> `deletePostServerFn`
  Cover owner-only delete behavior and expected DB cleanup for dependent rows.
- `src/lib/reactions/fns.ts` -> `likeRecordServerFn`
  Cover row insertion, owner-like notification creation for primary content, and self-like suppression.
- `src/lib/reactions/fns.ts` -> `unlikeRecordServerFn`
  Cover deleting only the acting user's like row.
- `src/lib/users/fns.ts` -> `followUserServerFn`
  Cover follow-row creation and follow notification delivery.
- `src/lib/users/fns.ts` -> `unfollowUserServerFn`
  Cover removing only the matching follow edge.

### Flags

- `src/lib/flags/fns.ts` -> `flagContentServerFn`
  Cover duplicate unresolved flag rejection, message-flag parent entity routing, and admin notification fanout.
- `src/lib/flags/fns.ts` -> `resolveFlagServerFn`
  Cover resolution persistence, single-resolution guard, and review notification delivery back to the original flagger.

### Trick Submissions and Videos

- `src/lib/tricks/submissions/fns.ts` -> `createSubmissionServerFn`
  Cover base submission row plus relationship-row inserts.
- `src/lib/tricks/submissions/fns.ts` -> `reviewSubmissionServerFn`
  Cover approved submissions creating a trick, copying element assignments, copying relationships, marking the submission reviewed, and notifying the submitter.
- `src/lib/tricks/videos/fns.ts` -> `submitVideoServerFn`
  Cover trick existence validation and pending-video creation.
- `src/lib/tricks/videos/fns.ts` -> `reviewVideoServerFn`
  Cover approve path sort-order assignment, active-video max enforcement, reject path, reviewed metadata, and submitter notification.
- `src/lib/tricks/videos/fns.ts` -> `reorderVideosServerFn`
  Cover active-only validation and exact persisted sort orders.
- `src/lib/tricks/videos/fns.ts` -> `demoteVideoServerFn`
  Cover active -> pending transition and sort-order reset.

## Medium Priority

### RIUs

- `src/lib/games/rius/fns.ts` -> `createRiuSetServerFn`
  Cover creating into the current upcoming RIU only and follower notifications.
- `src/lib/games/rius/fns.ts` -> `updateRiuSetServerFn`
  Cover owner-only updates and the "upcoming only" guard.
- `src/lib/games/rius/fns.ts` -> `deleteRiuSetServerFn`
  Cover owner-only delete behavior and the "upcoming only" guard.
- `src/lib/games/rius/fns.ts` -> `createRiuSubmissionServerFn`
  Cover active-round requirement, self-submission rejection, and successful submission persistence.
- `src/lib/games/rius/fns.ts` -> `deleteRiuSubmissionServerFn`
  Cover owner-only delete behavior.
- `src/lib/games/rius/fns.ts` -> `adminOnlyRotateRiusServerFn`
  Cover active -> archived, upcoming -> active, and creation of exactly one new upcoming RIU.
- `src/lib/games/rius/fns.ts` -> `listArchivedRiusServerFn`
  Cover aggregate set and submission counts against real joined data.

### Tricks

- `src/lib/tricks/fns.ts` -> `listTricksServerFn`
  Cover the cursor contract. The current query still looks suspicious because it filters with `eq(tricks.id, input.cursor)` instead of moving past the cursor.
- `src/lib/tricks/fns.ts` -> `createTrickServerFn`
  Cover base trick creation plus relationship, element-assignment, video, and composition inserts.
- `src/lib/tricks/fns.ts` -> `updateTrickServerFn`
  Cover replace semantics for relationships, elements, videos, and compositions.
- `src/lib/tricks/fns.ts` -> `deleteTrickServerFn`
  Cover dependent-row cleanup or FK behavior when deleting a trick with related records.

### Tournament server layer

- `src/lib/tourney/fns.ts` -> `prelimActionServerFn`, `rankingActionServerFn`, `bracketActionServerFn`, `advancePhaseServerFn`
  Cover auth gating, DB persistence of state, phase transitions, and stored `newPhase` values after machine events.
- `src/lib/tourney/fns.ts` -> update publishing path
  Cover that tournament updates and admin heartbeats publish the expected payloads after successful writes.

### User profile persistence

- `src/lib/users/fns.ts` -> `updateUserServerFn`
  Cover combined user/profile update behavior, `userLocations` upsert/delete branches, and `userSocials` upsert/delete branches.

### Notification settings

- `src/lib/notification-settings/fns.ts` -> `updateNotificationSettingsServerFn`
  Cover first-write insert and subsequent upsert/update behavior.
- `src/lib/notification-settings/fns.ts` -> `getNotificationSettingsServerFn`
  Cover default-return behavior when no settings row exists yet.

## Lower Priority or Better Covered Elsewhere

- `src/lib/auth/fns.ts`
  Most value here is validation, expiry, and session plumbing. Some of that may be better covered with a focused auth integration suite, not generic DB integration tests.
- `src/lib/location/fns.ts`
  External API wrappers; these are better covered with contract tests or mocks around the provider boundary.
- `src/lib/media/fns.ts`
  External provider integration; test the adapter boundary, not the database.
- `src/lib/presence/fns.ts`
  Very small write path; a unit or light integration test is enough if this starts regressing.
- `src/lib/stats/fns.ts`
  Worth testing eventually, but these are reporting queries rather than mutation-heavy business flows.
- `src/lib/session/fns.ts`
  Framework/session behavior is more valuable to verify through auth-focused integration tests.

## Suggested Next Batch

If we keep expanding the current integration layer, the next batch with the best risk-reduction per test is:

1. `messages.updateMessageServerFn`
2. `notifications.listGroupedNotificationsServerFn`
3. `sius.archiveRoundServerFn`
4. `sius.deleteSiuSetImpl` hard-delete branch
5. `bius.backUpSetServerFn`
6. `flags.flagContentServerFn`
7. `tricks.submissions.reviewSubmissionServerFn`
8. `tricks.videos.reviewVideoServerFn`
