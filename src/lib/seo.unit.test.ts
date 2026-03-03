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

  it("sets og:title without site name", () => {
    const result = seo(base)
    const ogTitle = result.meta.find(
      (m) => "property" in m && m.property === "og:title",
    )
    expect(ogTitle).toEqual({ property: "og:title", content: "Colby Thomas" })
  })

  it("builds full url from path", () => {
    const result = seo(base)
    const ogUrl = result.meta.find(
      (m) => "property" in m && m.property === "og:url",
    )
    expect(ogUrl).toEqual({
      property: "og:url",
      content: `${SITE_URL}/users/1`,
    })
  })

  it("sets canonical link", () => {
    const result = seo(base)
    expect(result.links).toEqual([
      { rel: "canonical", href: `${SITE_URL}/users/1` },
    ])
  })

  it("sets og:site_name", () => {
    const result = seo(base)
    const siteName = result.meta.find(
      (m) => "property" in m && m.property === "og:site_name",
    )
    expect(siteName).toEqual({ property: "og:site_name", content: SITE_NAME })
  })

  it("defaults og:type to website", () => {
    const result = seo(base)
    const ogType = result.meta.find(
      (m) => "property" in m && m.property === "og:type",
    )
    expect(ogType).toEqual({ property: "og:type", content: "website" })
  })

  it("allows custom og:type", () => {
    const result = seo({ ...base, type: "profile" })
    const ogType = result.meta.find(
      (m) => "property" in m && m.property === "og:type",
    )
    expect(ogType).toEqual({ property: "og:type", content: "profile" })
  })

  it("defaults twitter:card to summary", () => {
    const result = seo(base)
    const card = result.meta.find(
      (m) => "name" in m && m.name === "twitter:card",
    )
    expect(card).toEqual({ name: "twitter:card", content: "summary" })
  })

  it("allows summary_large_image card", () => {
    const result = seo({ ...base, card: "summary_large_image" })
    const card = result.meta.find(
      (m) => "name" in m && m.name === "twitter:card",
    )
    expect(card).toEqual({
      name: "twitter:card",
      content: "summary_large_image",
    })
  })

  it("sets twitter:url", () => {
    const result = seo(base)
    const twitterUrl = result.meta.find(
      (m) => "name" in m && m.name === "twitter:url",
    )
    expect(twitterUrl).toEqual({
      name: "twitter:url",
      content: `${SITE_URL}/users/1`,
    })
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

  it("omits image tags when no image", () => {
    const result = seo(base)
    const ogImage = result.meta.find(
      (m) => "property" in m && m.property === "og:image",
    )
    const twitterImage = result.meta.find(
      (m) => "name" in m && m.name === "twitter:image",
    )
    expect(ogImage).toBeUndefined()
    expect(twitterImage).toBeUndefined()
  })

  it("sets meta description", () => {
    const result = seo(base)
    const desc = result.meta.find(
      (m) => "name" in m && m.name === "description",
    )
    expect(desc).toEqual({
      name: "description",
      content: "A profile on une.haus",
    })
  })

  it("sets twitter:title without site name", () => {
    const result = seo(base)
    const twitterTitle = result.meta.find(
      (m) => "name" in m && m.name === "twitter:title",
    )
    expect(twitterTitle).toEqual({
      name: "twitter:title",
      content: "Colby Thomas",
    })
  })

  it("sets twitter:description", () => {
    const result = seo(base)
    const twitterDesc = result.meta.find(
      (m) => "name" in m && m.name === "twitter:description",
    )
    expect(twitterDesc).toEqual({
      name: "twitter:description",
      content: "A profile on une.haus",
    })
  })
})
