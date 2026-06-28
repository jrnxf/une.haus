# Chat & Base UI upgrade — subagent handoff plan

Implements the Base UI version upgrade + adoption of shadcn's June 2026 chat
primitives. Each **Work Unit (WU)** is independently executable by a subagent.
Read **Ground rules** first — they are non-negotiable and apply to every WU.

## Ground rules (apply to all WUs)

- All work happens in `apps/web/`. Paths below are relative to it unless noted.
- Conform to `CLAUDE.md` and `~/.claude/CLAUDE.md`:
  - `type` not `interface`; no `useEffect` (prefer derived state / event handlers / keying); no non-null assertions (`!`); `Boolean(x)` not `!!x`.
  - All user-facing copy is **lowercase**.
  - No barrel files in `src/components/`; direct imports only.
  - Spacing: standard gaps only (`gap-1/2/3/4/6`, `space-y-1/2/3/4/6`); no `gap-5/7`, no fractional gaps.
  - Base UI popups use `border`, never `ring`, for outlines.
  - Update any `docs/` that the change touches.
  - Do not add a Claude co-author trailer to commits.
- **Each WU ends green:** run `bun preflight` (lint + format + typecheck + tests, from repo root) and fix everything before declaring done.
- One WU = one branch + one PR. Branch off `main`. Put the WU id in the branch name (e.g. `chat-ui/wu-1-otp-field`).
- `package.json` is edited by WU-0 and WU-1 only. If both run in parallel, WU-1 rebases on WU-0 before touching `package.json` to avoid a conflict.

## Dependency graph / sequencing

```
WU-0 (Base UI bump) ──┬─> WU-6 (Base UI new parts)
                      └─> (no other hard dep, but land first)
WU-1 (OTP Field) ........ independent (coordinate package.json with WU-0)
WU-2 (MessageScroller spike) ──> WU-3 (MessagesView rewrite) ──┬─> WU-4 (Bubble shell)
                                                               └─> WU-5 (Marker dividers)
```

- **Wave 1 (parallel):** WU-0, WU-1, WU-2.
- **Wave 2:** WU-3 (needs WU-2 result), WU-6 (needs WU-0).
- **Wave 3 (parallel):** WU-4, WU-5 (both need WU-3).

## Context the subagents need

- Chat render chain: `routes/chat/index.tsx` → `views/chat-messages.tsx` → **`views/messages.tsx`** (the scroll logic) → `components/messages/message-bubble.tsx`.
- `MessagesView` (`views/messages.tsx`) is shared by: `views/chat-messages.tsx`, `views/post.tsx` (posts + game sets), `routes/vault/$videoId/index.tsx`, `routes/games/rius/submissions/$submissionId/index.tsx`. Any change must keep all consumers working.
- Messages are **text-only** (`content: text`; no image/attachment column). Presence exists; there is no typing indicator.
- shadcn chat components are new (2026-06); they pull in `@shadcn/react` and the shadcn registry. The project uses `components.json` with `style: base-vega` and a `@reui` registry. Registry/style compatibility is unproven → that is WU-2's job.

---

## WU-0 — Bump Base UI 1.3.0 → 1.6.0

**Objective:** upgrade `@base-ui/react` to `1.6.0` (latest). Pure dependency bump; picks up popup mount/unmount perf (up to 50%/85%) and focus/nested-popup fixes.

**Files:** `apps/web/package.json`, lockfile.

**Steps:**

1. Set `@base-ui/react` to `^1.6.0`; run `bun install`.
2. Review the 1.4 → 1.6 changelog for breaking changes affecting wrapped primitives. The only breaking item in range is the OTP Field preview→stable rename, which the project does not use yet (it uses the `input-otp` lib) — so no code change expected.
3. Smoke-test the 19 wrapped primitives in `src/components/ui/` for type/visual regressions (accordion, alert-dialog, button, checkbox, collapsible, dialog, drawer, dropdown-menu, hover-card, popover, progress, radio-group, scroll-area, select, separator, tabs, tooltip, command).

**Acceptance:** `bun preflight` green; app boots; no Base UI type errors.

**Risk:** low. Regression surface = all popups. Mitigated by preflight + manual smoke test of a dropdown, a select, the command palette, and a drawer.

---

## WU-1 — Adopt Base UI OTP Field, drop `input-otp`

**Objective:** reimplement `src/components/ui/input-otp.tsx` on `@base-ui/react/otp-field` and remove the third-party `input-otp` dependency, **keeping the public exports identical** (`InputOTP`, `InputOTPGroup`, `InputOTPSlot`) so call sites don't change.

**Files:**

- `src/components/ui/input-otp.tsx` (rewrite internals only).
- `apps/web/package.json` (remove `input-otp`).
- Do **not** edit call sites unless an API gap forces it: `routes/auth/verify.tsx`, `routes/tourney/join.tsx`, `routes/tourney/index.tsx`, `routes/_authed/admin/sandbox.tsx`.

**Steps:**

1. Consult the Base UI OTP Field docs (base-ui.com → OTP Field, or context7 `/mui/base-ui`) for the current part API (`OTPField` namespace as of 1.6.0, was `OTPFieldPreview` pre-1.6).
2. Map current internals to Base UI parts: the `OTPInput` container → OTP Field root/input; `InputOTPSlot` (active state, `char`, fake caret) → the per-slot rendering. Preserve the existing slot styling — border/active ring classes and the `animate-caret-blink` fake caret (the `caret-blink` keyframes live in `src/styles.css`).
3. Keep the three exported component names and their prop surfaces stable. If the index-based `InputOTPSlot` model can't be preserved 1:1, prefer the minimal call-site change and document it.
4. Remove `input-otp` from `package.json`; `bun install`.

**Acceptance:** `bun preflight` green; OTP entry works on `routes/auth/verify.tsx` (real email verification) and the tourney join-code flow; `input-otp` gone from `package.json` and lockfile.

**Risk:** medium — part API differs from `input-otp`'s context/slot model; the visible API stays the same. QA the fake-caret + active-slot styling.

---

## WU-2 — MessageScroller compatibility spike (gating, throwaway branch)

**Objective:** de-risk WU-3 by proving the shadcn chat registry resolves against this project before any rewrite. **Output is a written go/no-go report, not merged code.**

**Steps:**

1. On a scratch branch, run `npx shadcn@latest add message-scroller` (and optionally `message`). Observe whether it resolves against `components.json` (`style: base-vega`, `@reui` registry) and what it installs (expect a `@shadcn/react` headless dep + a styled wrapper).
2. Check: does it conflict with existing Base UI primitives or the `@reui` registry? Does the headless `@shadcn/react/message-scroller` import cleanly? Any peer-dep or React 19 issues?
3. Render a throwaway `MessageScroller.Provider/Root/Viewport/Content/Item/Button` with static messages to confirm it builds and scrolls under SSR.

**Acceptance:** a report covering: (a) install command that works, (b) packages/files added, (c) any registry/style/peer conflicts + workarounds, (d) confirmed part API (`Provider`, `Root`, `Viewport`, `Content`, `Item` with `messageId`/`scrollAnchor`, `Button`), (e) **go/no-go** for WU-3. Discard the spike branch.

**Risk:** this IS the risk-reduction step. If no-go, escalate before WU-3.

---

## WU-3 — Rewrite `views/messages.tsx` on MessageScroller + Message + scroll-fade ⭐

**Depends on:** WU-2 (go verdict + confirmed API).

**Objective:** replace the imperative scroll machinery in `views/messages.tsx` with `MessageScroller`, and the row/grouping markup with `Message`. This removes the biggest anti-patterns in the chat code.

**Remove / replace:**

- Both `useLayoutEffect`s (initial bottom-scroll, sticky "within 400px", deep-link `scrollIntoView` + glow) → `MessageScroller` anchoring + `MessageScroller.Item` `scrollAnchor`.
- The `dangerouslySetInnerHTML` `<script>` SSR scroll hack → `MessageScroller` SSR behavior.
- The `#message-{id}` hash scheme + `highlightMessageId` glow → `MessageScroller.Item messageId` + its visibility/jump API (keep the `animate-highlight-glow` flash on the focused message if the API allows; glow keyframes are in `src/styles.css`).
- `JumpToLatestButton` (a `<Link to="/chat">`) in `views/chat-messages.tsx` → `MessageScroller.Button`.
- The duplicated **embedded vs non-embedded** branches → ideally one path. Evaluate whether `useScroll` (`src/lib/ux/hooks/use-scroll.ts`) and the `scrollTargetId` prop are still needed; remove if the scroller owns scrolling. If a consumer still needs external-container mode, keep a minimal shim.
- Row markup (`isNewSection` author grouping, `items-end` for self-messages) → `Message` parts (avatar/header/alignment/grouping). Keep `MessageBubble` as the surface for now (WU-4 refines).

**Apply:** `scroll-fade` utility on the `MessageScroller.Viewport`.

**Consumers to verify unchanged in behavior:** `views/chat-messages.tsx`, `views/post.tsx`, `routes/vault/$videoId/index.tsx`, `routes/games/rius/submissions/$submissionId/index.tsx`.

**Steps:**

1. Add the components per WU-2's confirmed command.
2. Rebuild `MessagesView` around `MessageScroller`, preserving its public props contract (`record`, `messages`, `handleCreateMessage`, `highlightMessageId`/focus, `footer`) so consumers don't change — or update all consumers in the same PR if the contract must change.
3. Wire the `BaseMessageForm` footer (and the focused-state `JumpToLatestButton` → `MessageScroller.Button`).
4. Delete now-dead code (`useScroll`, scroll refs, the script hack) once nothing references them.

**Acceptance:** `bun preflight` green; **no `useEffect`/`useLayoutEffect` and no `dangerouslySetInnerHTML` remain in `views/messages.tsx`**. Manual QA (all must pass):

- chat loads pinned to newest message on SSR (no flash/jump).
- sending a message scrolls to it; scrolling up then sending behaves per the old sticky rule.
- a notification / `?focus=` deep link scrolls to + highlights the target, and "jump to latest" returns to bottom.
- posts thread, a game set thread (`views/post.tsx`), vault video thread, and a rius submission thread all still render and scroll.

**Risk:** high (user-visible scroll, 5 consumers, SSR). Own PR, thorough manual QA. If `MessageScroller`'s SSR initial-bottom differs from today's `<script>` hack, resolve before merge.

---

## WU-4 — Adopt `Bubble` as the message surface shell

**Depends on:** WU-3.

**Objective:** wrap the message surface in shadcn `Bubble` for standardized alignment/surface, **keeping all existing domain behavior inside** `components/messages/message-bubble.tsx` (likes via `LikesButtonGroup`, flag tray, edit drawer, mentions/`RichText`, hover cards).

**Steps:**

1. `npx shadcn@latest add bubble`.
2. Use `Bubble` as the surface container (alignment, collapsible) around the current bubble body. **Do not** migrate likes/actions into `Bubble`'s `reactions`/`buttons` parts — they don't match the reactions model; keep the existing components.
3. Preserve `data-slot="message-bubble"` (the WU-3 highlight glow targets it) unless WU-3 rewired the glow.

**Acceptance:** `bun preflight` green; bubbles render identically or better; likes, flag, edit, mentions, hover cards all still work; self vs other alignment correct.

**Risk:** medium — 591-line component. Scope strictly to the surface shell; no behavior migration.

---

## WU-5 — `Marker` date dividers

**Depends on:** WU-3.

**Objective:** add day-boundary separators between messages using shadcn `Marker` (divider/label part only — **skip** streaming/tool-activity parts; those are AI-only).

**Steps:**

1. `npx shadcn@latest add marker`.
2. In the `MessagesView` map, insert a `Marker` divider when a message's day differs from the previous message's day. Label copy lowercase ("today", "yesterday", or the date).

**Acceptance:** `bun preflight` green; dividers appear at correct day boundaries in a multi-day thread; none at the top or between same-day messages.

**Risk:** low.

---

## WU-6 — Base UI new-part polish (Select + Drawer)

**Depends on:** WU-0.

**Objective:** fold in parts added in Base UI 1.4/1.5 to components already wrapped.

**Files:** `src/components/ui/select.tsx`, `src/components/ui/drawer.tsx`.

**Steps:**

1. **Select** (`select.tsx`): expose `alignItemWithTrigger` for menu-style alignment, wire the new `Label` part, and use `data-popup-side` for side-aware styling where relevant. Keep current call sites working (additive).
2. **Drawer** (`drawer.tsx`): adopt `Drawer.Viewport` (better mobile scroll / virtual keyboard) and `Drawer.SwipeArea` (constrain swipe-to-dismiss to a grabber instead of the whole sheet). Verify mobile drawers — `responsive-combobox.tsx`, `mobile-nav.tsx`, and the message edit drawer — still open/close/swipe correctly.

**Acceptance:** `bun preflight` green; selects and drawers behave the same or better; no regressions in mobile swipe-to-dismiss.

**Risk:** low–medium. Additive, but Drawer swipe touches mobile UX — QA on a touch viewport.

---

## Explicitly out of scope (do NOT do)

These were evaluated and deferred — leave them alone unless a separate ticket asks:

- **`Attachment`** — messages are text-only; no data to render. Becomes the right choice _if_ image messages are added later.
- **`shimmer`** — AI "thinking" indicator; no typing indicator exists.
- **Base UI Combobox/Autocomplete migration** — would churn the battle-tested `cmdk` command palette / `responsive-combobox` for little user-visible gain.
- **Base UI Toast migration** — 47 `sonner` call sites; not worth the churn for parity.
- **Switch/Toggle/Slider/Number Field wrappers** — adopt lazily when a feature next needs one, not preemptively.

## Done = all of:

WU-0, WU-1, WU-3, WU-4, WU-5, WU-6 merged; WU-2 report archived. Each landed green via `bun preflight`, each with the manual QA in its Acceptance section completed.
