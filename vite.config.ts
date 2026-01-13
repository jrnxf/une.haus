import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig, type PluginOption } from "vite";
// import { beasties } from "vite-plugin-beasties";
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
        const { exec } = await import("node:child_process");
        exec(
          `cursor -g "${path.replaceAll("$", "\\$")}${lineNumber ? `:${lineNumber}` : ""}${columnNumber ? `:${columnNumber}` : ""}"`,
        );
      },
    },
  });
};

const config = defineConfig(async () => ({
  server: {
    allowedHosts: [
      // put ngrok url here
    ],
  },
  plugins: [
    await devtoolsPlugin(),
    nitro({
      preset: "bun",
      compatibilityDate: "latest",
      experimental: {
        tasks: true,
        vite: {
          serverReload: true,
        },
      },
      tasks: {
        [TASK_NAMES.RIUS_ROTATE]: {
          handler: "~/lib/tasks/rius/rotate",
          description:
            "Rotate RIUs: archive active, activate upcoming, create new upcoming",
        },
        [TASK_NAMES.HEARTBEAT]: {
          handler: "~/lib/tasks/heartbeat",
          description: "Heartbeat task that logs the current time every minute",
        },
      },
      scheduledTasks: {
        // Heartbeat: run every minute
        "* * * * *": [TASK_NAMES.HEARTBEAT],
        // Run RIU rotation at midnight (00:00) every Monday (server timezone)
        // Cron: minute(0) hour(0) day(*) month(*) weekday(1=Monday)
        "0 0 * * 1": [TASK_NAMES.RIUS_ROTATE],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types here are not yet updated for nitro
    } as any),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
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
