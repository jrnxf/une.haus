import { Link } from "@tanstack/react-router"
import {
  JoystickIcon,
  LockIcon,
  MessagesSquareIcon,
  PlayIcon,
  StickyNoteIcon,
  TrafficConeIcon,
  UsersIcon,
} from "lucide-react"
import { type ComponentType, type ReactNode, useState } from "react"

import { PodiumIcon } from "~/components/icons/podium-icon"
import { LogoRandomScatter } from "~/components/logo-animated"
import { RichText } from "~/components/rich-text"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { type HomeLatestData } from "~/lib/home"
import { getMuxPoster } from "~/lib/mux/poster"
import { cn } from "~/lib/utils"

type Rider = { id: number; name: string; avatarId: string | null }
type Icon = ComponentType<{ className?: string }>

const tileClass =
  "bg-card hover:border-ring relative flex min-h-0 min-w-0 overflow-hidden rounded-xl border transition-colors"
const smallTileClass = "h-40 @4xl:h-auto"
const wideTileClass = "col-span-2 h-40 @4xl:h-auto"

// The home page: one slot per section, every slot always filled. It shows no
// times and no counts by design; `~/lib/home/slots` decides what fills a slot.
export function HomeMosaic({ latest }: { latest: HomeLatestData }) {
  return (
    <div className="@container mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4">
      {/* The sidebar carries the logo from md up; below that the page does.
          With no lead to show, the lead slot is the logo and this steps aside. */}
      {latest.lead && (
        <div className="flex justify-center py-2 md:hidden">
          <LogoRandomScatter className="h-8 w-auto" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 @4xl:max-h-180 @4xl:min-h-140 @4xl:flex-1 @4xl:grid-cols-4 @4xl:grid-rows-3">
        <LeadTile lead={latest.lead} />
        <GamesTile games={latest.games} />
        <RiderTile rider={latest.rider} />
        <PostTile post={latest.post} />
        <TalkTile talk={latest.talk} />
        <TrickTile trick={latest.trick} />
        <VaultTile clip={latest.vault} />
      </div>
    </div>
  )
}

function TileLabel({
  icon: Icon,
  onMedia,
  children,
}: {
  icon: Icon
  onMedia?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground absolute top-3 left-3 z-10 flex items-center gap-1 text-xs",
        onMedia && "bg-background rounded-md px-2 py-1",
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  )
}

function RiderAvatar({
  rider,
  className,
  width,
}: {
  rider: Rider
  className: string
  width: number
}) {
  return (
    <Avatar
      className={className}
      cloudflareId={rider.avatarId}
      alt={rider.name}
    >
      <AvatarImage width={width} quality={70} />
      <AvatarFallback name={rider.name} />
    </Avatar>
  )
}

// A slot with nothing to show yet is a plain way into its section.
function DoorTile({
  to,
  icon: Icon,
  label,
  className,
}: {
  to: "/arcade" | "/games" | "/posts" | "/tricks" | "/users" | "/vault"
  icon: Icon
  label: string
  className: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        tileClass,
        "flex-col items-center justify-center gap-2",
        className,
      )}
    >
      <Icon className="text-muted-foreground size-8" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}

function Still({
  playbackId,
  time,
  scale,
  width,
  title,
  eager,
}: {
  playbackId: string | null
  time: number
  scale: number
  width: number
  title: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = getMuxPoster({ playbackId, time, width })

  return (
    <>
      {src && !failed && (
        <img
          src={src}
          alt={title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          // a server-rendered still can fail before hydration attaches onError
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setFailed(true)
          }}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
          // vault stills are zoomed past the letterboxing baked into old uploads
          style={scale === 1 ? undefined : { transform: `scale(${scale})` }}
        />
      )}
      <span className="bg-background relative flex size-12 items-center justify-center rounded-full border">
        <PlayIcon className="size-4 fill-current" />
      </span>
    </>
  )
}

function StillCaption({
  rider,
  byline,
  title,
}: {
  rider: Rider | null
  byline: string
  title: string
}) {
  return (
    <span className="absolute inset-x-2 bottom-2 flex">
      <span className="bg-background flex max-w-full min-w-0 items-center gap-2 rounded-lg border px-2 py-1">
        {rider && <RiderAvatar rider={rider} className="size-7" width={56} />}
        <span className="flex min-w-0 flex-col">
          <span className="text-muted-foreground truncate text-xs">
            {byline}
          </span>
          <span className="truncate text-sm font-semibold">{title}</span>
        </span>
      </span>
    </span>
  )
}

const leadTileClass = cn(
  tileClass,
  "bg-muted col-span-2 aspect-video items-center justify-center @4xl:row-span-2 @4xl:aspect-auto",
)

function LeadTile({ lead }: { lead: HomeLatestData["lead"] }) {
  if (!lead) {
    return (
      <div className={cn(leadTileClass, "bg-card p-4")}>
        <LogoRandomScatter className="h-auto w-full max-w-48" />
      </div>
    )
  }

  const body = (
    <>
      <Still
        playbackId={lead.playbackId}
        time={lead.time}
        scale={lead.scale}
        width={960}
        title={lead.title}
        eager
      />
      <StillCaption
        rider={lead.user}
        byline={lead.user?.name ?? "from the vault"}
        title={lead.title}
      />
    </>
  )

  switch (lead.kind) {
    case "riuSet":
      return (
        <Link
          to="/games/rius/sets/$setId"
          params={{ setId: lead.id }}
          className={leadTileClass}
        >
          {body}
        </Link>
      )
    case "riuSubmission":
      return (
        <Link
          to="/games/rius/submissions/$submissionId"
          params={{ submissionId: lead.id }}
          className={leadTileClass}
        >
          {body}
        </Link>
      )
    case "biuSet":
      return (
        <Link
          to="/games/bius/sets/$setId"
          params={{ setId: lead.id }}
          className={leadTileClass}
        >
          {body}
        </Link>
      )
    case "siuSet":
      return (
        <Link
          to="/games/sius/sets/$setId"
          params={{ setId: lead.id }}
          className={leadTileClass}
        >
          {body}
        </Link>
      )
    case "trickVideo":
      return (
        <Link
          to="/tricks/$trickId"
          params={{ trickId: String(lead.id) }}
          className={leadTileClass}
        >
          {body}
        </Link>
      )
    case "vault":
      return (
        <Link
          to="/vault/$videoId"
          params={{ videoId: lead.id }}
          className={leadTileClass}
        >
          {body}
        </Link>
      )
  }
}

function PodiumFace({
  rider,
  place,
}: {
  rider: Rider | undefined
  place: "first" | "second" | "third"
}) {
  if (!rider) return null
  if (place === "first") {
    return (
      <span className="border-rank-gold rounded-full border-2 p-0.5">
        <RiderAvatar
          rider={rider}
          className="size-12 @4xl:size-16"
          width={128}
        />
      </span>
    )
  }
  return (
    <span
      className={cn(
        "rounded-full border-2 p-0.5",
        place === "second" ? "border-rank-silver" : "border-rank-bronze",
      )}
    >
      <RiderAvatar rider={rider} className="size-8 @4xl:size-12" width={96} />
    </span>
  )
}

function GamesTile({ games }: { games: HomeLatestData["games"] }) {
  const leader = games?.leaders[0]
  if (!games || !leader) {
    return (
      <DoorTile
        to="/games"
        icon={PodiumIcon}
        label="games"
        className={smallTileClass}
      />
    )
  }

  return (
    <Link
      to="/games/rius"
      className={cn(
        tileClass,
        smallTileClass,
        "flex-col items-center justify-center gap-2 p-3 pt-8",
      )}
    >
      <TileLabel icon={PodiumIcon}>rack it up</TileLabel>
      <span className="flex items-end gap-1 @4xl:gap-2">
        {/* the leader stands in the middle */}
        <PodiumFace rider={games.leaders[1]} place="second" />
        <PodiumFace rider={leader} place="first" />
        <PodiumFace rider={games.leaders[2]} place="third" />
      </span>
      <span className="max-w-full truncate text-sm font-semibold">
        {leader.name} leads
      </span>
    </Link>
  )
}

function RiderTile({ rider }: { rider: HomeLatestData["rider"] }) {
  if (!rider) {
    return (
      <DoorTile
        to="/users"
        icon={UsersIcon}
        label="riders"
        className={smallTileClass}
      />
    )
  }

  return (
    <Link
      to="/users/$userId"
      params={{ userId: rider.user.id }}
      className={cn(
        tileClass,
        smallTileClass,
        "flex-col items-center justify-center gap-2 p-3 pt-8",
      )}
    >
      <TileLabel icon={UsersIcon}>
        {rider.isNew ? "new rider" : "rider"}
      </TileLabel>
      <RiderAvatar
        rider={rider.user}
        className="size-14 @4xl:size-20"
        width={160}
      />
      <span className="flex max-w-full flex-col items-center">
        <span className="max-w-full truncate text-sm font-semibold">
          {rider.user.name}
        </span>
        {rider.place && (
          <span className="text-muted-foreground max-w-full truncate text-xs">
            {rider.place}
          </span>
        )}
      </span>
    </Link>
  )
}

function Byline({ rider }: { rider: Rider }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <RiderAvatar rider={rider} className="size-5" width={40} />
      <span className="truncate">{rider.name}</span>
    </span>
  )
}

function PostTile({ post }: { post: HomeLatestData["post"] }) {
  if (!post) {
    return (
      <DoorTile
        to="/posts"
        icon={StickyNoteIcon}
        label="posts"
        className={wideTileClass}
      />
    )
  }

  return (
    <Link
      to="/posts/$postId"
      params={{ postId: post.id }}
      className={cn(
        tileClass,
        wideTileClass,
        "flex-col justify-end gap-2 p-4 pt-8",
      )}
    >
      <TileLabel icon={StickyNoteIcon}>post</TileLabel>
      <span className="line-clamp-2 text-xl leading-tight font-semibold">
        {post.title}
      </span>
      <Byline rider={post.user} />
    </Link>
  )
}

function TalkTile({ talk }: { talk: HomeLatestData["talk"] }) {
  if (talk.kind === "arcade") {
    return (
      <DoorTile
        to="/arcade"
        icon={JoystickIcon}
        label="arcade"
        className={smallTileClass}
      />
    )
  }

  return (
    <Link
      to="/chat"
      className={cn(
        tileClass,
        smallTileClass,
        "flex-col justify-end gap-2 p-3 pt-8",
      )}
    >
      <TileLabel icon={MessagesSquareIcon}>chat</TileLabel>
      <span className="bg-secondary w-fit max-w-full rounded-xl rounded-bl-sm px-3 py-2 text-sm font-medium">
        <RichText
          content={talk.content}
          mentionMode="plainText"
          className="line-clamp-2"
        />
      </span>
      <Byline rider={talk.user} />
    </Link>
  )
}

function TrickTile({ trick }: { trick: HomeLatestData["trick"] }) {
  if (!trick) {
    return (
      <DoorTile
        to="/tricks"
        icon={TrafficConeIcon}
        label="tricks"
        className={smallTileClass}
      />
    )
  }

  return (
    <Link
      to="/tricks/$trickId"
      params={{ trickId: String(trick.id) }}
      className={cn(
        tileClass,
        smallTileClass,
        "flex-col justify-end gap-2 p-3 pt-8",
      )}
    >
      <TileLabel icon={TrafficConeIcon}>
        {trick.isNew ? "new trick" : "trick"}
      </TileLabel>
      <span className="line-clamp-2 text-xl leading-tight font-semibold">
        {trick.name}
      </span>
      {trick.elements.length > 0 && (
        <span className="flex gap-1 overflow-hidden whitespace-nowrap">
          {trick.elements.map((element) => (
            <Badge key={element} variant="outline">
              {element}
            </Badge>
          ))}
        </span>
      )}
    </Link>
  )
}

function VaultTile({ clip }: { clip: HomeLatestData["vault"] }) {
  if (!clip) {
    return (
      <DoorTile
        to="/vault"
        icon={LockIcon}
        label="vault"
        className={wideTileClass}
      />
    )
  }

  return (
    <Link
      to="/vault/$videoId"
      params={{ videoId: clip.id }}
      className={cn(
        tileClass,
        wideTileClass,
        "bg-muted items-center justify-center",
      )}
    >
      <TileLabel icon={LockIcon} onMedia>
        vault
      </TileLabel>
      <Still
        playbackId={clip.playbackId}
        time={clip.time}
        scale={clip.scale}
        width={640}
        title={clip.title}
      />
      <StillCaption rider={null} byline="unicycle.tv" title={clip.title} />
    </Link>
  )
}
