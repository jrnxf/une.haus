import { describe, expect, it } from "bun:test"

import { seo, SITE_NAME, SITE_URL } from "./seo"

describe("seo", () => {
  const base = {
    title: "Colby Thomas",
    description: "A profile on une.haus",
    path: "/users/1",
  }

  it("sets page title with site name suffix", () => {
    const result = seo(base)
    const title = result.meta.find((m) => "title" in m)
    expect(title).toEqual({ title: `Colby Thomas — ${SITE_NAME}` })
  })

  it("sets og:title without site name suffix", () => {
    const result = seo(base)
    const ogTitle = result.meta.find(
      (m) => "property" in m && m.property === "og:title",
    )
    expect(ogTitle).toEqual({ property: "og:title", content: "Colby Thomas" })
  })

  it("builds canonical URL from path", () => {
    const result = seo(base)
    expect(result.links).toEqual([
      { rel: "canonical", href: `${SITE_URL}/users/1` },
    ])
  })

  it("includes image tags when image is provided", () => {
    const result = seo({ ...base, image: "https://example.com/avatar.jpg" })
    const ogImage = result.meta.find(
      (m) => "property" in m && m.property === "og:image",
    )
    const twitterImage = result.meta.find(
      (m) => "name" in m && m.name === "twitter:image",
    )
    expect(ogImage).toEqual({
      property: "og:image",
      content: "https://example.com/avatar.jpg",
    })
    expect(twitterImage).toEqual({
      name: "twitter:image",
      content: "https://example.com/avatar.jpg",
    })
  })

  it("uses default og image when no image provided", () => {
    const result = seo(base)
    const ogImage = result.meta.find(
      (m) => "property" in m && m.property === "og:image",
    )
    expect(ogImage).toEqual({
      property: "og:image",
      content: `${SITE_URL}/og-image.png`,
    })
  })

  it("does not duplicate site name in title when title matches site name", () => {
    const result = seo({
      title: SITE_NAME,
      description: "home page",
      path: "/",
    })
    const title = result.meta.find((m) => "title" in m)
    expect(title).toEqual({ title: SITE_NAME })
  })

  it("allows custom og:type and twitter:card", () => {
    const result = seo({
      ...base,
      type: "profile",
      card: "summary_large_image",
    })
    const ogType = result.meta.find(
      (m) => "property" in m && m.property === "og:type",
    )
    const card = result.meta.find(
      (m) => "name" in m && m.name === "twitter:card",
    )
    expect(ogType).toEqual({ property: "og:type", content: "profile" })
    expect(card).toEqual({
      name: "twitter:card",
      content: "summary_large_image",
    })
  })
})
