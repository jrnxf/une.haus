import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import mdx from "fumadocs-mdx/vite"
import { nitro } from "nitro/vite"
import { defineConfig, type Plugin } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

function aliasNodePath(): Plugin {
  return {
    name: "alias-node-path",
    enforce: "pre",
    async resolveId(source, importer) {
      if (source === "node:path" && this.environment?.name !== "nitro") {
        return this.resolve("pathe", importer, { skipSelf: true })
      }
    },
  }
}

export default defineConfig({
  server: { port: 3001 },
  resolve: {
    dedupe: ["fumadocs-core"],
  },
  ssr: {
    noExternal: ["fumadocs-core", "fumadocs-ui"],
  },
  plugins: [
    aliasNodePath(),
    mdx(await import("./source.config")),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    nitro({
      preset: "bun",
      compatibilityDate: "latest",
    }),
    tanstackStart(),
    react(),
  ],
})
