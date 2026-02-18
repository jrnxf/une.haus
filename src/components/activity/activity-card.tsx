import { Link } from "@tanstack/react-router";
import { ArrowDownToLineIcon, LayersIcon, PaperclipIcon } from "lucide-react";

import { TimeAgo } from "~/components/time-ago";
import { Badge } from "~/components/ui/badge";
import type { ActivityItem } from "~/lib/users";
import { cn } from "~/lib/utils";

type ActivityCardProps = {
  item: ActivityItem;
};

export function ActivityCard({ item }: ActivityCardProps) {
  // Render posts exactly like /posts view
  if (item.type === "post") {
    return <PostCard item={item} />;
  }

  const display = getCardDisplay(item);

  return (
    <Link to={display.url} className="group block">
      <div
        className={cn(
          "bg-card rounded-lg border p-4 transition-all",
          "hover:border-primary/30 hover:shadow-sm",
          "active:scale-[0.99]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-6 items-center justify-center rounded-full">
              {display.icon}
            </div>
            <Badge variant="secondary" className="text-xs">
              {display.typeLabel}
            </Badge>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            <TimeAgo date={new Date(item.createdAt)} />
          </span>
        </div>

        <div className="mt-3">
          <h3 className="group-hover:text-primary text-sm font-medium">
            {display.title}
          </h3>
          {display.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {display.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function PostCard({ item }: { item: ActivityItem }) {
  const hasMedia = Boolean(item.imageId);

  return (
    <Link
      className="ring-offset-background focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      params={{ postId: item.id }}
      to="/posts/$postId"
    >
      <div className="bg-card flex flex-col gap-4 rounded-md border p-3 sm:flex-row">
        <div className="flex w-full flex-col gap-2">
          <p className="truncate font-semibold">
            {hasMedia && (
              <PaperclipIcon className="text-muted-foreground mr-2 inline size-3" />
            )}
            {item.title ?? "Untitled"}
          </p>
          {item.content && (
            <div className="line-clamp-3 text-sm">
              <p>{item.content}</p>
            </div>
          )}
          <div className="flex w-full justify-between gap-4">
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs sm:text-sm">
              <TimeAgo date={new Date(item.createdAt)} />
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

type CardDisplay = {
  icon: React.ReactNode;
  typeLabel: string;
  title: string;
  description?: string;
  url: string;
};

function getCardDisplay(item: ActivityItem): CardDisplay {
  switch (item.type) {
    case "riuSet": {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "RIU Set",
        title: item.name ?? "Untitled Set",
        description: item.content?.slice(0, 150),
        url: `/games/rius/sets/${item.id}`,
      };
    }
    case "riuSubmission": {
      return {
        icon: <ArrowDownToLineIcon className="size-3" />,
        typeLabel: "RIU Submission",
        title: `Submitted to: ${item.parentTitle ?? "a set"}`,
        url: `/games/rius/submissions/${item.id}`,
      };
    }
    case "biuSet": {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "BIU",
        title: "Added to chain",
        url: `/games/bius/${item.chainId}`,
      };
    }
    case "siuStack": {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "SIU",
        title: item.name ?? "Added to stack",
        url: `/games/sius/${item.chainId}`,
      };
    }
    default: {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "Activity",
        title: "Activity",
        url: "/",
      };
    }
  }
}
