import { Resvg } from "@resvg/resvg-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  STARTUP_LOGO,
  STARTUP_LOGO_WIDTH,
  STARTUP_PAPER,
  STARTUP_PICTURES,
  type StartupPicture,
} from "../src/lib/pwa/startup-screens"

import type { Plugin } from "vite"

// The wordmark's viewBox is 195x60.
const LOGO_ASPECT = 60 / 195

function draw(
  picture: StartupPicture,
  publicDir: string,
  logos: Map<string, string>,
) {
  const { width, height, ratio } = picture
  let logo = logos.get(STARTUP_LOGO)
  if (!logo) {
    const svg = readFileSync(join(publicDir, "icons", STARTUP_LOGO))
    logo = `data:image/svg+xml;base64,${svg.toString("base64")}`
    logos.set(STARTUP_LOGO, logo)
  }
  const logoWidth = STARTUP_LOGO_WIDTH * ratio
  const logoHeight = logoWidth * LOGO_ASPECT
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${STARTUP_PAPER.dark}" />
    <image href="${logo}" x="${(width - logoWidth) / 2}" y="${(height - logoHeight) / 2}" width="${logoWidth}" height="${logoHeight}" />
  </svg>`
  return new Resvg(svg).render().asPng()
}

/**
 * Draws the iOS startup pictures declared in `src/lib/pwa/startup-screens.ts`:
 * written into the client build, and served on demand by the dev server.
 */
export function startupImages(): Plugin {
  let publicDir = ""
  const logos = new Map<string, string>()
  return {
    name: "startup-images",
    configResolved(config) {
      publicDir = config.publicDir
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0]?.slice(1)
        const picture = STARTUP_PICTURES.find(({ file }) => file === path)
        if (!picture) return next()
        res.setHeader("content-type", "image/png")
        res.end(draw(picture, publicDir, logos))
      })
    },
    generateBundle() {
      // The server environment is built in the same run; the pictures belong
      // with the client assets only.
      if (this.environment.name !== "client") return
      for (const picture of STARTUP_PICTURES) {
        this.emitFile({
          type: "asset",
          fileName: picture.file,
          source: draw(picture, publicDir, logos),
        })
      }
    },
  }
}
