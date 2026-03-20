# URL-Driven Modal State (iOS Swipe-Back Fix)

## The Problem

iOS Safari caches page snapshots for the swipe-back gesture preview. If a modal/sidebar/dialog is open when you navigate away, the cached snapshot shows it open—even if your React state closes it. This creates a jarring UX where:

1. User opens modal
2. User navigates to new page (modal closes via React state)
3. User swipes back → iOS shows cached snapshot with modal OPEN
4. Page loads → modal snaps to closed state

## The Solution

Make modal state live in the **URL** via the `?p=` param, not just React state. The `usePeripherals(key)` hook manages this. State is stored as a pipe-delimited array (e.g., `?p=sidebar|search`), so multiple peripherals can be open simultaneously.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         URL (Source of Truth)                   │
│                     /games?p=sidebar       →  sidebar open      │
│                     /games?p=sidebar|search →  both open        │
│                     /games                  →  all closed        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    usePeripherals(key) Hook                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ const [open, setOpen, dismiss] = usePeripherals("sidebar") │ │
│  │                                                         │    │
│  │ // open:    boolean — is this key in the ?p= array?     │    │
│  │ // setOpen: (bool) => push history / history.back()     │    │
│  │ // dismiss: () => replace URL (no history.back)         │    │
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

Each modal component is fully self-contained. No props needed from parent routes.

---

## The `usePeripherals` Hook

**File:** `src/hooks/use-peripherals.ts`

```tsx
import { usePeripherals } from "~/hooks/use-peripherals"

const [open, setOpen, dismiss] = usePeripherals("sidebar")
```

Returns a tuple:

| Value     | Type                          | Description                                                  |
| --------- | ----------------------------- | ------------------------------------------------------------ |
| `open`    | `boolean`                     | Whether this key is in the `?p=` array                       |
| `setOpen` | `(nextOpen: boolean) => void` | Opens (push history) or closes (history.back)                |
| `dismiss` | `() => void`                  | Programmatic close via URL replace (no history.back, no pop) |

### How it works

- Uses `nuqs` with `parseAsArrayOf(parseAsString, "|")` to store a pipe-delimited array in the `p` search param
- **Opening:** Appends the key to the array, pushes a new history entry
- **Closing via setOpen(false):** Calls `router.history.back()` to pop the entry
- **Closing via dismiss:** Removes the key from the array with `history: "replace"` (useful for programmatic close without affecting history)

### Usage with dialog/drawer components

```tsx
function Sidebar() {
  const [open, setOpen] = usePeripherals("sidebar")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        {/* Navigation links — use plain <Link>, NOT SheetClose wrappers */}
        <Link to="/users">users</Link>
        <Link to="/posts">posts</Link>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Navigation Links Inside Peripherals

When a peripheral contains navigation links, do **NOT** wrap them in a close trigger (e.g., `DrawerPrimitive.Close`, `SheetClose`). The close trigger calls `history.back()`, which undoes the navigation.

Instead, use plain `Link` components. When the link navigates to a new URL, the `?p=` param is gone, so `usePeripherals` returns `open=false` and the peripheral closes naturally.

```tsx
// Good - Link navigates, URL change closes the drawer
<Link to={url}>go somewhere</Link>

// Bad - close trigger calls history.back(), undoing the navigation
<DrawerPrimitive.Close render={<Link to={url} />}>
  go somewhere
</DrawerPrimitive.Close>
```

---

## Complete Flow Diagrams

### Flow 1: Open Peripheral

```
User Action: Clicks trigger or presses ⌘K
    │
    ▼
setOpen(true) called
    │
    ▼
nuqs appends key to ?p= array (history: "push")
    │
    ▼
URL changes: /games → /games?p=sidebar
    │
    ▼
open = peripherals.includes("sidebar") = true
    │
    ▼
Modal opens with animation

History Stack:
  BEFORE: [/home] → [/games]
  AFTER:  [/home] → [/games] → [/games?p=sidebar]
                                    ▲ you are here
```

### Flow 2: Close Peripheral (Overlay/Button/Escape)

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
URL changes: /games?p=sidebar → /games
    │
    ▼
open = false
    │
    ▼
Modal closes with animation

History Stack:
  BEFORE: [/home] → [/games] → [/games?p=sidebar]
                                    ▲ you are here
  AFTER:  [/home] → [/games]
                        ▲ you are here (went back)
```

### Flow 3: Close Peripheral via Navigation

```
User Action: Clicks a <Link> inside the modal
    │
    ▼
<Link to="/users"> navigates
    │
    ▼
URL changes: /games?p=sidebar → /users
    │
    ▼
?p= param is gone, open = false
    │
    ▼
Modal closes naturally

History Stack:
  BEFORE: [/home] → [/games] → [/games?p=sidebar]
                                    ▲ you are here
  AFTER:  [/home] → [/games] → [/games?p=sidebar] → [/users]
                                                        ▲ pushed
```

### Flow 4: iOS Swipe-Back (The Whole Point!)

```
Current state: User is on /users, modal is closed
History Stack: [/home] → [/games] → [/games?p=sidebar] → [/users]

User Action: Swipes back from left edge
    │
    ▼
iOS shows preview of previous history entry
    │
    ▼
Previous entry is /games?p=sidebar
    │
    ▼
BUT: the page renders with sidebar open — and that's
what was showing when we left, so the snapshot matches!
    │
    ▼
No jarring state mismatch.
```

---

## `dismiss` vs `setOpen(false)`

| Method           | History Effect       | Use Case                                     |
| ---------------- | -------------------- | -------------------------------------------- |
| `setOpen(false)` | `history.back()`     | User-initiated close (overlay, escape, X)    |
| `dismiss()`      | `history: "replace"` | Programmatic close (e.g., after form submit) |

Use `dismiss()` when you want to close a peripheral without popping a history entry — for example, after a mutation succeeds and you want to close a form drawer.

---

## Adding a New Peripheral

1. **Call the hook** in your component:
   ```tsx
   const [open, setOpen] = usePeripherals("my-panel")
   ```
2. **Pass to your dialog/drawer:**
   ```tsx
   <Dialog open={open} onOpenChange={setOpen}>
     ...
   </Dialog>
   ```
3. **Use plain `Link` for navigation links** inside the peripheral (no close wrappers)

No schema changes needed — `usePeripherals` manages the `?p=` param via `nuqs` independently of TanStack Router's search schema.

---

## Summary

The swipe-back behavior works because:

1. **Modal open state = URL state** (stored in `?p=` param via `usePeripherals`)
2. **Opening PUSHES** a new history entry (key added to `?p=` array)
3. **Closing via overlay/escape GOES BACK** (pops the entry via `history.back()`)
4. **Closing programmatically REPLACES** the entry (via `dismiss()`)
5. **Navigation links** just navigate — the `?p=` param disappears naturally
