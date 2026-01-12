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
import {
  HeartIcon,
  LayersIcon,
  LinkIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  SendIcon,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { Badges } from "~/components/badges";
import { SocialLink } from "~/components/social-link";
import { StatCard } from "~/components/stats";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { FlagEmoji } from "~/components/ui/flag-emoji";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
            <AvatarImage
              width={448}
              quality={60}
              fetchPriority="high"
              loading="eager"
            />
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

          <UserStatsGrid stats={user.stats} />

          <div className="grid w-full gap-4 sm:grid-cols-2">
            <UserActivityChart data={user.stats.activityByMonth} />
            <UserEngagementChart stats={user.stats} />
          </div>
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

function UserStatsGrid({ stats }: { stats: UsersWithFollowsData["stats"] }) {
  const hasContentStats =
    stats.posts > 0 ||
    stats.gameSets > 0 ||
    stats.gameSubmissions > 0 ||
    stats.biuSets > 0;

  const hasEngagementStats =
    stats.commentsMade > 0 ||
    stats.chatMessages > 0 ||
    stats.likesGiven > 0 ||
    stats.likesReceived > 0 ||
    stats.commentsReceived > 0;

  if (!hasContentStats && !hasEngagementStats) {
    return null;
  }

  return (
    <div className="mt-4 grid w-full gap-4 sm:grid-cols-2">
      {stats.posts > 0 && (
        <StatCard
          label="posts"
          value={stats.posts}
          icon={SendIcon}
          description="posts shared in the feed"
        />
      )}
      {stats.gameSets > 0 && (
        <StatCard
          label="game sets"
          value={stats.gameSets}
          icon={LayersIcon}
          description="rack it up challenge sets created"
        />
      )}
      {stats.gameSubmissions > 0 && (
        <StatCard
          label="submissions"
          value={stats.gameSubmissions}
          icon={PlayCircleIcon}
          description="video responses to game sets"
        />
      )}
      {stats.biuSets > 0 && (
        <StatCard
          label="back it up"
          value={stats.biuSets}
          icon={LinkIcon}
          description="back it up chain contributions"
        />
      )}
      {stats.chatMessages > 0 && (
        <StatCard
          label="chat messages"
          value={stats.chatMessages}
          icon={MessageCircleIcon}
          description="messages sent in chat"
        />
      )}
      {stats.commentsMade > 0 && (
        <StatCard
          label="comments"
          value={stats.commentsMade}
          icon={MessageCircleIcon}
          description="comments made on posts"
        />
      )}
      {stats.likesGiven > 0 && (
        <StatCard
          label="likes given"
          value={stats.likesGiven}
          icon={HeartIcon}
          description="likes given to other posts"
        />
      )}
      {(stats.likesReceived > 0 || stats.commentsReceived > 0) && (
        <StatCard
          label="engagement received"
          value={stats.likesReceived + stats.commentsReceived}
          icon={HeartIcon}
          description={`${stats.likesReceived} likes + ${stats.commentsReceived} comments received`}
        />
      )}
    </div>
  );
}

const activityChartConfig = {
  activityCount: {
    label: "Activity",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function UserActivityChart({
  data,
}: {
  data: { month: string; activityCount: number }[];
}) {
  if (data.length === 0) {
    return null;
  }

  const formattedData = data.map((item) => {
    const [year, month] = item.month.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return {
      ...item,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    };
  });

  return (
    <Card className="border-dashed py-4">
      <CardHeader className="pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              activity over time
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            monthly count of posts, comments, and game submissions
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="px-4">
        <ChartContainer
          config={activityChartConfig}
          className="h-[160px] w-full"
        >
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillUserActivity" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-activityCount)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-activityCount)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
              width={30}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              type="monotone"
              dataKey="activityCount"
              stroke="var(--color-activityCount)"
              fill="url(#fillUserActivity)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const engagementChartConfig = {
  given: { label: "Given", color: "var(--chart-1)" },
  received: { label: "Received", color: "var(--chart-2)" },
} satisfies ChartConfig;

function UserEngagementChart({
  stats,
}: {
  stats: UsersWithFollowsData["stats"];
}) {
  const chartData = [
    {
      category: "Likes",
      given: stats.likesGiven,
      received: stats.likesReceived,
    },
    {
      category: "Comments",
      given: stats.commentsMade,
      received: stats.commentsReceived,
    },
  ].filter((item) => item.given > 0 || item.received > 0);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed py-4">
      <CardHeader className="pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              engagement balance
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            comparison of likes and comments given vs received
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="px-4">
        <ChartContainer
          config={engagementChartConfig}
          className="h-[160px] w-full"
        >
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              fontSize={10}
            />
            <YAxis
              dataKey="category"
              type="category"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              width={60}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="given"
              fill="var(--color-given)"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="received"
              fill="var(--color-received)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-2 flex justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: "var(--chart-1)" }}
            />
            <span className="text-muted-foreground text-xs">Given</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: "var(--chart-2)" }}
            />
            <span className="text-muted-foreground text-xs">Received</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
