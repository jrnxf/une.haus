import {
  EarthIcon,
  HeartIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react"
import pluralize from "pluralize"

import { ActivityChart } from "~/components/stats/activity-chart"
import { DisciplineChart } from "~/components/stats/discipline-chart"
import { StatCard } from "~/components/stats/stat-card"
import { TopContributors } from "~/components/stats/top-contributors"
import { type getStatsServerFn } from "~/lib/stats/fns"

type StatsGridProps = {
  data: Awaited<ReturnType<typeof getStatsServerFn>>
}

export function StatsGrid({ data }: StatsGridProps) {
  return (
    <div className="grid gap-4">
      {/* Rows 1-2: Hero stats - 3 columns on all screen sizes */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label={pluralize("user", data.counts.users)}
          value={data.counts.users}
          icon={UsersIcon}
          description="all registered community members"
          size="responsive"
        />
        <StatCard
          label={pluralize("country", data.counts.countries)}
          value={data.counts.countries}
          icon={EarthIcon}
          description="countries represented by the community"
          size="responsive"
          to="/map"
        />
        <StatCard
          label={pluralize("post", data.counts.posts)}
          value={data.counts.posts}
          icon={StickyNoteIcon}
          description="posts shared in the feed"
          size="responsive"
        />
        <StatCard
          label={pluralize("message", data.counts.totalMessages)}
          value={data.counts.totalMessages}
          icon={MessageCircleIcon}
          description="messages and comments across chat, posts, sets, and submissions"
          size="responsive"
        />
        <StatCard
          label={pluralize("like", data.counts.totalLikes)}
          value={data.counts.totalLikes}
          icon={HeartIcon}
          description="likes given across posts, sets, submissions, messages, and vault videos"
          size="responsive"
        />
        <StatCard
          label={pluralize("video upload", data.counts.videoUploads)}
          value={data.counts.videoUploads}
          icon={VideoIcon}
          description="videos uploaded to the platform"
          size="responsive"
        />
      </div>

      {/* Row 3: Activity chart + discipline chart (equal heights) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[290px]">
          <ActivityChart data={data.activityByMonth} />
        </div>
        <div className="h-[290px]">
          <DisciplineChart data={data.disciplineDistribution} />
        </div>
      </div>

      {/* Row 4: Top contributors (full row) */}
      <TopContributors data={data.topContributors} />
    </div>
  )
}
