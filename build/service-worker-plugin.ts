import { resolve } from "node:path"
import { build, type Plugin, type Rollup } from "vite"

const ENTRY = "src/service-worker.ts"

/**
 * Builds the service worker into the client assets as `/sw.js`. Its name has
 * no hash: the browser finds a new worker by fetching the same address and
 * comparing bytes. `public/_headers` keeps it from being cached.
 *
 * It is bundled by a build of its own rather than as a second entry of the
 * client build, which TanStack Start's manifest does not allow, and so it
 * shares no chunk with the app.
 */
export function serviceWorker(): Plugin {
  let root = ""
  return {
    name: "service-worker",
    apply: "build",
    configResolved(config) {
      root = config.root
    },
    async generateBundle() {
      if (this.environment.name !== "client") return
      const output = (await build({
        configFile: false,
        root,
        logLevel: "warn",
        publicDir: false,
        resolve: { alias: { "~": resolve(root, "src") } },
        build: {
          write: false,
          rollupOptions: {
            input: resolve(root, ENTRY),
            output: { format: "iife", entryFileNames: "sw.js" },
          },
        },
      })) as Rollup.RollupOutput
      const chunk = output.output.find(
        (file): file is Rollup.OutputChunk =>
          file.type === "chunk" && file.isEntry,
      )
      if (!chunk) throw new Error(`no service worker built from ${ENTRY}`)
      this.emitFile({ type: "asset", fileName: "sw.js", source: chunk.code })
    },
  }
}
