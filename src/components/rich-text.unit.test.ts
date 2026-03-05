import { describe, expect, it } from "bun:test"

import { resolveMentionMode } from "./rich-text"

describe("resolveMentionMode", () => {
  it("defaults to link mode", () => {
    expect(resolveMentionMode({})).toBe("link")
  })

  it("maps disableLinks=true to accentText", () => {
    expect(resolveMentionMode({ disableLinks: true })).toBe("accentText")
  })

  it("keeps link mode when disableLinks=false", () => {
    expect(resolveMentionMode({ disableLinks: false })).toBe("link")
  })

  it("prefers explicit mentionMode over disableLinks", () => {
    expect(
      resolveMentionMode({
        mentionMode: "plainText",
        disableLinks: true,
      }),
    ).toBe("plainText")
  })
})
