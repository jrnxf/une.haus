import {
  EarthIcon,
  HeartIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  UsersIcon,
  VideoIcon,
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
      {/* Rows 1-2: Hero stats - 3 columns on all screen sizes */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-4">
        <StatCard
          label="users"
          value={data.counts.users}
          icon={UsersIcon}
          description="all registered community members"
          size="responsive"
        />
        <StatCard
          label="countries"
          value={data.counts.countries}
          icon={EarthIcon}
          description="countries represented by the community"
          size="responsive"
          to="/map"
        />
        <StatCard
          label="messages"
          value={data.counts.totalMessages}
          icon={MessageCircleIcon}
          description="messages and comments across chat, posts, sets, and submissions"
          size="responsive"
        />
        <StatCard
          label="posts"
          value={data.counts.posts}
          icon={StickyNoteIcon}
          description="posts shared in the feed"
          size="responsive"
        />
        <StatCard
          label="likes"
          value={data.counts.totalLikes}
          icon={HeartIcon}
          description="likes given across posts, sets, submissions, messages, and vault videos"
          size="responsive"
        />
        <StatCard
          label="video uploads"
          value={data.counts.videoUploads}
          icon={VideoIcon}
          description="videos uploaded to the platform"
          size="responsive"
        />
      </div>

      {/* Row 3: Activity chart + discipline chart (equal heights) */}
      <div className="grid gap-4 md:grid-cols-2 lg:col-span-4">
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
