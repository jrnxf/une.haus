import { defineConfig } from "@tanstack/react-start/config";

import tailwindcss from "@tailwindcss/vite";
import { beasties } from "vite-plugin-beasties";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  tsr: {
    appDirectory: "./src",
  },
  server: {
    preset: "netlify-edge",
  },
  vite: {
    // @ts-expect-error @tanstack/react-start uses `Omit` for server to limit me
    // from using `allowedHosts`, however it does seem to pass the values I
    // supply through - which is great because I need it to in order to let me
    // use ngrok with vite in dev mode
    server: {
      allowedHosts: [
        // put your ngrok url here
      ],
    },
    plugins: [
      tsConfigPaths({
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
    ],
  },
});
