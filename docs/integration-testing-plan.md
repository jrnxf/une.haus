# Integration Testing Plan

This plan turns the backlog in `integration-testing-todos.md` into an execution order that matches the current harness in `docs/testing.md` and the suites already in `src/test/integration/`.

## Objectives

- Keep assertions at the integration layer when they depend on real Postgres behavior, persisted state, or notification fanout.
- Expand coverage by domain in a way that reuses fixtures and avoids constant harness churn.
- Extract stable implementation seams before writing tests for server functions that are still buried inside `createServerFn(...).handler(async ...)`.

## Constraints From The Current Harness

- Integration tests already have a working runner, DB truncation, and basic user/video seed helpers.
- Existing coverage is concentrated in `messages`, `notifications`, and `sius`.
- The cheapest next work is to extend those suites first, then branch into adjacent domains that share the same notification and ownership patterns.
- Many backlog targets do not yet expose an exported `*Impl` seam, which means testability work should be planned as part of the first pass for each domain.

## Phase 0: Testability Prep

Do this once before expanding broadly:

- Standardize the handler seam pattern for backlog functions that still use inline handlers.
- Add shared seed helpers for the domains that recur across suites: posts, follows, likes, flags, trick records, trick submissions, trick videos, BIU rounds, RIU rounds, and notification rows.
- Add small assertion helpers for common patterns:
  - unread vs read notification rows
  - per-user row isolation
  - latest-only continuation checks for set-based games
  - mention fanout without self-notify or duplicate notify
- Keep the helpers minimal. Prefer composable seed functions over large scenario builders.

First extraction targets:

- `src/lib/posts/fns.ts`
- `src/lib/reactions/fns.ts`
- `src/lib/users/fns.ts`
- `src/lib/flags/fns.ts`
- `src/lib/tricks/submissions/fns.ts`
- `src/lib/tricks/videos/fns.ts`
- `src/lib/games/bius/fns.ts`
- `src/lib/games/rius/fns.ts`
- `src/lib/tricks/fns.ts`
- `src/lib/tourney/fns.ts`
- `src/lib/notification-settings/fns.ts`

## Phase 1: Finish The Existing Domains

Reason: these have the lowest setup cost because the harness, fixtures, and mental model are already in place.

Targets:

- `messages.updateMessageServerFn`
- `messages.createMessageImpl` chat-specific path
- `messages.deleteMessageServerFn`
- `notifications.listGroupedNotificationsServerFn`
- `notifications.listNotificationsServerFn`
- `notifications.getUnreadCountServerFn`
- `notifications.deleteNotificationServerFn`
- `sius.voteToArchiveImpl` threshold-edge cases
- `sius.removeArchiveVoteServerFn`
- `sius.archiveRoundServerFn`
- `sius.createFirstSetServerFn`
- `sius.addSetServerFn`
- `sius.deleteSiuSetImpl` hard-delete branch
- `bius.createFirstSetServerFn`
- `bius.backUpSetServerFn`
- `bius.deleteSetServerFn`

Deliverables:

- Expand `messages.integration.ts`, `notifications.integration.ts`, and `sius.integration.ts`.
- Add `bius.integration.ts`.
- Keep one behavior per test and assert persisted rows directly.

Exit criteria:

- All notification list/delete variants have cursor, grouping, unread, and per-user isolation coverage.
- Messages cover mention delta logic, owner-only deletion, and chat-specific notification rules.
- SIU and BIU suites cover both continuation and deletion branches, plus the archive threshold edges.

## Phase 2: Social Graph And Moderation

Reason: these features share the same primitives as Phase 1: ownership checks, notification fanout, and row-level isolation.

Targets:

- `posts.createPostServerFn`
- `posts.updatePostServerFn`
- `posts.deletePostServerFn`
- `reactions.likeRecordServerFn`
- `reactions.unlikeRecordServerFn`
- `users.followUserServerFn`
- `users.unfollowUserServerFn`
- `flags.flagContentServerFn`
- `flags.resolveFlagServerFn`

Deliverables:

- Add `posts.integration.ts`, `reactions.integration.ts`, `users.integration.ts`, and `flags.integration.ts`.
- Reuse shared follow, notification, and mention helpers from Phase 0.

Exit criteria:

- Posts prove media persistence, follower fanout, mention fanout, and owner-only mutation behavior.
- Reactions and follows prove single-actor row insertion/deletion and self-notification suppression.
- Flags prove duplicate unresolved rejection, parent routing, resolution guards, and review notifications.

## Phase 3: Submission And Review Pipelines

Reason: trick submissions and trick videos have dense multi-table side effects, which makes them good integration-test territory once helper coverage exists.

Targets:

- `tricks.submissions.createSubmissionServerFn`
- `tricks.submissions.reviewSubmissionServerFn`
- `tricks.videos.submitVideoServerFn`
- `tricks.videos.reviewVideoServerFn`
- `tricks.videos.reorderVideosServerFn`
- `tricks.videos.demoteVideoServerFn`

Deliverables:

- Add `trick-submissions.integration.ts`.
- Add `trick-videos.integration.ts`.
- Add fixture helpers for trick graphs, relationships, compositions, and active/pending video states.

Exit criteria:

- Submission review covers trick creation, relationship copying, assignment copying, review state, and submitter notifications.
- Video review covers approve/reject branches, max-active enforcement, sort ordering, and demotion behavior.

## Phase 4: Remaining Mutation-Heavy Domains

Reason: these still benefit from real Postgres coverage, but they need more domain-specific setup than the earlier phases.

Targets:

- `rius.createRiuSetServerFn`
- `rius.updateRiuSetServerFn`
- `rius.deleteRiuSetServerFn`
- `rius.createRiuSubmissionServerFn`
- `rius.deleteRiuSubmissionServerFn`
- `rius.adminOnlyRotateRiusServerFn`
- `rius.listArchivedRiusServerFn`
- `tricks.createTrickServerFn`
- `tricks.updateTrickServerFn`
- `tricks.deleteTrickServerFn`
- `users.updateUserServerFn`
- `notification-settings.updateNotificationSettingsServerFn`
- `notification-settings.getNotificationSettingsServerFn`

Deliverables:

- Add `rius.integration.ts`.
- Add `tricks.integration.ts`.
- Add `users-profile.integration.ts` or fold the profile cases into `users.integration.ts`.
- Add `notification-settings.integration.ts`.

Exit criteria:

- RIU coverage proves upcoming/active guards, owner-only mutation paths, rotate behavior, and real aggregate counts for archived rounds.
- Trick CRUD proves relationship replacement semantics and dependent-row cleanup.
- User/profile and notification settings suites prove upsert and delete branches, not just happy paths.

## Phase 5: Tournament And Query Correctness Checks

Reason: these cases are lower-volume but high-value because they depend on state-machine persistence, phase transitions, or suspicious query shape.

Targets:

- `tourney.prelimActionServerFn`
- `tourney.rankingActionServerFn`
- `tourney.bracketActionServerFn`
- `tourney.advancePhaseServerFn`
- tournament update publishing path
- `tricks.listTricksServerFn` cursor contract

Deliverables:

- Add `tourney.integration.ts`.
- Add focused query-behavior tests for cursor handling and publish-side effects.

Exit criteria:

- Tournament suites prove auth gating, persisted machine state, phase transitions, and `newPhase` writes after events.
- Trick listing proves the actual cursor contract against real rows and catches the current suspicious filter behavior.

## Per-Suite Workflow

For each backlog item:

1. Extract or reuse an exported implementation seam.
2. Add the smallest seed helpers needed for that domain.
3. Write one happy-path persistence test.
4. Write one isolation or authorization test.
5. Write one branch or edge-case test from the backlog item.
6. Run the targeted suite, then `bun run test:integration`.

## Definition Of Done

A backlog item is complete when:

- The test calls the exported implementation seam, not framework async-local plumbing.
- It uses the real Postgres runner and existing truncation model.
- It asserts persisted rows or returned counts, not just return payload shape.
- It proves user scoping, duplicate suppression, or branch behavior where relevant.
- It leaves the suite readable enough that the next test in the same domain can reuse the setup.

## Recommended Order Inside The Next Batch

If this work starts immediately, the first seven items should be:

1. `messages.updateMessageServerFn`
2. `notifications.listGroupedNotificationsServerFn`
3. `notifications.listNotificationsServerFn`
4. `sius.archiveRoundServerFn`
5. `sius.deleteSiuSetImpl` hard-delete branch
6. `bius.backUpSetServerFn`
7. `flags.flagContentServerFn`

That order keeps the early work close to existing fixtures, exercises the highest-risk SQL and notification paths first, and forces the first round of seam extraction before the larger content-review domains.
