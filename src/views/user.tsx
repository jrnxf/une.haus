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
import { Suspense } from "react";

import { Badges } from "~/components/badges";
import { Globe } from "~/components/globe";
import { SocialLink } from "~/components/social-link";
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { DialogHeader } from "~/components/ui/dialog";
import { FlagEmoji } from "~/components/ui/flag-emoji";
import { Skeleton } from "~/components/ui/skeleton";
import { useSessionUser } from "~/lib/session/hooks";
import { type UsersGetData } from "~/lib/users";
import { useFollows } from "~/lib/users/hooks";
import { cn, isDefined } from "~/lib/utils";

export function UserView({ user }: { user: UsersGetData }) {
  const { disciplines, socials } = user;
  const sessionUser = useSessionUser();

  return (
    <div className="@container relative mx-auto flex w-full max-w-2xl grow flex-col overflow-auto">
      <div className="relative">
        {user.location && (
          <>
            <div
              className={cn(
                "mx-auto w-5/6 overflow-clip",
                user.location &&
                  cn("transform-gpu", "h-[calc(min(300px,44vw))]"),
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
                "h-[calc(min(10rem,20vw))] w-full",
                "from-background bg-linear-to-t to-transparent",
                "transform-gpu", // eek out performance - also fixes layout issues in Safari
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
            "transform-gpu", // eek out performance - also fixes layout issues in Safari
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
              className="flex w-full items-center justify-center"
              name={user.name}
            />
          </Avatar>
          <h1 className="flex max-w-full items-center gap-2 truncate text-2xl leading-none font-semibold tracking-tight">
            <span className="truncate">{user.name}</span>
          </h1>

          <Suspense fallback={<FollowsLoading userId={user.id} />}>
            <Follows userId={user.id} />
          </Suspense>

          {user.location && (
            <div className="flex max-w-full items-center gap-2 leading-none">
              <FlagEmoji
                className="text-2xl leading-none"
                location={user.location}
              />
              <span className="truncate leading-none text-nowrap">
                {user.location.label}
              </span>
            </div>
          )}

          {user.bio && (
            <p className="max-w-full break-words whitespace-pre-wrap">
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

function Follows({ userId }: { userId: number }) {
  const { action, authUserFollowsUser, data, isPending } = useFollows({
    userId,
  });

  const sessionUser = useSessionUser();

  const showActionButton = sessionUser && sessionUser.id !== userId;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Tray>
          <TrayTrigger asChild>
            <Button size="sm" variant="secondary">
              {data.followers.count} followers
            </Button>
          </TrayTrigger>
          <TrayContent>
            <DialogHeader>
              <TrayTitle>Followers</TrayTitle>
            </DialogHeader>
            <UsersList users={data.followers.users} />
          </TrayContent>
        </Tray>
        <Tray>
          <TrayTrigger asChild>
            <Button size="sm" variant="secondary">
              {data.following.count} following
            </Button>
          </TrayTrigger>
          <TrayContent>
            <DialogHeader>
              <TrayTitle>Following</TrayTitle>
            </DialogHeader>
            <UsersList users={data.following.users} />
          </TrayContent>
        </Tray>
      </div>
      {showActionButton && (
        <Button
          disabled={isPending}
          onClick={() => action({ data: { userId } })}
        >
          {authUserFollowsUser ? "Unfollow" : "Follow"}
        </Button>
      )}
    </div>
  );
}

function FollowsLoading({ userId }: { userId: number }) {
  const sessionUser = useSessionUser();

  const showActionButton = sessionUser && sessionUser.id !== userId;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary">
          <Skeleton className="h-4 w-5" />
          followers
        </Button>
        <Button size="sm" variant="secondary">
          <Skeleton className="h-4 w-5" />
          following
        </Button>
      </div>
      {showActionButton && (
        <Skeleton>
          <Button>Follow</Button>
        </Skeleton>
      )}
    </div>
  );
}

function UsersList({
  users,
}: {
  users: { avatarUrl: null | string; id: null | number; name: null | string }[];
}) {
  return (
    <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto">
      {users.map((user) => {
        if (!user.name || !user.id) {
          return null;
        }
        return (
          <div className="flex items-center gap-2" key={user.id}>
            <Avatar className="size-6 rounded-lg">
              <AvatarImage alt={user.name} src={user.avatarUrl} />
              <AvatarFallback className="text-xs" name={user.name} />
            </Avatar>
            <p className="truncate text-base">{user.name}</p>
          </div>
        );
      })}
    </div>
  );
}
