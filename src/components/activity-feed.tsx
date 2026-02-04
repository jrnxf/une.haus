import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  EditIcon,
  FileTextIcon,
  LayersIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  SendIcon,
  VideoIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { TimeAgo } from "~/components/time-ago";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { users, type ActivityItem } from "~/lib/users";
import { type ActivityTypeFilter, ACTIVITY_TYPES } from "~/lib/users/schemas";

const TYPE_LABELS: Record<ActivityTypeFilter, string> = {
  post: "Posts",
  comment: "Comments",
  riuSet: "RIU Sets",
  riuSubmission: "RIU Submissions",
  biuSet: "BIU Sets",
  trickSubmission: "Trick Submissions",
  trickSuggestion: "Trick Suggestions",
  trickVideo: "Trick Videos",
  utvVideoSuggestion: "Vault Suggestions",
  siuStack: "SIU Stacks",
};

type ActivityFeedProps = {
  userId: number;
};

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter | "all">(
    "all",
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      users.activity.infiniteQueryOptions({
        userId,
        type: typeFilter === "all" ? undefined : typeFilter,
      }),
    );

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const filterDropdown = (
    <Select
      value={typeFilter}
      onValueChange={(v) => setTypeFilter(v as ActivityTypeFilter | "all")}
    >
      <SelectTrigger className="h-7 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All activity</SelectItem>
        {ACTIVITY_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Activity</h2>
            <Link
              to="/users/$userId/activity"
              params={{ userId: String(userId) }}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              View all
            </Link>
          </div>
          {filterDropdown}
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SendIcon />
            </EmptyMedia>
            <EmptyTitle>No activity</EmptyTitle>
            <EmptyDescription>
              {typeFilter === "all"
                ? "No activity in the past year."
                : `No ${TYPE_LABELS[typeFilter].toLowerCase()} found.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Activity</h2>
          <Link
            to="/users/$userId/activity"
            params={{ userId: String(userId) }}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            View all
          </Link>
        </div>
        {filterDropdown}
      </div>
      <div className="relative">
        <div className="flex flex-col">
          {items.map((item, index) => (
            <ActivityItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              isLast={index === items.length - 1 && !hasNextPage}
            />
          ))}
        </div>

        {/* Load more button */}
        {hasNextPage && (
          <div className="relative mt-2 flex items-center gap-2 pl-7">
            {/* Timeline dot for button */}
            <div className="bg-muted absolute left-0 flex size-5 items-center justify-center rounded-full">
              <div className="bg-muted-foreground/50 size-1.5 rounded-full" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto px-2 py-1 text-xs"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


function ActivityItemRow({
  item,
  isLast,
}: {
  item: ActivityItem;
  isLast: boolean;
}) {
  const { icon, label, url } = getActivityDisplay(item);

  return (
    <div className="relative flex items-center py-2 pl-7">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="bg-border absolute top-1/2 -bottom-6 left-[9px] w-px" />
      )}
      {/* Timeline dot */}
      <div className="bg-background absolute top-1/2 left-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border">
        <div className="text-foreground/60">{icon}</div>
      </div>

      <Link
        to={url}
        className="hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 transition-colors"
      >
        <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
        <span className="text-muted-foreground shrink-0 text-xs">
          <TimeAgo date={new Date(item.createdAt)} />
        </span>
      </Link>
    </div>
  );
}

function getActivityDisplay(item: ActivityItem): {
  icon: React.ReactNode;
  label: string;
  description?: string;
  url: string;
} {
  switch (item.type) {
    case "post": {
      return {
        icon: <SendIcon className="size-2.5" />,
        label: `Posted: ${item.title ?? "Untitled"}`,
        description: item.content?.slice(0, 100),
        url: `/posts/${item.id}`,
      };
    }
    case "comment": {
      return {
        icon: <MessageCircleIcon className="size-2.5" />,
        label: `Commented on ${item.parentTitle ?? "a post"}`,
        description: item.content?.slice(0, 100),
        url: getParentUrl(item),
      };
    }
    case "riuSet": {
      return {
        icon: <LayersIcon className="size-2.5" />,
        label: `Created set: ${item.name}`,
        description: item.content?.slice(0, 100),
        url: `/games/rius/sets/${item.id}`,
      };
    }
    case "riuSubmission": {
      return {
        icon: <PlayCircleIcon className="size-2.5" />,
        label: `Submitted to ${item.parentTitle ?? "a set"}`,
        url: `/games/rius/submissions/${item.id}`,
      };
    }
    case "biuSet": {
      return {
        icon: <LayersIcon className="size-2.5" />,
        label: "Added to Back It Up chain",
        url: `/games/bius/${item.chainId}`,
      };
    }
    case "trickSubmission": {
      return {
        icon: <FileTextIcon className="size-2.5" />,
        label: `Submitted trick: ${item.name ?? "Untitled"}`,
        url: "/tricks",
      };
    }
    case "trickSuggestion": {
      return {
        icon: <EditIcon className="size-2.5" />,
        label: `Suggested edit to ${item.trickName ?? "trick"}`,
        url: item.trickSlug ? `/tricks/${item.trickSlug}` : "/tricks",
      };
    }
    case "trickVideo": {
      return {
        icon: <VideoIcon className="size-2.5" />,
        label: `Submitted video for ${item.trickName ?? "trick"}`,
        url: item.trickSlug ? `/tricks/${item.trickSlug}` : "/tricks",
      };
    }
    case "utvVideoSuggestion": {
      return {
        icon: <EditIcon className="size-2.5" />,
        label: `Suggested edit to ${item.videoTitle ?? "video"}`,
        url: item.videoId ? `/vault/${item.videoId}` : "/vault",
      };
    }
    case "siuStack": {
      return {
        icon: <LayersIcon className="size-2.5" />,
        label: `Added to Stack It Up: ${item.name ?? ""}`,
        url: `/games/sius/${item.chainId}`,
      };
    }
    default: {
      return {
        icon: <SendIcon className="size-2.5" />,
        label: "Activity",
        url: "/",
      };
    }
  }
}

function getParentUrl(item: ActivityItem): string {
  switch (item.parentType) {
    case "post": {
      return `/posts/${item.parentId}`;
    }
    case "riuSet": {
      return `/games/rius/sets/${item.parentId}`;
    }
    case "riuSubmission": {
      return `/games/rius/submissions/${item.parentId}`;
    }
    case "biuSet": {
      return `/games/bius/sets/${item.parentId}`;
    }
    default: {
      return "/";
    }
  }
}
