export const SITE_NAME = "une.haus"
export const SITE_URL = "https://une.haus"

type SeoInput = {
  title: string
  description: string
  path: string
  image?: string
  type?: string
  card?: "summary" | "summary_large_image"
}

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

export function seo({ title, description, path, image, type, card }: SeoInput) {
  const pageTitle = title === SITE_NAME ? SITE_NAME : `${title} — ${SITE_NAME}`
  const url = `${SITE_URL}${path}`
  const ogImage = image ?? DEFAULT_OG_IMAGE

  return {
    meta: [
      { title: pageTitle },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: type ?? "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: card ?? "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:url", content: url },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
  }
}
