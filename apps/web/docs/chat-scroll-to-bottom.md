# Chat: Scroll-to-Bottom on SSR

The chat route (`/chat`) must load scrolled to the bottom so users see the latest messages and the input field. This is tricky with SSR because the browser paints the server-rendered HTML before React hydrates.

## The Problem

With default SSR behavior, the page loads at the top and then jumps to the bottom once React hydrates and runs a `useLayoutEffect`. This creates a visible flash of the wrong scroll position.

TanStack Router's built-in `scrollRestoration` doesn't help either — it restores whatever position was cached from the previous visit, which is rarely the true bottom (new messages may have arrived).

Timeline of a hard refresh without the fix:

```
1. Browser receives SSR HTML         → paints at scroll position 0 (top)
2. TanStack Router restores scroll   → jumps to stale cached position
3. React hydrates                    → useLayoutEffect scrolls to bottom
```

The user sees two jumps.

## The Fix

Two changes work together to eliminate the flash:

### 1. Disable scroll restoration for `/chat`

In `src/router.tsx`, `scrollRestoration` is a function that returns `false` for the chat route. This prevents TanStack Router from restoring a stale cached position.

```ts
scrollRestoration: ({ location }) => !location.pathname.startsWith("/chat"),
```

When `scrollRestoration` returns `false`, TanStack Router skips injecting its inline restore script into the SSR HTML for that route.

### 2. Inline `<script>` in the SSR HTML

In `src/views/messages.tsx`, a `<script>` tag is rendered **after** the messages and the form:

```tsx
<div className="flex h-full flex-col">
  <div className="overflow-y-auto" ref={ref}>
    {/* messages */}
  </div>
  <div className="shrink-0 pt-4">
    <BaseMessageForm ... />
  </div>
  <script
    dangerouslySetInnerHTML={{
      __html: `document.getElementById('${scrollTargetId}')?.scrollTo(0,1e9)`,
    }}
  />
</div>
```

The browser executes inline `<script>` tags as it parses the HTML, **before the first paint**. By placing the script after both the messages and the form in the DOM, `scrollHeight` includes the full content when the script runs.

`1e9` (1 billion) is used instead of `scrollHeight` because at script execution time we're inside the element itself — `scrollTo` clamps the value to the maximum automatically.

Timeline with the fix:

```
1. Browser parses SSR HTML
2. Inline <script> executes          → scrolls container to bottom
3. Browser paints                    → user sees bottom of chat (no flash)
4. React hydrates
5. useLayoutEffect fires             → no-op (already at bottom)
```

### 3. `useLayoutEffect` handles subsequent updates

After the initial SSR load, the existing `useLayoutEffect` in `MessagesView` handles:

- New messages arriving (scrolls to bottom if user is near the bottom or sent the message)
- User submitting a message (scrolls to bottom via `pendingScrollRef`)

## Why Not Other Approaches?

| Approach                      | Problem                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| `useLayoutEffect` alone       | Runs after hydration — browser already painted at top               |
| `requestAnimationFrame`       | Same issue, runs after initial paint                                |
| CSS `column-reverse`          | Reverses DOM order, complicates message rendering and accessibility |
| Manipulating `sessionStorage` | Brittle, depends on TanStack Router's internal storage format       |

## Key Files

- `src/router.tsx` — `scrollRestoration` function that disables restoration for `/chat`
- `src/views/messages.tsx` — inline `<script>` and `useLayoutEffect` scroll logic
- `src/views/chat-messages.tsx` — passes `scrollTargetId="main-content"` to `MessagesView`
