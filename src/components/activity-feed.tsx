import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  LayersIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  SendIcon,
} from "lucide-react";
import { useMemo } from "react";

import { TimeAgo } from "~/components/time-ago";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { type ActivityItem, users } from "~/lib/users";
import { cn } from "~/lib/utils";

type ActivityFeedProps = {
  userId: number;
};

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery(users.activity.infiniteQueryOptions({ userId }));

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SendIcon />
          </EmptyMedia>
          <EmptyTitle>No activity</EmptyTitle>
          <EmptyDescription>
            No activity in the past year.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Activity</h2>
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

function ActivityFeedSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Activity</h2>
      <div className="relative">
        <div className="flex flex-col">
          {Array.from({ length: 12 }).map((_, i, arr) => (
            <div key={i} className="relative flex items-center py-2 pl-7">
              {i < arr.length - 1 && (
                <div className="bg-border absolute top-1/2 -bottom-6 left-[9px] w-px" />
              )}
              <div className="bg-muted absolute left-0 top-1/2 flex size-5 -translate-y-1/2 animate-pulse items-center justify-center rounded-full" />
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1">
                <div className="bg-muted h-5 min-w-0 flex-1 animate-pulse rounded" />
                <div className="bg-muted h-5 w-20 shrink-0 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
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
      <div className="bg-background absolute left-0 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border">
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
