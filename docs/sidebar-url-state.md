# URL-Driven Sidebar State (iOS Swipe-Back Fix)

## The Problem

iOS Safari caches page snapshots for the swipe-back gesture preview. If your sidebar is open when you navigate away, the cached snapshot shows the sidebar open—even if your React state closes it. This creates a jarring UX where:

1. User opens sidebar
2. User navigates to new page (sidebar closes via React state)
3. User swipes back → iOS shows cached snapshot with sidebar OPEN
4. Page loads → sidebar snaps to closed state

## The Solution

Make sidebar state live in the **URL** (`?sidebar=1`), not just React state. This way, the history entry you're swiping back to never had the sidebar open in the first place.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         URL (Source of Truth)                   │
│                     /games?sidebar=1  →  sidebar open           │
│                     /games            →  sidebar closed         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SidebarProvider (self-contained)             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ // Reads URL directly                                   │    │
│  │ const { sidebar } = useSearch({ from: "__root__" })     │    │
│  │ const open = sidebar === "1"                            │    │
│  │                                                         │    │
│  │ // Handles navigation internally                        │    │
│  │ const setOpen = (nextOpen) => {                         │    │
│  │   if (nextOpen) navigate({ search: { sidebar: "1" } })  │    │
│  │   else router.history.back()                            │    │
│  │ }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                │                                │
│                                ▼                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ <Sheet                                                  │    │
│  │   open={open}                                           │    │
│  │   onOpenChange={setOpen}                                │    │
│  │ />                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

The `SidebarProvider` is now fully self-contained—it reads from URL and handles
navigation internally. No props needed from `__root.tsx`.

---

## The Two Pieces & Their Interaction

### Piece 1: `setOpen` (in `SidebarProvider`)

```tsx
const setOpen = React.useCallback(
  (nextOpen: boolean) => {
    if (nextOpen) {
      // OPENING: Push new history entry with ?sidebar=1
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, sidebar: "1" as const }),
      });
    } else {
      // CLOSING: Go back in history (removes the ?sidebar=1 entry)
      router.history.back();
    }
  },
  [navigate, router],
);
```

**This handles:**

- Opening the sidebar (via `SidebarTrigger` button)
- Closing via overlay click
- Closing via close button
- Closing via escape key

**Why `history.back()` for closing?**
Because we PUSHED a new entry when opening. Going back pops it cleanly.

---

### Piece 2: Link with `search` removal (in `nav-main.tsx`)

```tsx
<Link
  to={item.url}
  search={(prev) => {
    const { sidebar: _, ...rest } = prev;
    return rest;
  }}
  replace
>
```

**This handles:**

- Closing via navigation (clicking a nav item)

**Why `replace` instead of normal navigation?**
This is the key insight! When user clicks a nav link:

1. Current URL: `/games?sidebar=1`
2. Without `replace`: Would push `/users`, leaving `/games?sidebar=1` in history
3. With `replace`: REPLACES `/games?sidebar=1` with `/users`

This means the history stack goes from:

```
[/previous-page] → [/games?sidebar=1]
```

To:

```
[/previous-page] → [/users]
```

The `?sidebar=1` entry is gone! Swipe-back now shows `/previous-page` (closed).

---

## Complete Flow Diagrams

### Flow 1: Open Sidebar

```
User Action: Clicks SidebarTrigger
    │
    ▼
toggleSidebar() called
    │
    ▼
setIsTabletSidebarOpen(true) → handleSidebarOpenChange(true)
    │
    ▼
navigate({ to: ".", search: { ...prev, sidebar: "1" } })
    │
    ▼
URL changes: /games → /games?sidebar=1
    │
    ▼
useSearch() returns { sidebar: "1" }
    │
    ▼
isSidebarOpen = true
    │
    ▼
Sheet opens with animation

History Stack:
  BEFORE: [/home] → [/games]
  AFTER:  [/home] → [/games] → [/games?sidebar=1]
                                    ▲ you are here
```

### Flow 2: Close Sidebar (Overlay/Button)

```
User Action: Clicks overlay or close button
    │
    ▼
Sheet's onOpenChange(false) fires
    │
    ▼
setIsTabletSidebarOpen(false) → handleSidebarOpenChange(false)
    │
    ▼
router.history.back()
    │
    ▼
URL changes: /games?sidebar=1 → /games
    │
    ▼
useSearch() returns { sidebar: undefined }
    │
    ▼
isSidebarOpen = false
    │
    ▼
Sheet closes with animation

History Stack:
  BEFORE: [/home] → [/games] → [/games?sidebar=1]
                                    ▲ you are here
  AFTER:  [/home] → [/games]
                        ▲ you are here (went back)
```

### Flow 3: Close Sidebar via Navigation

```
User Action: Clicks "Users" in sidebar
    │
    ▼
<Link to="/users" search={omit sidebar} replace> clicked
    │
    ▼
URL changes: /games?sidebar=1 → /users (REPLACES, doesn't push)
    │
    ▼
useSearch() returns { sidebar: undefined }
    │
    ▼
isSidebarOpen = false
    │
    ▼
Sheet closes with animation

History Stack:
  BEFORE: [/home] → [/games] → [/games?sidebar=1]
                                    ▲ you are here
  AFTER:  [/home] → [/games] → [/users]
                                  ▲ replaced the sidebar entry!
```

### Flow 4: iOS Swipe-Back (The Whole Point!)

```
Current state: User is on /users, sidebar is closed
History Stack: [/home] → [/games] → [/users]

User Action: Swipes back from left edge
    │
    ▼
iOS shows preview of previous history entry
    │
    ▼
Previous entry is /games (NOT /games?sidebar=1!)
    │
    ▼
Preview shows /games with sidebar CLOSED ✓
    │
    ▼
User completes swipe
    │
    ▼
Page loads /games, sidebar is closed
    │
    ▼
No jarring state mismatch! 🎉
```

---

## Why Both Pieces Are Necessary

| Scenario           | Which piece handles it?   | Why?                               |
| ------------------ | ------------------------- | ---------------------------------- |
| Open sidebar       | `SidebarProvider.setOpen` | Need to PUSH new history entry     |
| Close via overlay  | `SidebarProvider.setOpen` | Need to go BACK to pop the entry   |
| Close via escape   | `SidebarProvider.setOpen` | Same as overlay                    |
| Close via nav link | `Link` with `replace`     | Need to REPLACE entry, not go back |

**What if we only had `SidebarProvider.setOpen`?**

If nav links just navigated normally without `replace`:

```
History: [/home] → [/games] → [/games?sidebar=1] → [/users]
```

Swipe-back from `/users` would show `/games?sidebar=1` (sidebar OPEN) 💥

**What if we only had the `Link` approach?**

Opening the sidebar wouldn't add a history entry, so:

- Swipe-back wouldn't close the sidebar
- Browser back button wouldn't close the sidebar
- You'd need a separate close mechanism

---

## The Zod Schema

```tsx
const rootSearchSchema = z.object({
  sidebar: z
    .any()
    .optional()
    .transform((v) => (v === "1" || v === 1 ? ("1" as const) : undefined)),
});
```

**Why `z.any()`?**

TanStack Router auto-coerces `"1"` to `1` (number). We accept anything and normalize it.

**Why transform to `undefined`?**

Clean URLs. Invalid values become undefined, treated as "closed".

---

## Summary

The Instagram-like swipe-back behavior works because:

1. **Sidebar open state = URL state** (not React state)
2. **Opening PUSHES** a new history entry (`?sidebar=1`)
3. **Closing via overlay GOES BACK** (pops the entry)
4. **Closing via navigation REPLACES** the entry (removes it from history)

The history stack never contains a stale "sidebar open" entry that iOS could show during swipe-back preview.
