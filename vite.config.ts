import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { defineConfig } from "vite";
import { beasties } from "vite-plugin-beasties";
import { VitePWA } from "vite-plugin-pwa";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  server: {
    allowedHosts: [
      // put ngrok url here
    ],
  },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    beasties({
      options: {
        fonts: true,
        logger: {
          debug: (msg) => process.stdout.write(`[BEASTIES-DEBUG] ${msg}\n`),
          error: (msg) => process.stderr.write(`[BEASTIES-ERROR] ${msg}\n`),
          info: (msg) => process.stdout.write(`[BEASTIES-INFO] ${msg}\n`),
          trace: (msg) => process.stdout.write(`[BEASTIES-TRACE] ${msg}\n`),
          warn: (msg) => process.stderr.write(`[BEASTIES-WARN] ${msg}\n`),
        },
      },
    }),
    tanstackStart(),
    nitroV2Plugin({ preset: "bun", compatibilityDate: "latest" }),
    viteReact(),
  ],
});

export default config;
