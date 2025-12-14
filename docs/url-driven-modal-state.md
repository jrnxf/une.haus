# URL-Driven Modal State (iOS Swipe-Back Fix)

## The Problem

iOS Safari caches page snapshots for the swipe-back gesture preview. If a modal/sidebar/dialog is open when you navigate away, the cached snapshot shows it open—even if your React state closes it. This creates a jarring UX where:

1. User opens modal
2. User navigates to new page (modal closes via React state)
3. User swipes back → iOS shows cached snapshot with modal OPEN
4. Page loads → modal snaps to closed state

## The Solution

Make modal state live in the **URL** (e.g., `?sidebar=1`, `?search=1`), not just React state. This way, the history entry you're swiping back to never had the modal open in the first place because whatever link you click will replace the current history entry (the one with the modal open).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         URL (Source of Truth)                   │
│                     /games?sidebar=1  →  sidebar open           │
│                     /games?search=1   →  command menu open      │
│                     /games            →  all modals closed      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Modal Component (self-contained)             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ // Read URL directly                                    │    │
│  │ const { myParam } = useSearch({ from: "__root__" })     │    │
│  │ const open = myParam === 1                              │    │
│  │                                                         │    │
│  │ // Handle navigation internally                         │    │
│  │ const setOpen = (nextOpen) => {                         │    │
│  │   if (nextOpen) navigate({ search: { myParam: 1 } })    │    │
│  │   else router.history.back()                            │    │
│  │ }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                │                                │
│                                ▼                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ <Dialog                                                 │    │
│  │   open={open}                                           │    │
│  │   onOpenChange={setOpen}                                │    │
│  │ />                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

Each modal component is fully self-contained—it reads from URL and handles navigation internally. No props needed from parent routes.

---

## The Core Pattern

### The `setOpen` Function

```tsx
const setOpen = React.useCallback(
  (nextOpen: boolean) => {
    if (nextOpen) {
      // OPENING: Push new history entry with ?param=1
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, myParam: 1 }),
      });
    } else {
      // CLOSING: Go back in history (removes the entry)
      router.history.back();
    }
  },
  [navigate, router],
);
```

**This handles:**

- Opening the modal (via trigger button, keyboard shortcut, etc.)
- Closing via overlay click
- Closing via close button
- Closing via escape key

**Why `history.back()` for closing?**
Because we PUSHED a new entry when opening. Going back pops it cleanly.

---

### Navigation Links with `replace`

When you have navigation links inside the modal that should close it:

```tsx
<Link to={item.url} replace>
```

Or if you need to explicitly remove the search param:

```tsx
<Link
  to={item.url}
  search={(prev) => {
    const { myParam: _, ...rest } = prev;
    return rest;
  }}
  replace
/>
```

**Why `replace` instead of normal navigation?**
This is the key insight! When user clicks a nav link:

1. Current URL: `/games?sidebar=1`
2. Without `replace`: Would push `/users`, leaving `/games?sidebar=1` in history
3. With `replace`: REPLACES `/games?sidebar=1` with `/users`

The `?sidebar=1` entry is gone! Swipe-back now shows the previous page (closed).

---

## Examples in This Codebase

### Sidebar (`SidebarProvider`)

Uses `?sidebar=1` in the URL. The `SidebarProvider` reads this and controls a Sheet component.

### Command Menu (`CommandMenu`)

Uses `?search=1` in the URL:

```tsx
const { search } = useSearch({ from: rootRouteId });
const open = search === 1;

const setOpen = React.useCallback(
  (nextOpen: boolean) => {
    if (nextOpen) {
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, search: nextOpen ? 1 : undefined }),
      });
    } else {
      router.history.back();
    }
  },
  [navigate, router],
);
```

Navigation links inside the command menu use `replace`:

```tsx
<Link to="/users" replace>
  Users
</Link>
```

---

## Complete Flow Diagrams

### Flow 1: Open Modal

```
User Action: Clicks trigger or presses ⌘K
    │
    ▼
setOpen(true) called
    │
    ▼
navigate({ to: ".", search: { ...prev, myParam: 1 } })
    │
    ▼
URL changes: /games → /games?myParam=1
    │
    ▼
useSearch() returns { myParam: 1 }
    │
    ▼
open = true
    │
    ▼
Modal opens with animation

History Stack:
  BEFORE: [/home] → [/games]
  AFTER:  [/home] → [/games] → [/games?myParam=1]
                                    ▲ you are here
```

### Flow 2: Close Modal (Overlay/Button/Escape)

```
User Action: Clicks overlay, close button, or presses Escape
    │
    ▼
onOpenChange(false) fires
    │
    ▼
setOpen(false) called
    │
    ▼
router.history.back()
    │
    ▼
URL changes: /games?myParam=1 → /games
    │
    ▼
useSearch() returns { myParam: undefined }
    │
    ▼
open = false
    │
    ▼
Modal closes with animation

History Stack:
  BEFORE: [/home] → [/games] → [/games?myParam=1]
                                    ▲ you are here
  AFTER:  [/home] → [/games]
                        ▲ you are here (went back)
```

### Flow 3: Close Modal via Navigation

```
User Action: Clicks a link inside the modal
    │
    ▼
<Link to="/users" replace> clicked
    │
    ▼
URL changes: /games?myParam=1 → /users (REPLACES, doesn't push)
    │
    ▼
useSearch() returns { myParam: undefined }
    │
    ▼
open = false
    │
    ▼
Modal closes with animation

History Stack:
  BEFORE: [/home] → [/games] → [/games?myParam=1]
                                    ▲ you are here
  AFTER:  [/home] → [/games] → [/users]
                                  ▲ replaced the modal entry!
```

### Flow 4: iOS Swipe-Back (The Whole Point!)

```
Current state: User is on /users, modal is closed
History Stack: [/home] → [/games] → [/users]

User Action: Swipes back from left edge
    │
    ▼
iOS shows preview of previous history entry
    │
    ▼
Previous entry is /games (NOT /games?myParam=1!)
    │
    ▼
Preview shows /games with modal CLOSED ✓
    │
    ▼
User completes swipe
    │
    ▼
Page loads /games, modal is closed
    │
    ▼
No jarring state mismatch! 🎉
```

---

## Why Both Pieces Are Necessary

| Scenario           | Which piece handles it? | Why?                               |
| ------------------ | ----------------------- | ---------------------------------- |
| Open modal         | `setOpen(true)`         | Need to PUSH new history entry     |
| Close via overlay  | `setOpen(false)`        | Need to go BACK to pop the entry   |
| Close via escape   | `setOpen(false)`        | Same as overlay                    |
| Close via nav link | `Link` with `replace`   | Need to REPLACE entry, not go back |

**What if we only had `setOpen`?**

If nav links just navigated normally without `replace`:

```
History: [/home] → [/games] → [/games?myParam=1] → [/users]
```

Swipe-back from `/users` would show `/games?myParam=1` (modal OPEN) 💥

**What if we only had the `Link` approach?**

Opening the modal wouldn't add a history entry, so:

- Swipe-back wouldn't close the modal
- Browser back button wouldn't close the modal
- You'd need a separate close mechanism

---

## Schema Configuration

In your root route, validate the search params:

```tsx
const rootSearchSchema = z.object({
  sidebar: z
    .any()
    .optional()
    .transform((v) => (v === "1" || v === 1 ? ("1" as const) : undefined)),
  search: z
    .any()
    .optional()
    .transform((v) => (v === 1 ? 1 : undefined)),
});
```

**Why `z.any()`?**

TanStack Router auto-coerces `"1"` to `1` (number). We accept anything and normalize it.

**Why transform to `undefined`?**

Clean URLs. Invalid values become undefined, treated as "closed".

---

## Adding a New URL-Driven Modal

1. **Add the search param to your schema** in `__root.tsx`
2. **Read from URL** in your component:
   ```tsx
   const { myParam } = useSearch({ from: rootRouteId });
   const open = myParam === 1;
   ```
3. **Implement `setOpen`** with navigate/back pattern
4. **Use `replace` on navigation links** inside the modal

---

## Summary

The Instagram-like swipe-back behavior works because:

1. **Modal open state = URL state** (not React state)
2. **Opening PUSHES** a new history entry (`?myParam=1`)
3. **Closing via overlay GOES BACK** (pops the entry)
4. **Closing via navigation REPLACES** the entry (removes it from history)

The history stack never contains a stale "modal open" entry that iOS could show during swipe-back preview.
