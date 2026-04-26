import { cloudflare } from "@cloudflare/vite-plugin"
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { execSync } from "node:child_process"
import { type LoggingFunction, type RollupLog } from "rollup"
import { defineConfig, type PluginOption } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const devtoolsPlugin = async (): Promise<PluginOption> => {
  const { devtools } = await import("@tanstack/devtools-vite")
  return devtools({
    removeDevtoolsOnBuild: true,
    editor: {
      name: "Cursor",
      open: async (path, lineNumber, columnNumber) => {
        const { spawn } = await import("node:child_process")
        spawn("cursor", [
          "-g",
          `${path}${lineNumber ? `:${lineNumber}` : ""}${columnNumber ? `:${columnNumber}` : ""}`,
        ])
      },
    },
  })
}

const gitSha = (() => {
  if (process.env.CF_PAGES_COMMIT_SHA)
    return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7)
  if (process.env.WORKERS_CI_COMMIT_SHA)
    return process.env.WORKERS_CI_COMMIT_SHA.slice(0, 7)
  if (process.env.RAILWAY_GIT_COMMIT_SHA)
    return process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7)
  try {
    return execSync("git rev-parse --short HEAD").toString().trim()
  } catch {
    return "unknown"
  }
})()

const config = defineConfig(async () => {
  return {
    define: {
      __COMMIT_SHA__: JSON.stringify(gitSha),
    },
    build: {
      rollupOptions: {
        onwarn(warning: RollupLog, defaultHandler: LoggingFunction) {
          // "use client"/"use server" directives trigger Rollup warnings — safe to ignore
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return
          defaultHandler(warning)
        },
      },
    },
    server: {
      allowedHosts: [
        // put ngrok url here
      ],
    },
    plugins: [
      await devtoolsPlugin(),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tanstackStart({
        importProtection: {
          behavior: {
            build: "mock",
            dev: "error",
          },
        },
      }),
      // react's vite plugin must come after start's vite plugin
      viteReact(),
      sentryTanstackStart({
        org: "jrnxf",
        project: "unehaus",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ].filter(Boolean) as PluginOption[],
  }
})

export default config
