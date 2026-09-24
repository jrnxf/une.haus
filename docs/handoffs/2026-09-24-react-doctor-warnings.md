# Handoff: react-doctor warning triage for une.haus

Written 2026-09-24. Lives in `docs/handoffs/`; update the status section as items land.

## Status update

All MUST FIX and SHOULD FIX items below were done in commit `b4dcb11` ("Fix the must and should react-doctor findings"). `bun doctor` is down from 179 to 138 warnings. One extra fix landed with the maplibre 6 bump: v6 resolves its web worker relative to its own module URL, which vite cannot serve in dev or emit in the build, so `map.tsx` imports the worker with `?worker&url` and hands it to `setWorkerUrl`. The remaining open work is the CONSIDER list.

## Context

- react-doctor 0.9.14 is wired into `bun preflight` as of commit `ea5385a` ("Add react-doctor to preflight and clear its error-level findings"). Config lives in `doctor.config.jsonc`. All error-level findings are fixed or suppressed with inline reasons in that commit; see its message and diff for what changed.
- `bun doctor` now reports 0 errors and 179 warnings. This document is a per-site assessment of those 179 warnings, done by reading the code behind every one, sorted into four tiers.
- Every finding was reviewed against realistic data sizes from the dev D1 snapshot: 568 tricks, 456 users, 1 admin, 34 trick elements, 355 trick relationships.
- `src/components/ui/*` and `src/components/reui/*` are vendored shadcn/reui code. Findings there default to don't-fix unless they cause a real defect in this app.

## How to reproduce

```bash
bun doctor --verbose          # full list with every site
bun doctor --json --json-out /tmp/rd.json
bun doctor why <file>:<line>  # rule explanation for one site
bun preflight                 # must stay green after any fix
```

Suppression syntax, when a finding is a confirmed false positive: a comment on the line above,
`// react-doctor-disable-next-line react-doctor/<rule> -- reason`. Prefer fixing over suppressing. Prefer a suppression over a config-wide `ignore.rules` entry.

## Project rules that shape the fixes

From `CLAUDE.md`, the ones that matter here:

- Avoid `useEffect`; prefer derived state, event handlers, or keying components. React 19.2 is installed, so `useEffectEvent` is available.
- Mutations: same-page changes use optimistic updates (`onMutate` / `onError` rollback / `onSettled` invalidate); navigate-away changes use `removeQueries` then `navigate`. Always take keys from `domain.x.queryOptions(...).queryKey`.
- Route loaders must `await` `ensure*` calls so SSR has data. Parallelize with `Promise.all`, never drop the await.
- Never mix component and non-component exports in one file (Vite Fast Refresh). Helpers go to `src/lib/`, hooks and contexts to a `-context.tsx` file.
- Copy is lowercase. No em dashes anywhere. Run `bun preflight` before committing. No agent attribution in commits.

---

## MUST FIX (3 items, 4 findings)

Real, user-visible today.

1. **`src/lib/games/rius/hooks.tsx:42` `useCreateSubmission` never updates the cache.**
   `CreateRiuSubmissionForm` renders inside `src/routes/games/rius/sets/$setId/index.tsx`, which displays `set.submissions` and its count from `games.rius.sets.get`. After a successful upload the page keeps the old list and count until a hard reload. The hook only toasts.
   Fix: same-page pattern. In `onSuccess`, `qc.invalidateQueries({ queryKey: games.rius.sets.get.queryOptions({ setId }).queryKey })` (the hook needs `setId`, pass it in like `useDeleteSet` does), or `setQueryData` to append the returned submission. Also drop `games.rius.submissions.list` if such a query exists.

2. **`src/components/input/image-input.tsx:101` blob URL minted every render, never revoked.**
   `URL.createObjectURL(file)` sits in the render body. Every re-render (upload progress ticks, status changes) creates a new object URL, pins another copy of the File for the document lifetime, and re-decodes the preview image, which is the flicker during upload. Two rules fire on this line (`no-create-object-url-in-render`, `no-create-object-url-without-revoke`).
   Fix: create the URL in `onDrop` where `file` is set, hold it in state next to the file, revoke the previous one on replace and on unmount. No `useEffect` needed for creation; a cleanup for revoke on unmount is acceptable.

3. **`src/components/reui/data-grid/data-grid-table.tsx:298` clickable rows unreachable by keyboard.**
   `<tr onClick={() => props.onRowClick(row.original)}>` with no `tabIndex`, role, or key handler. All three call sites navigate on row click and their cells contain no links: `src/routes/tricks/index.tsx:545`, `src/routes/metrics/users.tsx:212`, `src/components/stats/top-contributors.tsx:181`. A keyboard user cannot open a trick or a user from those tables at all.
   Fix (vendored file, so keep the patch minimal and comment it): when `onRowClick` is set, add `tabIndex={0}`, `role="button"` and an Enter/Space `onKeyDown`. Alternative that avoids touching vendored code: render the first cell as a `<Link>` at each call site.

## SHOULD FIX (20 items, 31 findings)

Real defects with limited blast radius, security hardening, or project-rule violations.

### Bugs

4. `src/components/input/mention-list.tsx:58-59`: `selectedIndex` resets to 0 in an effect after `items` change. Between the filter narrowing and the effect flush, the highlighted row and the index that Enter reads can disagree, inserting the wrong @mention. Two rules fire here. Fix: reset during render with a prev-items ref (pattern already used in `message-bubble.tsx:377` and `prelims.tsx:109`), or clamp `selectedIndex` to `items.length - 1` when deriving. Keying `MentionList` on the item id list also works.
5. `src/components/ui/map.tsx:73`: style JSON fetched from Carto CDN without an `ok` check. A 4xx/5xx body is parsed as a style and handed to MapLibre, and the `initMap()` rejection is unawaited, so the globe silently never renders. Fix: throw on `!response.ok` and fall back to the untransformed style URL.
6. `src/lib/games/rius/fns.ts:508`, `src/lib/presence/ops.server.ts:71`, `src/lib/tricks/fns.ts:330`: sequential independent awaits on SSR-blocking server functions. Fix: `Promise.all` for the independent pair at each site (in presence, keep the delete first, parallelize the two reads).
7. `src/routes/games/rius/_browse/archived/$riuId.tsx:25` and `src/routes/games/sius/_browse/archived/$roundId.tsx:10`: loader awaits `archived.list` then `archived.get` in series. Fix: `const [, item] = await Promise.all([ensureQueryData(list), ensureQueryData(get)])`, keep both awaited, then `invariant` on the resolved item.

### Performance

8. `src/lib/tasks/game-start-reminders.server.ts:101`: per user, one D1 `emailRemindersSent.findFirst` plus one Resend HTTP call, sequentially, over up to the whole user table per cron tick. Fix: hoist the dedupe into a single `inArray` query, then send in bounded `Promise.all` chunks (respect Resend rate limits).
9. `src/lib/games/sius/ops.server.ts:294`: notifies every participant of an archived round sequentially at 2 queries each. Fix: `Promise.all(participantIds.map(createNotification))`.
10. `src/lib/tricks/submissions/ops.server.ts:279`: inserts added relationships one row at a time; the multi-row insert form is already used at line 246. Fix: `db.insert(trickRelationships).values(added.map(...))`.
11. `src/components/input/trick-selector.tsx:37`: `excludeIds = []` default creates a new array each render, which re-runs the 568-trick filter memo at line 55 and churns the `tricks.search.queryOptions({ excludeIds })` input. Fix: module-level `const EMPTY_IDS: number[] = []`. This also clears both `js-set-map-lookups` hits at line 59. While there, memoize `selectedIds` (line 53) as a `Set`.
12. `src/routes/vault/$videoId/edit.tsx:73`: `useState(video.riders.map(... generateOrderId()))` runs the map and burns ids on every render. Fix: `useState(() => ...)`.
13. `src/components/arcade/arcade.tsx:41`: `useRef(createInitialState(...))` builds a ~20-field object every render and discards it. Fix: lazy init (`useState(() => ...)[0]` or null ref with first-render assignment).
14. `src/components/messages/message-bubble.tsx:183`: `transition-all` on every bubble in a long list when only background color changes. Fix: `transition-colors`.
15. `src/routes/vault/history.tsx:4`: full `framer-motion` import for one `motion.button` `whileTap` scale. This is the only framer-motion usage in `src/`. Fix: CSS `active:scale-[0.92] transition-transform motion-reduce:transform-none` and remove the dependency (`bun remove framer-motion`), or `LazyMotion` + `m` if you want to keep it. Removing also deletes the `useReducedMotion` call added in `ea5385a`.

### Security

16. `.github/workflows/ci.yml:41`: workflow-level `env:` puts every app secret in scope of both jobs, and `CLOUDFLARE_API_TOKEN` is live during `bun install` and `bun run build` in the deploy job. Neither install passes `--ignore-scripts`; no `trustedDependencies` in `package.json`, so Bun's default-trusted allowlist still runs lifecycle scripts with the full secret env. Not exploitable today (fork PRs get no secrets), but one bad dependency exposes everything. Fix: drop the workflow-level `env`, pass each secret only on the step that needs it, add `--ignore-scripts` to both `bun install` lines (verify nothing needed relies on a postinstall; `patches/` are applied by bun itself, not by scripts).
17. `package.json` `maplibre-gl@^5.17.0`: `bun audit` names GHSA-jrc7-96c5-q579, critical XSS sanitizer bypass in `DOM.sanitize()`, vulnerable through 6.4.0, patched in 6.4.1. No 5.x fix exists (5.24.0 is the last 5.x). Reachability is thin: the only consumer is `src/components/user-globe.tsx`, popups use `setDOMContent` + a React portal (no `setHTML`), so the sanitizer only sees attribution HTML from the Carto style JSON. Fix: bump to `^6.11.1`. v6 is ESM-only and drops the default export, so `src/components/ui/map.tsx:2` becomes `import * as MapLibreGL from "maplibre-gl"`. APIs used (`Map`, `Popup`, `setStyle({ diff: false })`, `addSource` / `addLayer` / `getSource as GeoJSONSource`, `easeTo` / `flyTo`, `MapGeoJSONFeature`) survive. Smoke test the globe page (`src/views/map.tsx`) in the browser after: load, theme switch, cluster click, popup open/close.

### Maintainability (project-rule violations and true duplication)

18. Fast Refresh violations (helpers exported beside components). Move each pure helper to `src/lib/` or a sibling non-component file:
    - `src/components/filters/filters.tsx:566-571`: `addFilterByField`, `countSelected`, `getFieldsSortedByActive`, `toggleFilterByField`, `toggleFilterValue` to `src/components/filters/filter-utils.ts`. Update `filters.unit.test.ts` imports. Highest value: largest component file in the app and the one the documented filtering pattern touches.
    - `src/components/confirm-dialog.tsx:13`: `confirm` + `internalHandle` to `confirm-dialog-handle.ts`.
    - `src/components/notifications/notification-item.tsx:90`: `formatActorNames` to `src/lib/notifications/format.ts`.
    - `src/components/rich-text.tsx:18`: `resolveMentionMode` to `src/lib/mentions/`.
    - `src/components/video-player.tsx:6`: `getMuxPoster` to `src/lib/mux/poster.ts` (it is imported by several routes already).
19. `src/routes/games/{bius,sius,rius}/route.tsx` (`bius:55`, `sius:64`, `rius:71`): `GameDropdown` is byte-identical in three files. Fix: `src/components/games/game-dropdown.tsx`.
20. `src/routes/metrics/users.tsx:209` and `src/routes/tricks/index.tsx:559`: ~55-line identical `DataGridTableBase` head/body + virtual-padding scaffold. Fix: `<VirtualizedDataGridTable table rows virtualizer />`.
21. `src/routes/tourney/index.tsx:89` and `src/routes/tourney/join.tsx:52`: identical `Field > InputOTP` 4-slot join block including the long class string. Fix: `<TourneyCodeField value onChange onComplete disabled />`.
22. `emails/auth/auth-code.tsx` is a hand-copied, already-drifted duplicate of `emails/auth-code.tsx` (`code = "000000"` default, extra `PreviewProps`). Every sibling preview imports the real template. Fix: make it `<AuthCodeTemplate code="123456" />` like `emails/feedback/*` and `emails/notification-digest/*`.
23. `src/components/input/trick-selector.tsx:130`: `TrickSelector` and `ElementSelector` repeat the whole `ResponsiveCombobox > Command > virtualized CommandList` block. Fix: `<VirtualizedCommandCombobox>`.

## CONSIDER (about 40 findings)

Legitimate but low impact or subjective. Do these when touching the file anyway.

### Cache freshness (all within a 30s `staleTime`, admin-only or rarely observed)

- `src/lib/flags/hooks.ts:7`: `removeQueries` on `flagsDomain.list` in `onSuccess`; only an admin flagging then visiting `/admin` within 30s sees stale data.
- `src/routes/_authed/tricks/$trickId/suggest.tsx:88`, `src/routes/_authed/vault/$videoId/suggest.tsx:96`, `src/routes/_authed/tricks/create.tsx:36`: `removeQueries` on the pending admin queue before navigating. The sibling admin-path mutation in `create.tsx` already does this; mirror it.
- `src/routes/arcade.tsx:22`: `setQueryData(arcade.highScore.get.queryOptions().queryKey, score)` in `onSuccess` so returning to `/arcade` within 30s does not seed the old high score.

### Ref writes during render (`no-ref-current-in-render`, downgraded to warn in `doctor.config.jsonc`)

- `src/components/ui/map.tsx:455` `MapPopup`: mutates a live MapLibre popup (`setLngLat` / `setOffset` / `setMaxWidth`) during render, then stores options in a ref. A discarded render moves a popup that never commits. Fix: move the comparison and imperative calls into a `useEffect` keyed on `[longitude, latitude, popupOptions.offset, popupOptions.maxWidth]`. This is the one imperative-side-effect-in-render site; the rest are the latest-ref idiom.
- `src/hooks/use-peripherals.ts:31`: clearing `pendingCloseRef` during render can re-arm the double-`history.back()` guard from a thrown-away render. Fix: clear it in an effect on `open` transitioning to false.
- `src/components/arcade/arcade.tsx:40`: latest-ref for `onHighScore` read from the rAF loop; `useEffectEvent` expresses it directly.
- The other 14 (mention-textarea x4, split-timer, map.tsx x4, tourney/hooks x2, bracket, prelims, message-bubble): latest-ref for library callbacks or the sanctioned adjust-on-prop-change pattern. Leave them. If the warning noise bothers you, add an `ignore.overrides` entry for those files rather than suppressing 14 lines.

### Effects that could use `useEffectEvent` (latent, no churn today because every caller memoizes)

- `src/components/arcade/arcade.tsx:232`, `src/components/ui/map.tsx:855-856`.

### Small loops and formatters

- `src/lib/flags/ops.server.ts:95`, `src/lib/games/sius/ops.server.ts:214`: admin-notify loops, N=1 admin today; `Promise.all` if admins grow.
- `src/lib/tricks/submissions/ops.server.ts:265`: one-row-at-a-time deletes, N<5, admin path; collapse to `delete ... inArray`.
- `src/components/ui/relative-time-card.tsx:223`: `useMemo` the `Intl.DateTimeFormat` on `locale`; only runs while a hover card is open. Vendored.
- `src/lib/tricks/compute.ts:78`: the rule flagged String.includes (false positive) but the `new RegExp` built inside the loop is the real minor waste; hoist into `PROGRESSION_ORDER` if this ever runs over all tricks server-side.
- `src/components/tourney/bracket-graph.tsx:160`: `transition-all` is intentional (width animates); optionally narrow to `transition-[width,border-color]`.

### Context values

- `src/components/filters/filters.tsx:530` `value={{ size }}` wraps the deep chip bar; `src/components/tray.tsx:45` is instantiated per message bubble; `src/components/ui/form.tsx:95` is project-authored with 9 members read by every field. One-line `useMemo` each.
- `src/components/mobile-nav.tsx:89`: `useCallback` the opener.

### Component size and complexity (natural seams exist, no defect)

- `src/components/command-palette.tsx:97` (~628 lines): lift the 185-line `commandItems` into `useCommandItems()`, extract `<CommandPaletteFooter>` and `<RootPage>`, route `activePage` through a component map.
- `src/components/forms/trick.tsx:41` (~403 lines): one component per `FieldSet`, each taking `control`.
- `src/components/forms/user.tsx:31` and `:146` (~301 lines): `useUserFormSubmit()` plus `<SocialField name label />` mapped over the six identical socials fields.
- `src/components/tourney/split-timer.tsx:33` (~331 lines): `handlePlayPause` is an 8-branch state machine; extract `useSplitTimer(initialSeconds)`.
- `src/routes/_authed/admin/tricks/$trickId/videos.tsx:56` (~504 lines): `useTrickVideoMutations()` plus `<ActiveVideoCard>` and `<RejectedVideoCard>` (`PendingVideoCard` already exists).
- `src/routes/_authed/notifications/settings.tsx:88` (~424 lines): one component per `Card` (in-app, email digest, game reminders).
- `src/routes/_authed/tourney/$code/prelims.tsx:59` and `:383`: `<PrelimRiderRow status rider onAction />`; `usePrelimTimerControls(code, prelimAction)`.
- `src/routes/tricks/index.tsx:163` (~454 lines): `useTricksFilters()` and `<TricksDataGrid>`.
- `src/routes/games/bius/sets/$setId/index.tsx:86`: extract `<DeletedSetView set />` for the 60-line alternate branch.
- `src/routes/games/sius/_browse.tsx:49`: 4-way nested ternary; extract `<SiuUploadButton round latestSet />`.
- `src/routes/tourney/$code/live.tsx:139` and `:398`: promote `roster` / `timer` JSX consts to `<PrelimsRoster>` / `<PrelimsTimer>`; `resolveSides(state)` plus `<TimerSide />` for the mirrored battle timer.
- `src/components/tourney/bracket-graph.tsx:73`: `<MatchPlayerRow />` for the two ~50-line mirrored player blocks.
- `src/components/stats/stat-card.tsx:21`: replace the six repeated `isCompact` / `isResponsive` ternaries with a `cva` `size` variant (also aligns with the design-system lint).
- `src/components/input/rider-selector.tsx:30`: pure `resolveRiderEntry(query, users, value)`.
- `src/components/ui/form.tsx:170` `FormUploadStatus` (project-authored): extract `usePresence(isOpen, 200)`.
- `src/routes/_authed/tricks/$trickId/suggest.tsx:66`: pure `buildTrickSuggestionDiff(trick, values)`.
- `src/routes/tricks/$trickId.tsx:65`: pull the inline history IIFE into `<TrickHistorySection />`.
- `src/routes/games/{bius,sius,rius}/_browse.tsx` "how to play" `Tray` shells: `<GameInfoTray>{copy}</GameInfoTray>`, copy stays per game.

### Accessibility

- `src/components/logo-animated.tsx:107`: decorative svg with an easter-egg `onClick`; the toast it opens has a real focusable link. Optionally `aria-hidden` on the svg.

### Keys

- `src/routes/tourney/$code/live.tsx:192`: index key on a drag-reorderable rider list; every cell derives from the same index so no stale data, only DOM reuse. Key on a rider id if the prelims model gains one.
- `src/components/reui/data-grid/data-grid-table.tsx:514`: dead inner `key={index}` inside `<Fragment key={row.id}>`; drop it if you ever patch the vendored file.

## DON'T FIX (about 105 findings)

Confirmed false positives, intentional patterns, or vendored code. Listed so nobody re-litigates them. Optional: add `ignore.overrides` entries in `doctor.config.jsonc` for the confirmed false positives (gelato, accordion, tourney loading flags, vendored `ui/` and `reui/` dirs for the maintainability rules) to bring the warning count down.

### Security

- `src/lib/stats/ops.server.ts:108` `sql.raw`: interpolates only module-level constant SELECT strings and a literal `limit` (5 or undefined). No request value reaches it. Re-check if `limit` ever becomes a search param.
- `src/testing/integration.ts:43` `sql.raw` over table names from `sqlite_master`, test-only, guarded to an ephemeral DB.
- `src/routes/index.tsx:87` `dangerouslySetInnerHTML` JSON-LD: `jsonLd` is a module constant built from `SITE_URL` and `SITE_NAME` only. No user data.
- `next@16.0.10` CVE: only present as a transitive dev dependency of `@react-email/preview-server`, a peer of `geist`, and an optional peer of `nuqs`. Nothing in `src/` imports `next`; `geist` itself is never imported (fonts come from `@fontsource-variable/geist*`). Optional cleanup: `bun remove geist` and drop it from `knip.json` `ignoreDependencies`, which also removes the finding.
- Adjacent, not a finding: `src/views/messages.tsx:149` string-builds an inline `<script>` from `scrollTargetId`. All four callers pass the literal `"main-content"`. Safe today; the one sink that could become injectable if that ever takes a variable.

### Accessibility

- `src/components/forms/message.tsx:71`: form `onClick` only redirects stray padding clicks to `focusEditor()`; editor and buttons are already tabbable.
- `src/components/ui/breadcrumb.tsx:71`: `BreadcrumbPage` upstream shadcn `<span role="link" aria-disabled aria-current="page">`, deliberately not an anchor.
- `src/components/ui/relative-time-card.tsx:231`: `role="list"` / `role="listitem"` are correct; only the tag preference is flagged. Vendored.

### Bugs

- `no-array-index-as-key` x8: `emails/notification-digest.tsx:62` (static email HTML), `src/components/command-palette.tsx:452` (shortcut string fragments), `src/components/page-header.tsx:51` (`Children.toArray` crumbs, positional by definition), `src/components/reui/data-grid/data-grid-table.tsx:433,438` (vendored, static header cells), `src/components/ui/field.tsx:183` (vendored, error list regenerated wholesale), `src/components/ui/metaline.tsx:40` (positional separators), `src/routes/tricks/index.tsx:101` (split trick name spans). None holds per-item state.
- `no-fetch-in-effect` `src/components/ui/map.tsx:114,171`: fetching a MapLibre style JSON for an imperative map instance, cancellation-guarded, cleaned up by `map.remove()`. Not app data; react-query has no role.
- `no-fetch-response-used-without-status-check` `src/lib/clients/gelato.ts:78`: false positive, `if (!response.ok) throw new GelatoError` at line 92 precedes body use. `src/components/input/image-input.tsx:65`: body is Zod-parsed immediately, so a Cloudflare error payload fails into the existing catch (cosmetic: check `ok` to surface the Cloudflare error text).
- `no-initialize-state` / `rendering-hydration-no-flicker` `src/components/ui/accordion.tsx:91-92`: the mount effect deliberately suppresses the height transition on hydration; `useState(true)` would reintroduce the flash. The one place `useEffect` is the correct tool.
- `no-loading-flag-reset-outside-finally` x3 (`src/lib/media/hooks.ts:135`, `src/routes/tourney/index.tsx:74`, `src/routes/tourney/join.tsx:34`): inverted matches. The reset is in `catch`; the success path either resets in its own `finally` or navigates away with the spinner intentionally kept up.
- `no-pass-data-to-parent` / `no-pass-live-state-to-parent` / `no-prop-callback-in-effect` `src/components/ui/carousel.tsx:93`: one vendored line counted three times; the `setApi` effect is the upstream API and no consumer in this repo passes `setApi`.
- `query-mutation-missing-invalidation` x7 RPC-style mutations with nothing cached: `src/components/input/image-input.tsx:34` (upload ticket), `src/components/input/location-selector.tsx:42,46` (city search, place lookup), `src/lib/media/hooks.ts:59,63` (Mux poll, presigned URL), `src/routes/_authed/feedback.tsx:53` (write-only), `src/routes/auth/index.tsx:35` (send login code; session reset happens at verify).
- `no-ref-current-in-render` x14 latest-ref and adjust-on-prop-change sites listed under CONSIDER above.

### Performance

- `js-set-map-lookups` x14: six are `String.prototype.includes` false positives (`game-video-picker.tsx:43`, `compute.ts:77`, `land.tsx:126`, `tricks/index.tsx:370,371`, and one more in `filters.tsx`); the rest iterate lists of at most 34 items (badges, filter options, discipline enum, virtualized rows).
- `js-index-maps` x2: `use-filtered-list.ts:141` (N = filter count, at most 4), `bracket-logic.ts:252` (guarded, runs at most twice per recompute).
- `jsx-no-constructed-context-values` x8 vendored: `data-grid.tsx:86` (spreads `...props`, already unstable), `timeline.tsx:69`, `avatar.tsx:36` (value carries state that should re-render consumers), `carousel.tsx:110`, `chart.tsx:52`, `form.tsx:370,418` (per-field, single consumer), `sortable.tsx:215` (dnd-kit `listeners` is new each render anyway).
- `prefer-dynamic-import` x3: recharts is imported only by `activity-chart.tsx`, `discipline-chart.tsx`, `ui/chart.tsx`, all reachable only from `/metrics`, which TanStack Start code-splits per route. `React.lazy` adds a loading state for no entry-bundle gain. Optionally confirm with `bun bundle:info` that recharts is absent from the entry chunk.
- `rerender-lazy-ref-init` `src/lib/tourney/use-tourney-sse.ts:13`: discarded value is one `Date.now()`.
- `rerender-lazy-state-init` `src/routes/tricks/index.tsx:184`: `normalizeMultiOperator` is three string comparisons.
- `rerender-memo-before-early-return` `src/components/ui/chart.tsx:130`: vendored, verbatim upstream, renders only while a tooltip is hovered.

### Maintainability

- `duplicate-jsx-subtree` x7 shadcn `FormField > FormItem > FormLabel > FormControl > FormMessage` boilerplate with different fields: `src/components/forms/games/bius.tsx:81`, `src/routes/_authed/posts/$postId/edit.tsx:162,176,193`, `src/routes/_authed/tricks/glossary/elements/$elementId/suggest.tsx:169,192`. That shape is the shadcn Form contract.
- `duplicate-jsx-subtree` `src/components/no-results-empty.tsx:13`: this is the extracted component; its twin `not-found.tsx` has a different message and CTA.
- `no-giant-component` `src/routes/_authed/admin/sandbox.tsx:127`: 788-line dev-only component gallery, ~20 independent demo cards with no shared state; splitting adds indirection for nothing.
- `no-giant-component` / `no-high-complexity` `src/components/reui/data-grid/data-grid-column-header.tsx:46`, `data-grid-table.tsx:117,344`: vendored reui.
- `only-export-components` `src/components/ui/badge.tsx:38` `badgeVariants`, `src/components/ui/button.tsx:88` `buttonVariants`: upstream shadcn cva exports, files effectively frozen. `emails/auth/auth-code.tsx:3` `PreviewProps`: react-email preview convention, not in the Vite app graph.

---

## Suggested order of work

1. MUST FIX 1 and 2 together (one PR, both are same-page cache/render fixes with a browser check on the rius set page and the image upload flow).
2. MUST FIX 3 plus SHOULD FIX 4 and 5 (user-facing correctness).
3. SHOULD FIX 6 and 7 (loader and server-fn `Promise.all`, mechanical, verify SSR still hydrates without a loading flash).
4. SHOULD FIX 8 to 15 (performance, each a few lines; 15 removes a dependency).
5. SHOULD FIX 16 and 17 (CI secrets scope, maplibre 6). Do 17 on its own branch with a manual globe smoke test.
6. SHOULD FIX 18 (Fast Refresh helper moves), then 19 to 23 (extractions), each its own small commit.

After each batch: `bun preflight`, then `bun doctor --verbose` to confirm the count dropped and nothing new fired.

## Suggested skills

- `diagnosing-bugs` for MUST FIX 1 and 2: reproduce in the browser first (upload a rius submission, watch the count; upload an image, watch the network/memory panel), then fix.
- `tdd` for MUST FIX 3 and SHOULD FIX 4: add a keyboard-interaction test for the data grid row and a unit test for the mention index clamp before changing code.
- `simplify` after the maintainability extractions (19 to 23) to catch leftover duplication.
- `code-review` on each batch before pushing.
- `security-review` for SHOULD FIX 16 and 17.
- `run` to launch the app for the globe smoke test after the maplibre bump.
- `no-mistakes` if you want the lint / test / docs / push pipeline gated for you.

## Gotchas

- `doctor.config.jsonc` sets `adoptExistingLintConfig: false` so oxlint stays the owner of the shadcn / react / unicorn rules. Do not re-enable it; it double-reports ~280 shadcn warnings.
- The supply-chain check hits Socket.dev over the network. It is set to warning severity so offline preflight cannot fail on it.
- `git worktree prune` is overdue: `.claude/worktrees/agent-a1b0f6767aa07add1` is listed as prunable and was being scanned before the `.claude/**` ignore was added.
- Unit tests live in `*.unit.test.ts`, integration tests in `*.integration.test.ts` (30 files, ops layer). No test currently exercises the server function wrappers end to end.
