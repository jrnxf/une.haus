import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
// import { beasties } from "vite-plugin-beasties";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  server: {
    allowedHosts: [
      // put ngrok url here
    ],
  },
  plugins: [
    nitro({ preset: "bun", compatibilityDate: "latest" }),
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
});

export default config;
