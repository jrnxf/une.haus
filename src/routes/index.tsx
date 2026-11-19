import {
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  LockIcon,
  type LucideIcon,
  TrafficConeIcon,
  UsersIcon,
} from "lucide-react"

import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { games } from "~/lib/games"
import { messages } from "~/lib/messages"
import { getMuxPoster } from "~/lib/mux/poster"
import { posts } from "~/lib/posts"
import { SITE_NAME, SITE_URL, seo } from "~/lib/seo"

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      // no active round is a normal state between rounds, not an error
      context.queryClient
        .ensureQueryData(games.rius.active.list.queryOptions())
        .catch(() => null),
      context.queryClient.ensureInfiniteQueryData(
        posts.list.infiniteQueryOptions(POSTS_QUERY),
      ),
      context.queryClient.ensureQueryData(
        messages.list.queryOptions(CHAT_QUERY),
      ),
    ])
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

const POSTS_QUERY = {}
const CHAT_QUERY = { type: "chat", id: -1 } as const

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

const panel =
  "bg-card hover:bg-card-2 flex min-w-0 flex-col rounded-3xl p-6 transition-colors duration-150"

function PanelLabel({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-between font-mono text-xs">
      <span>{children}</span>
      <ArrowRightIcon className="size-3.5" />
    </div>
  )
}

function GamePanel() {
  const { data: riu } = useQuery({
    ...games.rius.active.list.queryOptions(),
    retry: false,
  })
  const sets = riu?.sets ?? []
  const lead = sets.find((set) => set.video?.playbackId)
  const poster = getMuxPoster({
    playbackId: lead?.video?.playbackId,
    width: 1280,
  })

  return (
    <Link
      to="/games/rius"
      className="bg-card group relative flex min-h-96 min-w-0 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white lg:col-span-7 lg:row-span-2"
    >
      {poster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative flex flex-col gap-4">
        <span className="font-mono text-xs text-white/75">
          game / rack it up
        </span>
        <h2 className="text-4xl font-medium">
          {riu ? `round ${riu.id}` : "next round soon"}
        </h2>
        {sets.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-white/85">
            {sets.slice(0, 3).map((set) => (
              <li key={set.id} className="flex min-w-0 items-center gap-2">
                <span className="truncate">{set.name}</span>
                <span className="shrink-0 font-mono text-xs text-white/60">
                  {set.user.name}
                </span>
              </li>
            ))}
          </ul>
        )}
        <span className="bg-primary text-primary-foreground w-fit rounded-full px-5 py-2 text-sm font-semibold transition-transform duration-150 ease-out group-active:scale-97">
          play
        </span>
      </div>
    </Link>
  )
}

function ChatPanel() {
  const { data } = useSuspenseQuery(messages.list.queryOptions(CHAT_QUERY))
  const latest = data.messages.slice(-3)

  return (
    <Link to="/chat" className={`${panel} gap-4 lg:col-span-5`}>
      <PanelLabel>chat</PanelLabel>
      <ul className="flex flex-col gap-4">
        {latest.map((message) => (
          <li key={message.id} className="flex min-w-0 gap-3">
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

function PostsPanel() {
  const { data } = useSuspenseInfiniteQuery(
    posts.list.infiniteQueryOptions(POSTS_QUERY),
  )
  const latest = (data.pages[0] ?? []).slice(0, 3)

  return (
    <div className={`${panel} gap-4 lg:col-span-5`}>
      <Link to="/posts">
        <PanelLabel>posts</PanelLabel>
      </Link>
      <ul className="flex flex-col gap-4">
        {latest.map((post) => (
          <li key={post.id}>
            <Link
              to="/posts/$postId"
              params={{ postId: post.id }}
              className="group block min-w-0"
            >
              <div className="truncate font-mono text-base font-medium group-hover:underline">
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

function SectionPanel({
  to,
  icon: Icon,
  title,
  line,
}: {
  to: "/tricks" | "/vault" | "/users"
  icon: LucideIcon
  title: string
  line: string
}) {
  return (
    <Link to={to} className={`${panel} gap-6 lg:col-span-4`}>
      <PanelLabel>{title}</PanelLabel>
      <div className="flex items-end gap-4">
        <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-5" />
        </span>
        <p className="text-muted-foreground text-sm">{line}</p>
      </div>
    </Link>
  )
}

function RouteComponent() {
  return (
    <>
      <PageHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 p-4 lg:grid-cols-12">
        <GamePanel />
        <ChatPanel />
        <PostsPanel />
        <SectionPanel
          to="/tricks"
          icon={TrafficConeIcon}
          title="tricks"
          line="every trick, who landed it first, and how the tricks connect."
        />
        <SectionPanel
          to="/vault"
          icon={LockIcon}
          title="vault"
          line="the old videos, kept safe and easy to find."
        />
        <SectionPanel
          to="/users"
          icon={UsersIcon}
          title="riders"
          line="riders from around the world, on a list and on a globe."
        />
      </div>
    </>
  )
}
