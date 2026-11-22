import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  LockIcon,
  TrafficConeIcon,
  UsersIcon,
} from "lucide-react"

import { AskCompose } from "~/components/ask/ask-compose"
import { PodiumIcon } from "~/components/icons/podium-icon"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { buttonVariants } from "~/components/ui/button"
import { useAskThread } from "~/lib/ask/thread-context"
import { home } from "~/lib/home"
import { getMuxPoster } from "~/lib/mux/poster"
import { SITE_NAME, SITE_URL, seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { cn } from "~/lib/utils"

import type { ComponentType, ReactNode } from "react"

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(home.board.queryOptions())
  },
  head: () =>
    seo({
      title: SITE_NAME,
      description:
        "une.haus — all things une. play games, post, chat, and connect with riders worldwide.",
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
        "all things une. play games, post, chat, and connect with riders worldwide.",
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
        "all things une. play games, post, chat, and connect with riders worldwide.",
      inLanguage: "en-US",
    },
    {
      "@type": "SiteNavigationElement",
      "@id": `${SITE_URL}/#navigation`,
      name: "main navigation",
      hasPart: [
        {
          "@type": "SiteNavigationElement",
          name: "ask",
          url: `${SITE_URL}/ask`,
        },
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

type Board = Awaited<ReturnType<typeof home.board.fn>>
type HomeHero = NonNullable<Board["hero"]>

// On a laptop the board fills the screen below the header, so chat and posts
// may get shorter than their lists. The list wraps into a hidden second column
// instead of growing, so it shows only the items that fit whole.
const panel =
  "bg-card flex min-h-0 min-w-0 flex-col gap-4 rounded-xl border p-6 lg:p-4"
const panelList = "flex min-h-0 flex-col flex-wrap gap-4 overflow-hidden"

function PanelLabel({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground group-hover:text-foreground flex items-center justify-between text-xs transition-colors">
      <span>{children}</span>
      <ArrowRightIcon className="size-3.5" />
    </div>
  )
}

// The text and the link of each hero. See getHomeHero for which one shows.
function heroCopy(hero: HomeHero) {
  switch (hero.kind) {
    case "riu":
      return {
        cta: "play",
        eyebrow: "games / rack it up",
        lines: hero.sets.map((set) => ({ by: set.rider, text: set.name })),
        title: `round ${hero.riuId}`,
      }
    case "biu":
      return {
        cta: "play",
        eyebrow: "games / back it up",
        lines: [{ by: hero.rider, text: "set by" }],
        note: "back it up, then set the next trick.",
        title: hero.trick,
      }
    case "lastRiu":
      return {
        cta: "view",
        eyebrow: "games / rack it up / last round",
        lines: hero.sets.map((set) => ({ by: set.rider, text: set.name })),
        title: `round ${hero.riuId}`,
      }
  }
}

const heroLink =
  "bg-card group relative flex min-h-96 min-w-0 flex-col justify-end overflow-clip rounded-xl border p-6 text-white lg:col-span-7 lg:min-h-0"

function HeroLink({ hero, children }: { hero: HomeHero; children: ReactNode }) {
  switch (hero.kind) {
    case "riu":
      return (
        <Link to="/games/rius/active" className={heroLink}>
          {children}
        </Link>
      )
    case "biu":
      return (
        <Link
          to="/games/bius/$roundId"
          params={{ roundId: hero.biuId }}
          className={heroLink}
        >
          {children}
        </Link>
      )
    case "lastRiu":
      return (
        <Link
          to="/games/rius/archived/$riuId"
          params={{ riuId: String(hero.riuId) }}
          className={heroLink}
        >
          {children}
        </Link>
      )
  }
}

function HeroPanel({ hero }: { hero: HomeHero }) {
  const copy = heroCopy(hero)

  return (
    <HeroLink hero={hero}>
      <img
        src={getMuxPoster({ playbackId: hero.playbackId, width: 1280 })}
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative flex flex-col gap-4">
        <span className="text-xs text-white/75">{copy.eyebrow}</span>
        <h2 className="text-3xl font-semibold">{copy.title}</h2>
        <ul className="flex flex-col gap-1 text-sm text-white/85">
          {copy.lines.map((line) => (
            <li
              key={`${line.text}-${line.by}`}
              className="flex min-w-0 items-center gap-2"
            >
              <span className="truncate">{line.text}</span>
              <span className="shrink-0 text-xs text-white/60">{line.by}</span>
            </li>
          ))}
        </ul>
        {copy.note ? (
          <p className="text-sm text-white/75">{copy.note}</p>
        ) : null}
        <div>
          <span className={buttonVariants({ variant: "secondary" })}>
            {copy.cta}
          </span>
        </div>
      </div>
    </HeroLink>
  )
}

function ChatPanel({
  messages,
  className,
}: {
  messages: Board["chat"]
  className?: string
}) {
  return (
    <Link to="/chat" className={cn(panel, "group", className)}>
      <PanelLabel>chat</PanelLabel>
      <ul className={panelList}>
        {messages.map((message) => (
          <li key={message.id} className="flex w-full min-w-0 gap-3">
            <Avatar
              className="size-8 shrink-0"
              cloudflareId={message.user.avatarId}
              alt={message.user.name}
            >
              <AvatarImage width={64} quality={85} />
              <AvatarFallback name={message.user.name} />
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium">{message.user.name}</div>
              <div className="text-muted-foreground line-clamp-2 text-sm">
                <RichText content={message.content} mentionMode="plainText" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Link>
  )
}

function PostsPanel({
  posts,
  className,
}: {
  posts: Board["posts"]
  className?: string
}) {
  return (
    <div className={cn(panel, className)}>
      <Link to="/posts" className="group">
        <PanelLabel>posts</PanelLabel>
      </Link>
      <ul className={panelList}>
        {posts.map((post) => (
          <li key={post.id} className="w-full min-w-0">
            <Link
              to="/posts/$postId"
              params={{ postId: post.id }}
              className="group block min-w-0"
            >
              <div className="truncate text-sm font-medium group-hover:underline">
                {post.title}
              </div>
              <div className="text-muted-foreground line-clamp-1 text-sm">
                <RichText content={post.content} mentionMode="plainText" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionCard({
  to,
  icon: Icon,
  title,
  line,
  className,
}: {
  to: "/games" | "/tricks" | "/vault" | "/users"
  icon: ComponentType<{ className?: string }>
  title: string
  line: string
  className: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        "bg-card focus-visible:ring-ring/50 flex min-w-0 flex-col gap-1 rounded-xl border p-4 outline-none focus-visible:ring-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-3.5" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{line}</p>
    </Link>
  )
}

function RouteComponent() {
  const { data: board } = useSuspenseQuery(home.board.queryOptions())
  const sessionUser = useSessionUser()
  const navigate = useNavigate()
  const { ask } = useAskThread()

  // A member's question starts a new thread and opens /ask, where the answer
  // streams. A guest signs in first, and the question waits in the box.
  function onAsk(question: string) {
    if (!sessionUser) {
      void navigate({
        to: "/auth",
        search: { redirect: `/ask?q=${encodeURIComponent(question)}` },
      })
      return
    }
    void ask(question, { fresh: true })
    void navigate({ to: "/ask" })
  }

  // With no hero, chat and posts share the row and games joins the cards.
  const { hero } = board
  const cardSpan = hero ? "lg:col-span-4" : "lg:col-span-3"

  return (
    <>
      <PageHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* On a laptop the board fills the screen, so the page does not scroll.
          Only the middle row gives up height, down to a floor. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6 lg:min-h-0 lg:flex-1">
        <h1 className="sr-only">{SITE_NAME}</h1>
        <div className="shrink-0">
          <AskCompose busy={false} followUp={false} used={null} onAsk={onAsk} />
        </div>
        {hero ? (
          <div className="grid grid-cols-1 gap-4 lg:min-h-96 lg:grid-cols-12 lg:grid-rows-1">
            <HeroPanel hero={hero} />
            <div className="flex min-h-0 flex-col gap-4 lg:col-span-5">
              <ChatPanel messages={board.chat} className="lg:shrink-0" />
              <PostsPanel posts={board.posts} className="lg:grow" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-2 lg:grid-rows-1">
            <ChatPanel messages={board.chat} />
            <PostsPanel posts={board.posts} />
          </div>
        )}
        <div className="grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-12">
          {hero ? null : (
            <SectionCard
              to="/games"
              icon={PodiumIcon}
              title="games"
              line="rack it up, back it up and stack it up."
              className={cardSpan}
            />
          )}
          <SectionCard
            to="/tricks"
            icon={TrafficConeIcon}
            title="tricks"
            line="every trick, who landed it first, and how the tricks connect."
            className={cardSpan}
          />
          <SectionCard
            to="/vault"
            icon={LockIcon}
            title="vault"
            line="the old videos, kept safe and easy to find."
            className={cardSpan}
          />
          <SectionCard
            to="/users"
            icon={UsersIcon}
            title="users"
            line="riders from around the world, on a list and on a globe."
            className={cardSpan}
          />
        </div>
      </div>
    </>
  )
}
