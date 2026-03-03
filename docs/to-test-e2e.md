# E2E Test Plan: Trick Suggestions + Admin Review

## Infrastructure: Two-User Setup

All multi-user tests require a normal user (beau) submitting content and an admin (colby) reviewing it.

### Auth Setup (`e2e/auth.setup.ts`)

Add a second setup step for beau. Same OTP pattern as colby:

```ts
setup("authenticate admin", async ({ page }) => {
  // colby@jrnxf.co — saves to e2e/.auth/admin.json
  // (same logic as current setup, just rename output file)
})

setup("authenticate user", async ({ page }) => {
  // beau@jrnxf.co — saves to e2e/.auth/user.json
  // Same OTP flow: insert code '8888', fill, verify, save state
})
```

### Playwright Config (`playwright.config.ts`)

Update the `authed` project to use `admin.json`:

```ts
{
  name: "authed",
  testMatch: /authed\/.*/,
  use: {
    ...devices["Desktop Chrome"],
    storageState: "e2e/.auth/admin.json",  // was user.json
  },
  dependencies: ["setup"],
},
```

All existing tests continue unchanged — `page` is still colby (admin).

### Fixtures (`e2e/fixtures.ts`)

Add a `userPage` fixture that creates a second browser context as beau:

```ts
export const test = base.extend<{ userPage: Page }>({
  page: async ({ page }, use) => {
    // existing hydration wrapper — colby/admin
    const originalGoto = page.goto.bind(page)
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options)
      await expect(page.locator("html[data-hydrated]")).toBeAttached()
      return response
    }
    await use(page)
  },

  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    })
    const userPage = await context.newPage()
    // same hydration wrapper
    const originalGoto = userPage.goto.bind(userPage)
    userPage.goto = async (url, options) => {
      const response = await originalGoto(url, options)
      await expect(userPage.locator("html[data-hydrated]")).toBeAttached()
      return response
    }
    await use(userPage)
    await context.close()
  },
})
```

Tests that need both roles: `async ({ page, userPage }) => { ... }`

- `page` = colby (admin, user.id === 1)
- `userPage` = beau (normal user)

---

## Test: Trick Suggestion Approval

**File:** `e2e/authed/trick-suggestions.e2e.test.ts`

### Admin check

Admin is hardcoded to `user.id === 1` (colby) in both:

- Server: `src/lib/middleware.ts` — `adminOnlyMiddleware` checks `session.data.user.id === 1`
- Client: `src/lib/session/hooks.ts` — `useIsAdmin()` returns `user.id === 1`

Beau will NOT see admin UI (shield button, admin review page access).

### Self-notification guard

`src/lib/notifications/helpers.ts` line 22: `if (input.actorId === input.userId) return`

When colby reviews beau's suggestion, `actorId` (colby) !== `userId` (beau), so beau WILL receive a notification. This is testable with the two-user setup.

### Test target

Use a well-known trick that won't be modified by other tests. Pick one by slug (the route param `trickId` is actually the slug — see `suggest.tsx` line 52). A good candidate: any stable trick like `crankflip` or `unispin`.

The test will modify the trick's **definition** field (not the name — changing the name would affect other tests that navigate by name). Append ` e2e` to the definition, then revert it.

### Test 1: `"user submits suggestion, admin approves, user gets notification"`

```
Timeout: 90_000
```

**Phase 1 — Beau submits a suggestion (userPage)**

1. `userPage.goto("/tricks/{slug}/suggest")`
2. Wait for form to load — assert `getByLabel("Name")` is visible
3. Read the current definition value from `getByLabel("Definition")`
4. Append ` e2e` to the definition field
5. Fill reason: `getByPlaceholder("Explain why these changes should be made...")` → `"e2e-suggestion-test"`
6. Click `getByRole("button", { name: "Submit Suggestion" })`
7. Assert toast: `getByText("suggestion submitted for review")` is visible
8. Assert redirect: URL matches `/tricks/{slug}`

**Phase 2 — Colby reviews (admin page)**

1. `page.goto("/admin/review?outer=tricks&inner=suggestions")`
2. Wait for page load
3. Click `getByRole("tab", { name: "suggestions" })` (inner tab) if not already active
4. Find the suggestion card — look for the trick name text within the suggestions panel
5. Fill review notes: `getByPlaceholder("review notes...")` → `"e2e-review-approved"`
6. Click `getByRole("button", { name: "approve" })`
7. Assert toast: `getByText("suggestion approved")` is visible
8. Assert the suggestion card is removed from the list (optimistic update)

**Phase 3 — Verify trick was updated (userPage)**

1. `userPage.goto("/tricks/{slug}")`
2. Assert the definition text now contains ` e2e` at the end

**Phase 4 — Verify beau received a notification (userPage)**

1. `userPage.goto("/notifications")`
2. Assert a notification mentioning "approved" is visible (the `entityTitle` field is the status)

**Phase 5 — Revert the trick via a second suggestion + approval**

1. `userPage.goto("/tricks/{slug}/suggest")`
2. Remove the ` e2e` suffix from the definition (restore original value)
3. Fill reason: `"e2e-suggestion-revert"`
4. Submit
5. `page.goto("/admin/review?outer=tricks&inner=suggestions")`
6. Click suggestions tab
7. Fill review notes: `"e2e-review-revert"`
8. Approve
9. Verify trick definition is back to original

### Test 2: `"user submits suggestion, admin rejects, trick unchanged"`

```
Timeout: 90_000
```

**Phase 1 — Beau submits (userPage)**

1. Same as Test 1 Phase 1 — modify definition, fill reason `"e2e-suggestion-reject-test"`

**Phase 2 — Colby rejects (page)**

1. `page.goto("/admin/review?outer=tricks&inner=suggestions")`
2. Click suggestions tab
3. Fill review notes: `"e2e-review-rejected"`
4. Click `getByRole("button", { name: "reject" })` (destructive variant)
5. Assert toast: `getByText("suggestion rejected")` is visible
6. Assert card removed

**Phase 3 — Verify trick is unchanged (userPage)**

1. `userPage.goto("/tricks/{slug}")`
2. Assert the definition does NOT contain ` e2e`

**Phase 4 — Verify beau received rejection notification (userPage)**

1. `userPage.goto("/notifications")`
2. Assert a notification mentioning "rejected" is visible

No revert needed — rejection doesn't modify the trick.

### Safety net (afterAll)

```ts
test.afterAll(async () => {
  const sql = postgres(process.env.DATABASE_URL!)
  try {
    // Revert trick definition if test failed mid-approval
    // Store original definition before test, restore here
    await sql`
      UPDATE tricks SET definition = ${originalDefinition}
      WHERE slug = ${TRICK_SLUG}
      AND definition LIKE '%e2e%'
    `
    // Delete orphaned suggestions
    await sql`DELETE FROM trick_suggestions WHERE reason LIKE 'e2e-%'`
    // Delete test notifications
    await sql`DELETE FROM notifications WHERE data::text LIKE '%e2e-%'`
  } finally {
    await sql.end()
  }
})
```

### Key selectors reference

| Element                    | Selector                                                          |
| -------------------------- | ----------------------------------------------------------------- |
| Suggestion form Name field | `getByLabel("Name")`                                              |
| Definition textarea        | `getByLabel("Definition")`                                        |
| Invented By field          | `getByLabel("Invented By")`                                       |
| Year Landed field          | `getByLabel("Year Landed")`                                       |
| Reason textarea            | `getByPlaceholder("Explain why these changes should be made...")` |
| Submit button              | `getByRole("button", { name: "Submit Suggestion" })`              |
| Cancel button              | `getByRole("button", { name: "Cancel" })`                         |
| Edit link (trick detail)   | `getByRole("link", { name: "Edit" })`                             |
| Admin review notes         | `getByPlaceholder("review notes...")`                             |
| Approve button             | `getByRole("button", { name: "approve" })`                        |
| Reject button              | `getByRole("button", { name: "reject" })`                         |
| Suggestions tab            | `getByRole("tab", { name: /suggestions/ })`                       |
| Tricks tab                 | `getByRole("tab", { name: /tricks/ })`                            |

### Important notes

- The "Edit" link on the trick detail page goes to `/tricks/$trickId/suggest` (it's the suggestion form, not a direct edit). Both admin and normal users see this button. The admin-only button is the shield icon which goes to `/admin/tricks/$trickId/edit`.
- Review notes are **required** for both approve and reject — buttons are disabled when the textarea is empty.
- The `Notes` field in the suggestion form has **no label** (no `<FormLabel>`). It's just a textarea under the "Notes" heading. Use a positional selector or the textarea index if needed. Avoid modifying this field in tests — use Definition instead.
- The suggestion form pre-fills all fields with the trick's current values. The diff is computed client-side by comparing form values to the original trick. If no fields differ, submission shows toast `"no changes detected"`.
- Tabs use `defaultValue` from URL params (`?outer=tricks&inner=suggestions`), so navigating directly to the URL with params pre-selects the right tab. Clicking the tab trigger is only needed if navigating without params.
- Multiple suggestions for the same trick can be pending simultaneously. The test should find the correct card by looking for its reason text `"e2e-suggestion-test"` within the card, not just the trick name.
