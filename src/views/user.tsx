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
import { Globe } from "~/components/globe";
import { SocialLink } from "~/components/social-link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { FlagEmoji } from "~/components/ui/flag-emoji";
import { useSessionUser } from "~/lib/session/hooks";
import { type UsersWithFollowsData } from "~/lib/users";
import { useFollowMutations } from "~/lib/users/hooks";
import { cn, isDefined } from "~/lib/utils";

export function UserView({ user }: { user: UsersWithFollowsData }) {
  const { disciplines, socials } = user;
  const sessionUser = useSessionUser();

  return (
    <div className="h-full overflow-y-auto">
      <div className="@container relative mx-auto w-full max-w-2xl">
        {user.location && (
          <>
            <div
              className={cn(
                "mx-auto w-5/6 overflow-clip",
                user.location &&
                  cn(
                    // "transform-gpu",
                    "h-[calc(min(300px,44vw))]",
                  ),
              )}
            >
              <div>
                <Globe location={user.location} />
              </div>
            </div>
            <div
              className={cn(
                // -bottom-2 because when the drawer slides up if it's right at the
                // bottom you see little glitches during the animation - this helps
                // make sure the gradient starts below the actual bottom cutoff of
                // the globe
                "absolute -bottom-2",
                "h-8 w-full",
                "from-background via-background/90 bg-gradient-to-t via-35% to-transparent",

                // "transform-gpu", // eek out performance - also fixes layout issues in Safari
              )}
            />
          </>
        )}

        <div
          className={cn(
            "flex w-full grow basis-0 flex-col items-center gap-4 p-8",
            // going absolute from the top instead of static with negative margin
            // because of tiny but annoying layout shifting when users have long
            // bios
            user.location && "absolute top-[calc(min(200px,30vw))]",

            // uncommenting this out for now because it crops the overlay of
            // dialogs. This transform-gpu doesn't seem to be necessary but
            // keeping this around for posterity in case something comes up
            // "transform-gpu", // eek out performance - also fixes layout
            // issues in Safari
          )}
          id="main-content"
          key={user.id}
        >
          <Avatar
            className="relative size-28"
            // keyed so image swap is snappy
            key={user.id}
          >
            <AvatarImage
              alt={user.name}
              className="object-cover"
              src={user.avatarUrl}
            />
            <AvatarFallback
              className="flex w-full items-center justify-center text-3xl font-semibold"
              name={user.name}
            />
          </Avatar>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            <span className="truncate">{user.name}</span>
          </h1>

          <Follows {...user} />

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

function Follows(props: UsersWithFollowsData) {
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
        {followers.count > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link
              to="/users"
              search={{ ids: followers.users.map((u) => u.id) }}
            >
              {followers.count}{" "}
              {followers.count === 1 ? "follower" : "followers"}
            </Link>
          </Button>
        )}

        {following.count > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link
              to="/users"
              search={{ ids: following.users.map((u) => u.id) }}
            >
              {following.count} following
            </Link>
          </Button>
        )}
      </div>
      {showActionButton && (
        <Button onClick={() => action({ data: { userId } })}>
          {authUserFollowsUser ? "Unfollow" : "Follow"}
        </Button>
      )}
    </div>
  );
}
