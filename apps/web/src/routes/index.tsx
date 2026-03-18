import { createFileRoute } from "@tanstack/react-router"

import { LogoRandomScatter } from "~/components/logo-animated"
import { PageHeader } from "~/components/page-header"
import { SITE_NAME, SITE_URL, seo } from "~/lib/seo"

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: SITE_NAME,
      description:
        "une.haus — a community hub for unicyclists. play games, share posts, chat, and connect with riders worldwide.",
      path: "/",
    }),
  component: RouteComponent,
})

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description:
        "a community hub for unicyclists. play games, share posts, chat, and connect with riders worldwide.",
      inLanguage: "en-US",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/apple-touch-icon.png`,
      },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: SITE_NAME,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      description:
        "a community hub for unicyclists. play games, share posts, chat, and connect with riders worldwide.",
      inLanguage: "en-US",
    },
    {
      "@type": "SiteNavigationElement",
      "@id": `${SITE_URL}/#navigation`,
      name: "main navigation",
      hasPart: [
        {
          "@type": "SiteNavigationElement",
          name: "games",
          url: `${SITE_URL}/games`,
        },
        {
          "@type": "SiteNavigationElement",
          name: "chat",
          url: `${SITE_URL}/chat`,
        },
        {
          "@type": "SiteNavigationElement",
          name: "users",
          url: `${SITE_URL}/users`,
        },
        {
          "@type": "SiteNavigationElement",
          name: "posts",
          url: `${SITE_URL}/posts`,
        },
      ],
    },
  ],
}

function RouteComponent() {
  return (
    <>
      <PageHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-1 items-center justify-center p-4">
        <LogoRandomScatter className="h-auto w-full max-w-48" />
      </div>
    </>
  )
}
