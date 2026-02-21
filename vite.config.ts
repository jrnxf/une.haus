import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// import { beasties } from "vite-plugin-beasties";
import type { LoggingFunction, RollupLog } from "rollup";
import { defineConfig, type PluginOption } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

import { TASK_NAMES } from "./src/lib/tasks/constants";

const devtoolsPlugin = async (): Promise<PluginOption> => {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  const { devtools } = await import("@tanstack/devtools-vite");
  return devtools({
    editor: {
      name: "Cursor",
      open: async (path, lineNumber, columnNumber) => {
        const { spawn } = await import("node:child_process");
        // Escape $ to prevent shell expansion in cursor's eval
        const escapedPath = path.replaceAll("$", String.raw`\$`);
        spawn("cursor", [
          "-g",
          `${escapedPath}${lineNumber ? `:${lineNumber}` : ""}${columnNumber ? `:${columnNumber}` : ""}`,
        ]);
      },
    },
  });
};

const config = defineConfig(async () => ({
  build: {
    rollupOptions: {
      onwarn(warning: RollupLog, defaultHandler: LoggingFunction) {
        // "use client"/"use server" directives trigger Rollup warnings — safe to ignore
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        defaultHandler(warning);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types here are not yet updated for nitro
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
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
}));

export default config;
