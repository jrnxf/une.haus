import {
  GlobeIcon,
  HeartIcon,
  LayersIcon,
  MapPinIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";

import { ActivityChart } from "~/components/stats/activity-chart";
import { DisciplineChart } from "~/components/stats/discipline-chart";
import { StatCard } from "~/components/stats/stat-card";
import { TopContributors } from "~/components/stats/top-contributors";
import { type getStatsServerFn } from "~/lib/stats/fns";

type StatsGridProps = {
  data: Awaited<ReturnType<typeof getStatsServerFn>>;
};

export function StatsGrid({ data }: StatsGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Row 1: Hero stats */}
      <StatCard
        label="total users"
        value={data.counts.users}
        icon={UsersIcon}
        description="all registered community members"
      />
      <StatCard
        label="total messages"
        value={data.counts.totalMessages}
        icon={MessageCircleIcon}
        description="messages and comments across chat, posts, sets, and submissions"
      />
      <StatCard
        label="total posts"
        value={data.counts.posts}
        icon={SendIcon}
        description="posts shared in the feed"
      />
      <StatCard
        label="likes given"
        value={data.counts.totalLikes}
        icon={HeartIcon}
        description="likes given across posts, sets, submissions, messages, and vault videos"
      />

      {/* Row 2: Game stats + map stats */}
      <StatCard
        label="sets"
        value={data.counts.riuSets}
        icon={LayersIcon}
        description="challenge sets created in rack it up games"
      />
      <StatCard
        label="submissions"
        value={data.counts.riuSubmissions}
        icon={PlayCircleIcon}
        description="video responses to game sets"
      />
      <StatCard
        label="users on map"
        value={data.counts.usersOnMap}
        icon={MapPinIcon}
        description="community members who have added their location"
      />
      <StatCard
        label="countries"
        value={data.counts.countries}
        icon={GlobeIcon}
        description="countries represented by the community"
      />

      {/* Row 3: Activity chart + discipline chart (equal heights) */}
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4">
        <ActivityChart data={data.activityByMonth} />
        <DisciplineChart data={data.disciplineDistribution} />
      </div>

      {/* Row 4: Top contributors (full row) */}
      <div className="sm:col-span-2 lg:col-span-4">
        <TopContributors data={data.topContributors} />
      </div>
    </div>
  );
}
