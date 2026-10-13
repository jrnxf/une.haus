import { describe, expect, test } from "bun:test"

import { STARTUP_LINKS, STARTUP_PICTURES } from "./startup-screens"

describe("startup screens", () => {
  test("every picture has a unique file and a unique media query", () => {
    expect(new Set(STARTUP_PICTURES.map((p) => p.file)).size).toBe(
      STARTUP_PICTURES.length,
    )
    expect(new Set(STARTUP_PICTURES.map((p) => p.media)).size).toBe(
      STARTUP_PICTURES.length,
    )
  })

  test("a link points at every picture, in the same order", () => {
    expect(STARTUP_LINKS.map((l) => l.href)).toEqual(
      STARTUP_PICTURES.map((p) => `/${p.file}`),
    )
    expect(STARTUP_LINKS.map((l) => l.media)).toEqual(
      STARTUP_PICTURES.map((p) => p.media),
    )
  })

  test("the pixel size matches the screen the media query selects", () => {
    for (const picture of STARTUP_PICTURES) {
      const [, w, h, r] =
        /device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d+)\) and \(orientation: (?:portrait|landscape)\)/
          .exec(picture.media)
          ?.slice(0, 4) ?? []
      const portrait = picture.media.endsWith("(orientation: portrait)")
      expect(picture.ratio).toBe(Number(r))
      expect(picture.width).toBe(Number(portrait ? w : h) * Number(r))
      expect(picture.height).toBe(Number(portrait ? h : w) * Number(r))
    }
  })
})
