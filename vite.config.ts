import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { execSync } from "node:child_process"
// import { beasties } from "vite-plugin-beasties";
import { type LoggingFunction, type RollupLog } from "rollup"
import { defineConfig, type PluginOption } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

import { TASK_NAMES } from "./src/lib/tasks/constants"

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
  try {
    return execSync("git rev-parse --short HEAD").toString().trim()
  } catch {
    return "unknown"
  }
})()

const gitBranch = (() => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
  } catch {
    return "unknown"
  }
})()

const config = defineConfig(async () => {
  return {
    define: {
      __COMMIT_SHA__: JSON.stringify(process.env.COMMIT_SHA ?? gitSha),
      __COMMIT_BRANCH__: JSON.stringify(process.env.COMMIT_BRANCH ?? gitBranch),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
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
      // this is the plugin that enables path aliases - must come before nitro
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      nitro({
        preset: "bun",
        compatibilityDate: "latest",
        serverDir: "./server",
        experimental: {
          tasks: true,
          vite: {
            serverReload: true,
          },
        },
        scheduledTasks: {
          // Heartbeat: run every minute
          "* * * * *": [TASK_NAMES.HEARTBEAT],
          // Run RIU rotation at midnight (00:00) every Monday (server timezone)
          // Cron: minute(0) hour(0) day(*) month(*) weekday(1=Monday)
          "0 0 * * 1": [TASK_NAMES.RIUS_ROTATE],
          // Every hour at :00 — digest checks user's configured hour/day,
          // game-start checks hours-until-rotation with 1h window
          "0 * * * *": [
            TASK_NAMES.NOTIFICATIONS_SEND_DIGESTS,
            TASK_NAMES.NOTIFICATIONS_GAME_START_REMINDERS,
          ],
          // Once daily at midnight UTC — checks days-until-rotation
          "0 0 * * *": [TASK_NAMES.NOTIFICATIONS_PRE_TRICK_REMINDERS],
        },
      } as any),
      tailwindcss(),
      // beasties({
      //   options: {
      //     fonts: true,
      //     logger: {
      //       debug: (msg) => process.stdout.write(`[BEASTIES-DEBUG] ${msg}\n`),
      //       error: (msg) => process.stderr.write(`[BEASTIES-ERROR] ${msg}\n`),
      //       info: (msg) => process.stdout.write(`[BEASTIES-INFO] ${msg}\n`),
      //       trace: (msg) => process.stdout.write(`[BEASTIES-TRACE] ${msg}\n`),
      //       warn: (msg) => process.stderr.write(`[BEASTIES-WARN] ${msg}\n`),
      //     },
      //   },
      // }),
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
    ].filter(Boolean) as PluginOption[],
  }
})

export default config
