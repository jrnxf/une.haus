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
    <div className="grid gap-3 lg:grid-cols-4">
      {/* Rows 1-2: Hero stats - 4 columns on all screen sizes */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-2.5 lg:col-span-4 lg:gap-3">
        <StatCard
          label="total users"
          value={data.counts.users}
          icon={UsersIcon}
          description="all registered community members"
          size="responsive"
        />
        <StatCard
          label="total messages"
          value={data.counts.totalMessages}
          icon={MessageCircleIcon}
          description="messages and comments across chat, posts, sets, and submissions"
          size="responsive"
        />
        <StatCard
          label="total posts"
          value={data.counts.posts}
          icon={SendIcon}
          description="posts shared in the feed"
          size="responsive"
        />
        <StatCard
          label="likes given"
          value={data.counts.totalLikes}
          icon={HeartIcon}
          description="likes given across posts, sets, submissions, messages, and vault videos"
          size="responsive"
        />
        <StatCard
          label="sets"
          value={data.counts.riuSets}
          icon={LayersIcon}
          description="challenge sets created in rack it up games"
          size="responsive"
        />
        <StatCard
          label="submissions"
          value={data.counts.riuSubmissions}
          icon={PlayCircleIcon}
          description="video responses to game sets"
          size="responsive"
        />
        <StatCard
          label="users on map"
          value={data.counts.usersOnMap}
          icon={MapPinIcon}
          description="community members who have added their location"
          size="responsive"
          to="/map"
        />
        <StatCard
          label="countries"
          value={data.counts.countries}
          icon={GlobeIcon}
          description="countries represented by the community"
          size="responsive"
          to="/map"
        />
      </div>

      {/* Row 3: Activity chart + discipline chart (equal heights) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4">
        <ActivityChart data={data.activityByMonth} />
        <DisciplineChart data={data.disciplineDistribution} />
      </div>

      {/* Row 4: Top contributors (full row) */}
      <div className="lg:col-span-4">
        <TopContributors data={data.topContributors} />
      </div>
    </div>
  );
}
