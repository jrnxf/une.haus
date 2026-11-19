import { readFileSync } from "node:fs"

import type { Plugin } from "vite"

// The Anthropic SDK keeps every Node built-in import in one module,
// internal/node.mjs, and its package.json swaps it for node.browser.mjs in
// browsers. The Worker build does not use the browser field, so the Node
// module gets in, and Rollup turns its `export * as` re-exports into names
// that are never bound ("cp is not defined"). That crashed every app page.
// We use none of the SDK paths that need Node (file store, local tools), so
// load the stub, which throws only if one of those paths runs.
const NODE_MODULE = /@anthropic-ai[\\/]sdk[\\/]internal[\\/]node\.mjs$/

export function anthropicSdkWorker(): Plugin {
  return {
    name: "anthropic-sdk-worker",
    enforce: "pre",
    load(id) {
      if (!NODE_MODULE.test(id)) return null
      return readFileSync(id.replace(/node\.mjs$/, "node.browser.mjs"), "utf8")
    },
  }
}
