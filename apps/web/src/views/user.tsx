import {
  SiFacebook,
  SiInstagram,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  FileTextIcon,
  HeartIcon,
  MergeIcon,
  SparklesIcon,
  StickyNoteIcon,
  VideoIcon,
} from "lucide-react"
import pluralize from "pluralize"
import { Suspense } from "react"

import { getActivityDisplay } from "~/components/activity-display"
import { Badges } from "~/components/badges"
import { RichText } from "~/components/rich-text"
import { SocialLink } from "~/components/social-link"
import { StatCard } from "~/components/stats/stat-card"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { FlagEmoji } from "~/components/ui/flag-emoji"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { UserOnlineStatus } from "~/components/user-online-status"
import { UsersCombobox } from "~/components/users-combobox"
import { getMuxPoster } from "~/components/video-player"
import { useAuthGate } from "~/hooks/use-auth-gate"
import { useSessionUser } from "~/lib/session/hooks"
import { users, type UsersWithFollowsData } from "~/lib/users"
import { useFollowMutations } from "~/lib/users/hooks"
import { getVideoSource } from "~/lib/users/video-source"
import { cn, isDefined } from "~/lib/utils"

export function UserView({ user }: { user: UsersWithFollowsData }) {
  const { disciplines, socials } = user
  const sessionUser = useSessionUser()
  const isOwnProfile = sessionUser?.id === user.id

  const hasSocials = socials && Object.values(socials).some(isDefined)

  const followStatsVisible =
    user.followers.count > 0 || user.following.count > 0
  return (
    <div className="h-full overflow-y-auto" key={user.id}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="flex flex-col gap-4">
          {/* Profile header */}
          <div className="flex items-center gap-4">
            <Avatar
              className={cn(
                "shrink-0",
                user.location && followStatsVisible
                  ? "size-24 sm:size-26"
                  : user.location || followStatsVisible
                    ? "size-16 sm:size-18"
                    : "size-8 sm:size-10",
              )}
              cloudflareId={user.avatarId}
              alt={user.name}
            >
              <AvatarImage
                width={320}
                quality={80}
                fetchPriority="high"
                loading="eager"
              />
              <AvatarFallback name={user.name} />
            </Avatar>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.y min-w-0">
                  <h1 className="flex items-center gap-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {user.name}
                    <UserOnlineStatus userId={user.id} />
                  </h1>
                  {user.location && (
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                      <Link
                        to="/users/globe"
                        search={{
                          lat: user.location.lat,
                          lng: user.location.lng,
                          z: 10,
                        }}
                        className="flex w-fit items-center gap-1.5 text-sm"
                      >
                        <FlagEmoji
                          className="text-base"
                          location={user.location}
                        />
                        <span className="truncate">{user.location.label}</span>
                      </Link>
                    </Button>
                  )}
                </div>
                {isOwnProfile ? (
                  <Button asChild size="sm" className="shrink-0">
                    <Link to="/auth/me/edit">edit</Link>
                  </Button>
                ) : (
                  <FollowButton user={user} isOwnProfile={isOwnProfile} />
                )}
              </div>

              {followStatsVisible && <FollowStats {...user} />}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap sm:text-base">
              <RichText content={user.bio} />
            </div>
          )}

          {/* Disciplines */}
          <Badges content={disciplines} />

          {/* Socials */}
          {hasSocials && (
            <div className="flex gap-2">
              <SocialLink href={socials.youtube} icon={SiYoutube} />
              <SocialLink href={socials.tiktok} icon={SiTiktok} />
              <SocialLink href={socials.instagram} icon={SiInstagram} />
              <SocialLink href={socials.spotify} icon={SiSpotify} />
              <SocialLink href={socials.twitter} icon={SiX} />
              <SocialLink href={socials.facebook} icon={SiFacebook} />
            </div>
          )}

          {/* Stats */}
          <StatsRow user={user} />

          {/* Recent videos */}
          <Suspense>
            <VideosPreview userId={user.id} />
          </Suspense>

          {/* Recent activity */}
          <Suspense>
            <ActivityPreview userId={user.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function StatsRow({ user }: { user: UsersWithFollowsData }) {
  const stats = [
    { label: "videos", value: user.videosCount, icon: VideoIcon },
    { label: "posts", value: user.stats.posts, icon: StickyNoteIcon },
    { label: "sets", value: user.stats.sets, icon: MergeIcon },
    { label: "submissions", value: user.stats.submissions, icon: FileTextIcon },
    { label: "tricks", value: user.stats.tricks, icon: SparklesIcon },
    { label: "likes", value: user.stats.likesReceived, icon: HeartIcon },
  ].filter((stat) => stat.value > 0)

  const joined = new Date(user.createdAt)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toLowerCase()

  return (
    <div className="flex flex-col gap-2">
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              size="responsive"
            />
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        joined {joined}
        {user.arcadeHighScore > 0 && (
          <>
            {" "}
            &middot; arcade high score {user.arcadeHighScore.toLocaleString()}
          </>
        )}
      </p>
    </div>
  )
}

function SectionHeader({
  title,
  to,
  userId,
}: {
  title: string
  to: "/users/$userId/videos" | "/users/$userId/activity"
  userId: number
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-medium">{title}</h2>
      <Link
        to={to}
        params={{ userId }}
        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
      >
        view all
      </Link>
    </div>
  )
}

function VideosPreview({ userId }: { userId: number }) {
  const { data } = useSuspenseQuery(
    users.videosPreview.queryOptions({ userId }),
  )

  if (data.items.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="videos"
        to="/users/$userId/videos"
        userId={userId}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.items.map((item) => {
          const { label, url } = getVideoSource(item)
          return (
            <Link
              key={`${item.type}-${item.id}`}
              to={url}
              aria-label={label}
              className="group relative aspect-video overflow-clip rounded-md bg-black"
            >
              <img
                src={getMuxPoster({ playbackId: item.playbackId, width: 320 })}
                alt={label}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function ActivityPreview({ userId }: { userId: number }) {
  const { data } = useSuspenseQuery(
    users.activityPreview.queryOptions({ userId }),
  )

  if (data.items.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="activity"
        to="/users/$userId/activity"
        userId={userId}
      />
      <div className="relative flex flex-col">
        {/* Connecting line behind the icons, stopping at the first and last icon centers */}
        <div
          aria-hidden
          className="bg-border absolute top-4 bottom-4 left-3 w-px"
        />
        {data.items.map((item) => {
          const { icon, label, url } = getActivityDisplay(item)
          return (
            <div
              key={`${item.type}-${item.id}`}
              className="hover:bg-accent/50 relative -mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1"
            >
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
                {icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                <Link
                  to={url}
                  className="after:absolute after:inset-0 after:rounded-md"
                >
                  {label}
                </Link>
              </span>
              <span className="relative z-10 shrink-0">
                <RelativeTimeCard
                  date={new Date(item.createdAt)}
                  variant="muted"
                  className="text-xs"
                />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FollowStats(props: UsersWithFollowsData) {
  const { followers, following } = props

  return (
    <div className="-ml-2 flex items-center gap-2">
      <UsersCombobox users={followers.users} peripheralKey="followers">
        <Button type="button" className="text-sm" variant="ghost" size="sm">
          {followers.count} {pluralize("follower", followers.count)}
        </Button>
      </UsersCombobox>
      <UsersCombobox users={following.users} peripheralKey="following">
        <Button type="button" className="text-sm" variant="ghost" size="sm">
          {following.count} following
        </Button>
      </UsersCombobox>
    </div>
  )
}

function FollowButton({
  user,
  isOwnProfile,
}: {
  user: UsersWithFollowsData
  isOwnProfile: boolean
}) {
  const { sessionUser, authGate } = useAuthGate()
  const { follow, unfollow } = useFollowMutations({ userId: user.id })

  const authUserFollowsUser = user.followers.users.some(
    (u) => u.id === sessionUser?.id,
  )

  if (isOwnProfile) {
    return null
  }

  return (
    <Button
      className="shrink-0"
      variant="secondary"
      onClick={() =>
        authGate(() =>
          authUserFollowsUser
            ? unfollow({ data: { userId: user.id } })
            : follow({ data: { userId: user.id } }),
        )
      }
    >
      {authUserFollowsUser ? "unfollow" : "follow"}
    </Button>
  )
}
