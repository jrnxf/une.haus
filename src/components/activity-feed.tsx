import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownToLineIcon,
  EditIcon,
  FileTextIcon,
  LayersIcon,
  MessageCircleIcon,
  SendIcon,
  VideoIcon,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

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
import { ACTIVITY_TYPES, type ActivityTypeFilter } from "~/lib/users/schemas";

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

const ACTIVITY_ITEMS: Record<string, string> = {
  all: "All activity",
  ...TYPE_LABELS,
};

type ActivityGroup = {
  key: string;
  items: ActivityItem[];
};

function getGroupKey(item: ActivityItem): string {
  switch (item.type) {
    case "comment": {
      return `comment-${item.parentType}-${item.parentId}`;
    }
    case "riuSubmission": {
      return `riuSubmission-${item.riuSetId}`;
    }
    case "trickSuggestion": {
      return `trickSuggestion-${item.trickId}`;
    }
    case "trickVideo": {
      return `trickVideo-${item.trickId}`;
    }
    case "utvVideoSuggestion": {
      return `utvVideoSuggestion-${item.videoId}`;
    }
    case "biuSet": {
      return `biuSet-${item.chainId}`;
    }
    case "siuStack": {
      return `siuStack-${item.chainId}`;
    }
    default: {
      return `${item.type}-${item.id}`;
    }
  }
}

function groupConsecutiveItems(items: ActivityItem[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const item of items) {
    const key = getGroupKey(item);
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, items: [item] });
    }
  }
  return groups;
}

type ActivityFeedProps = {
  userId: number;
};

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter | "all">(
    "all",
  );
  const deferredTypeFilter = useDeferredValue(typeFilter);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      users.activity.infiniteQueryOptions({
        userId,
        type: deferredTypeFilter === "all" ? undefined : deferredTypeFilter,
      }),
    );

  const items = useMemo(() => data.pages.flatMap((p) => p.items), [data]);

  const groups = useMemo(() => groupConsecutiveItems(items), [items]);

  const filterDropdown = (
    <Select
      value={typeFilter}
      onValueChange={(v) => setTypeFilter(v as ActivityTypeFilter | "all")}
      items={ACTIVITY_ITEMS}
    >
      <SelectTrigger className="h-7 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" label="All activity">
          All activity
        </SelectItem>
        {ACTIVITY_TYPES.map((type) => (
          <SelectItem key={type} value={type} label={TYPE_LABELS[type]}>
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
          <h2 className="text-sm font-medium">Activity</h2>
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
        <h2 className="text-sm font-medium">Activity</h2>
        {filterDropdown}
      </div>
      <div className="relative">
        <div className="flex flex-col">
          {groups.map((group, index) => (
            <ActivityGroupRow
              key={group.key}
              group={group}
              isLast={index === groups.length - 1 && !hasNextPage}
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

function ActivityGroupRow({
  group,
  isLast,
}: {
  group: ActivityGroup;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const first = group.items[0];
  const count = group.items.length;
  const isGrouped = count > 1;
  const { icon, label, url } = getActivityDisplay(first);

  if (!isGrouped) {
    return (
      <div className="relative flex items-center py-2 pl-7">
        {!isLast && (
          <div className="bg-border absolute top-1/2 -bottom-6 left-[9px] w-px" />
        )}
        <div className="bg-background absolute top-1/2 left-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border">
          <div className="text-foreground/60">{icon}</div>
        </div>
        <Link
          to={url}
          className="hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 transition-colors"
        >
          <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
          <span className="text-muted-foreground shrink-0 text-xs">
            <TimeAgo date={new Date(first.createdAt)} />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="bg-border absolute top-[50%] -bottom-6 left-[9px] w-px" />
      )}
      {expanded && !isLast && (
        <div className="bg-border absolute top-0 -bottom-6 left-[9px] w-px" />
      )}

      {/* Collapsed row */}
      <div className="relative flex items-center py-2 pl-7">
        <div className="bg-background absolute top-1/2 left-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border">
          <div className="text-foreground/60">{icon}</div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors"
        >
          <p className="min-w-0 flex-1 truncate text-sm">
            {label}
            <span className="text-muted-foreground ml-1 text-xs">
              &times; {count}
            </span>
          </p>
          <span className="text-muted-foreground shrink-0 text-xs">
            <TimeAgo date={new Date(first.createdAt)} />
          </span>
        </button>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="flex flex-col pl-7">
          {group.items.map((item) => {
            const display = getActivityDisplay(item);
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="relative flex items-center py-1 pl-4"
              >
                <div className="bg-border absolute top-0 bottom-0 left-[2px] w-px" />
                <Link
                  to={display.url}
                  className="hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 transition-colors"
                >
                  <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                    {display.label}
                  </p>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    <TimeAgo date={new Date(item.createdAt)} />
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
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
        icon: <ArrowDownToLineIcon className="size-2.5" />,
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
