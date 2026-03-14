import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import mdx from "fumadocs-mdx/vite"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  server: { port: 3001 },
  resolve: {
    dedupe: ["fumadocs-core"],
    alias: {
      "node:path": "pathe",
    },
  },
  ssr: {
    noExternal: ["fumadocs-core", "fumadocs-ui"],
  },
  plugins: [
    mdx(await import("./source.config")),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
})
