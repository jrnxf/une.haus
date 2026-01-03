// TODO the bundle on this is huge - just download these svgs locally
import {
  SiFacebook,
  SiInstagram,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { Link } from "@tanstack/react-router";

import { Badges } from "~/components/badges";
import { SocialLink } from "~/components/social-link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { FlagEmoji } from "~/components/ui/flag-emoji";
import { UsersCombobox } from "~/components/users-combobox";
import { useSessionUser } from "~/lib/session/hooks";
import { type UsersWithFollowsData } from "~/lib/users";
import { useFollowMutations } from "~/lib/users/hooks";
import { isDefined } from "~/lib/utils";

export function UserView({ user }: { user: UsersWithFollowsData }) {
  const { disciplines, socials } = user;
  const sessionUser = useSessionUser();

  return (
    <div
      className="h-full overflow-y-auto"
      key={user.id} // keyed to reset state
    >
      <div className="@container relative mx-auto w-full max-w-2xl">
        <div
          className="flex w-full grow basis-0 flex-col items-center gap-4 p-8"
          id="main-content"
        >
          <Avatar
            className="size-28 rounded-full object-cover"
            cloudflareId={user.avatarId}
            alt={user.name}
          >
            <AvatarImage width={448} quality={60} />
            <AvatarFallback name={user.name} />
          </Avatar>

          <h1 className="truncate text-2xl font-semibold tracking-tight">
            <span className="truncate">{user.name}</span>
          </h1>

          <FollowersFollowing {...user} />

          {user.location && (
            <div className="flex max-w-full items-center gap-2">
              <FlagEmoji className="text-2xl" location={user.location} />
              <span className="truncate text-nowrap">
                {user.location.label}
              </span>
            </div>
          )}

          {user.bio && (
            <p className="max-w-full leading-tight wrap-break-word whitespace-pre-wrap">
              {user.bio}
            </p>
          )}

          <Badges content={disciplines} />

          {socials && Object.values(socials).some(isDefined) && (
            <div className="flex gap-4">
              <SocialLink href={socials.youtube} icon={SiYoutube} />
              <SocialLink href={socials.tiktok} icon={SiTiktok} />
              <SocialLink href={socials.instagram} icon={SiInstagram} />
              <SocialLink href={socials.spotify} icon={SiSpotify} />
              <SocialLink href={socials.twitter} icon={SiX} />
              <SocialLink href={socials.facebook} icon={SiFacebook} />
            </div>
          )}

          {sessionUser && sessionUser.id === user.id && (
            <Button asChild>
              <Link to="/auth/me/edit">Edit</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FollowersFollowing(props: UsersWithFollowsData) {
  const { id: userId, followers, following } = props;

  const { follow, unfollow } = useFollowMutations({
    userId,
  });

  const sessionUser = useSessionUser();

  const authUserFollowsUser = followers.users.some(
    (user) => user.id === sessionUser?.id,
  );

  const showActionButton = sessionUser && sessionUser.id !== userId;
  const action = authUserFollowsUser ? unfollow : follow;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <UsersCombobox users={followers.users} peripheralKey="followers">
          <Button variant="secondary" size="sm">
            {followers.count} {followers.count === 1 ? "follower" : "followers"}
          </Button>
        </UsersCombobox>
        <UsersCombobox users={following.users} peripheralKey="following">
          <Button variant="secondary" size="sm">
            {following.count} following
          </Button>
        </UsersCombobox>
      </div>
      {showActionButton && (
        <Button onClick={() => action({ data: { userId } })}>
          {authUserFollowsUser ? "Unfollow" : "Follow"}
        </Button>
      )}
    </div>
  );
}
