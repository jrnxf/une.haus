// Entry of /sw.js, built by build/service-worker-plugin.ts and registered in
// src/routes/__root.tsx. The behaviour lives in src/lib/pwa/offline-worker.ts.
import geistMono from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?inline"

import { startOfflineWorker } from "~/lib/pwa/offline-worker"
import page from "~/lib/pwa/offline.html?raw"

declare const self: Parameters<typeof startOfflineWorker>[0]

startOfflineWorker(self, page.replace("GEIST_MONO_URL", geistMono))
