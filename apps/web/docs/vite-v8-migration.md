# Vite 8 + Vite+ Migration

Vite 8 attempted 2026-03-14, reverted. Vite 8.0.0 released 2026-03-12.

Vite+ bundles Vite 8 internally, so the Vite+ migration is blocked by the same issue.

## Status: blocked

TanStack Start server functions return `undefined` during **client-side navigation** (HTTP calls). SSR and builds work fine. The issue is in how `@tanstack/start-plugin-core` interacts with Vite 8's Rolldown-based dev server — the server function transport layer doesn't serialize responses correctly.

**Retry when:** TanStack Start publishes a release with explicit Vite 8 dev server support. Watch [TanStack/router releases](https://github.com/TanStack/router/releases) and test with `bun dev` + client-side navigation to `/posts` or `/users`.

## What worked

- `bun run build` (production build) passes on Vite 8
- `bun run preflight` (lint, format, typecheck, tests) all pass
- `bun run docs:build` passes
- Dev server starts without errors
- Hard refresh / SSR works on all routes

## What broke

- Client-side navigation to routes with server functions (`/posts`, `/users`, etc.) returns `undefined` from all `createServerFn` calls
- Manifests as: `"Invalid input: expected object, received undefined"` (Zod deserialization) or `"Query data cannot be undefined"` (React Query)
- Global queries (`presence.online`, `notifications.unreadCount`) also fail during navigation

## Dependency changes needed for v8

### apps/web/package.json

```diff
 dependencies:
-  "@vitejs/plugin-react": "^4.4.1",
+  "@vitejs/plugin-react": "^6.0.1",
   # plugin-react v6 requires vite ^8, uses @rolldown/pluginutils internally

 devDependencies:
-  "@tanstack/devtools-vite": "^0.4.1",
+  "@tanstack/devtools-vite": "^0.5.5",
-  "rollup": "^4.57.1",
   # rollup devDep removed — Rolldown replaces Rollup in Vite 8
-  "vite": "^7.1.7",
+  "vite": "^8.0.0",
```

### apps/docs/package.json

```diff
 dependencies:
-  "@vitejs/plugin-react": "^4.4.1",
+  "@vitejs/plugin-react": "^6.0.1",

 devDependencies:
-  "vite": "^7.1.7",
+  "vite": "^8.0.0",
```

### apps/web/vite.config.ts

```diff
-import { type LoggingFunction, type RollupLog } from "rollup"
-import { defineConfig, type PluginOption } from "vite"
-import viteTsConfigPaths from "vite-tsconfig-paths"
+import { defineConfig, type PluginOption } from "vite"

 const config = defineConfig(async () => {
   return {
+    resolve: {
+      tsconfigPaths: true,  // native in Vite 8, replaces vite-tsconfig-paths plugin
+    },
-    build: {
-      rollupOptions: {
-        onwarn(warning: RollupLog, defaultHandler: LoggingFunction) {
-          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return
-          defaultHandler(warning)
-        },
-      },
-    },
     # build.rollupOptions removed:
     #   - renamed to build.rolldownOptions in Vite 8
     #   - onwarn is omitted from the type (not supported)
     #   - MODULE_LEVEL_DIRECTIVE warnings don't occur with Rolldown
     plugins: [
       await devtoolsPlugin(),
-      viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
       nitro({ ... }),
```

### apps/docs/vite.config.ts

```diff
-import tsConfigPaths from "vite-tsconfig-paths"

 export default defineConfig({
   resolve: {
+    tsconfigPaths: true,
     dedupe: ["fumadocs-core"],
   },
   plugins: [
     mdx(await import("./source.config")),
-    tsConfigPaths({ projects: ["./tsconfig.json"] }),
     tailwindcss(),
```

### root package.json (remove after ecosystem catches up)

```diff
+  "overrides": {
+    "vite": "^8.0.0"
+  }
```

The override forces all transitive `vite` dependencies (nitro, @tailwindcss/vite, @tanstack/devtools-vite, vitefu) to resolve to v8 instead of bundling their own v7 copies. Without it, nitro's pinned `optionalDependencies: { vite: "7.3.1" }` causes a `Missing field 'moduleType'` error from version mismatch between Rolldown (v8) and Vite's transform pipeline (v7).

## Nitro compatibility notes

- `nitro@3.0.1-alpha.2` pins `vite: 7.3.1` as an optional dep — needs the override
- `nitro@3.0.260311-beta` uses `vite: ^7 || ^8` as a peer dep (no override needed) but had the same server function deserialization issue, plus different API surface that may need TanStack Start adaptation
- The server function issue exists with BOTH nitro versions — it's a TanStack Start + Vite 8 incompatibility

## Plugin compatibility at time of attempt

| Plugin                          | Vite 8 peer dep?        | Notes                                              |
| ------------------------------- | ----------------------- | -------------------------------------------------- |
| `@vitejs/plugin-react` v6       | `^8.0.0`                | works                                              |
| `@tailwindcss/vite` 4.2.1       | `^5 \|\| ^6 \|\| ^7`    | insiders build has `^8`, stable imminent           |
| `@tanstack/react-start` 1.166.8 | `>=7.0.0`               | peer dep ok, but server fns broken in dev          |
| `nitro` 3.0.1-alpha.2           | optional dep pins 7.3.1 | override needed                                    |
| `vite-tsconfig-paths`           | `*`                     | works, but unnecessary — Vite 8 has native support |
| `@tanstack/devtools-vite` 0.5.5 | `^6 \|\| ^7`            | dev-only, works with override                      |
| `fumadocs-mdx`                  | `6.x \|\| 7.x \|\| 8.x` | works                                              |
| `@sentry/tanstackstart-react`   | no vite peer            | works                                              |

## Key Vite 8 changes (from migration guide)

- **Rolldown replaces Rollup + esbuild** for bundling and dep optimization
- **Oxc replaces esbuild** for JS transforms and minification
- **Lightning CSS** for CSS minification by default
- **Native tsconfig paths** via `resolve.tsconfigPaths: true` (replaces `vite-tsconfig-paths`)
- `build.rollupOptions` deprecated → `build.rolldownOptions` (auto-converted)
- `onwarn` removed from rolldownOptions type
- Migration guide: https://vite.dev/guide/migration

---

## Phase 2: Vite+ migration (after Vite 8 is unblocked)

Vite+ is a unified toolchain that combines Vite, Vitest, Oxlint, Oxfmt, Rolldown, and tsdown under a single `vp` CLI. It bundles Vite 8 internally — `vite-plus` replaces the `vite` package.

Migration guide: https://viteplus.dev/guide/migrate

### 1. Install the `vp` CLI

```bash
curl -fsSL https://vite.plus | bash
```

### 2. Run `vp migrate`

From the `apps/web` directory:

```bash
vp migrate
```

This will:

- Update dependencies (`vite` → `vite-plus`)
- Rewrite imports
- Merge tool configs into `vite.config.ts`
- Update scripts to `vp` commands

Most projects need manual adjustments after — see steps below.

### 3. Import rewrites

```diff
 // apps/web/vite.config.ts
-import { defineConfig, type PluginOption } from "vite"
+import { defineConfig, type PluginOption } from "vite-plus"
```

Any other files importing from `vite` need the same rewrite.

### 4. Script updates

Update `apps/web/package.json` scripts:

| Old            | New          |
| -------------- | ------------ |
| `vite dev`     | `vp dev`     |
| `vite build`   | `vp build`   |
| `vite preview` | `vp preview` |
| `oxlint`       | `vp lint`    |
| `oxfmt`        | `vp fmt`     |

The root `preflight` script should continue to work — it calls workspace scripts which will now use `vp` internally.

### 5. Config consolidation (optional)

Oxlint and Oxfmt configs can optionally be merged into `vite.config.ts`:

```ts
// apps/web/vite.config.ts
import { defineConfig } from "vite-plus"

export default defineConfig({
  // existing config...
  lint: {
    // oxlint rules — replaces .oxlintrc.json
  },
  fmt: {
    // oxfmt options — replaces .oxfmtrc.json
  },
})
```

### 6. Decisions for this project

- **Keep Bun test** — `vp test` (Vitest) is optional, our tests use Bun's test runner
- **Keep Bun as package manager** — run `vp env off` to prevent Vite+ from managing the runtime/package manager
- **Keep standalone `.oxlintrc.json` / `.oxfmtrc.json` at monorepo root** — there's no root `vite.config.ts` to consolidate into, and the root configs apply to both `apps/web` and `apps/docs`
- **Skip pre-commit hooks** — keep manual `bun preflight` workflow

### 7. Remove old dependencies

After confirming everything works:

```diff
 // apps/web/package.json
 devDependencies:
-  "vite": "^8.0.0",
   // vite-plus replaces vite
```

Also remove the root `overrides` for vite if no longer needed — `vite-plus` bundles its own Vite 8.

### 8. Docs app

`apps/docs` also needs migration. Same pattern — `vite` → `vite-plus` import rewrite and script updates. Run `vp migrate` from `apps/docs` separately.

### Verification

```bash
bun run preflight   # lint, format, typecheck, tests
bun dev             # test client-side navigation to /posts, /users
bun run build       # production build
```
