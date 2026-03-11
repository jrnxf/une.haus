import {
  SiFacebook,
  SiInstagram,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons"
import { Link } from "@tanstack/react-router"
import pluralize from "pluralize"

import { ActivityFeed } from "~/components/activity-feed"
import { Badges } from "~/components/badges"
import { RichText } from "~/components/rich-text"
import { SocialLink } from "~/components/social-link"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { FlagEmoji } from "~/components/ui/flag-emoji"
import { UserOnlineStatus } from "~/components/user-online-status"
import { UsersCombobox } from "~/components/users-combobox"
import { useAuthGate } from "~/hooks/use-auth-gate"
import { useSessionUser } from "~/lib/session/hooks"
import { type UsersWithFollowsData } from "~/lib/users"
import { useFollowMutations } from "~/lib/users/hooks"
import { cn, isDefined } from "~/lib/utils"

export function UserView({ user }: { user: UsersWithFollowsData }) {
  const { disciplines, socials } = user
  const sessionUser = useSessionUser()
  const isOwnProfile = sessionUser?.id === user.id

  const hasSocials = socials && Object.values(socials).some(isDefined)

  return (
    <div className="h-full overflow-y-auto" key={user.id}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="flex flex-col gap-4">
          {/* Profile header */}
          <div className="flex items-center gap-4">
            <Avatar
              className={cn(
                "shrink-0",
                user.location
                  ? "size-26"
                  : user.followers.count > 0 || user.following.count > 0
                    ? "size-18"
                    : "size-10",
              )}
              cloudflareId={user.avatarId}
              alt={user.name}
            >
              <AvatarImage
                width={320}
                quality={60}
                fetchPriority="high"
                loading="eager"
              />
              <AvatarFallback name={user.name} />
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="flex items-center gap-2 truncate text-2xl font-semibold tracking-tight">
                    {user.name}
                    <UserOnlineStatus userId={user.id} />
                  </h1>
                  {user.location && (
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                      <Link
                        to="/users/map"
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

              {(user.followers.count > 0 || user.following.count > 0) && (
                <FollowStats {...user} />
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="leading-relaxed wrap-break-word whitespace-pre-wrap">
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

          {/* Activity Feed */}
          <ActivityFeed userId={user.id} />
        </div>
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
