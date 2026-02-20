import { Link } from "@tanstack/react-router";
import {
  Check,
  ClipboardCheck,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { TimeAgo } from "~/components/time-ago";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import type {
  NotificationData,
  NotificationEntityType,
  NotificationType,
} from "~/db/schema";
import {
  getNotificationAction,
  getNotificationUrl,
} from "~/lib/notifications/utils";
import { cn } from "~/lib/utils";

type Actor = {
  id: number;
  name: string;
  avatarId: string | null;
};

type NotificationItemProps = {
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: number;
  count: number;
  actors: Actor[];
  data: NotificationData | null;
  latestAt: Date;
  isRead?: boolean;
  onMarkRead?: () => void;
};

export function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "like": {
      return <Heart className="size-3 text-red-500" />;
    }
    case "comment": {
      return <MessageCircle className="size-3 text-blue-500" />;
    }
    case "follow": {
      return <UserPlus className="size-3 text-green-500" />;
    }
    case "new_content": {
      return <Sparkles className="size-3 text-purple-500" />;
    }
    case "review": {
      return <ClipboardCheck className="size-3 text-orange-500" />;
    }
    default: {
      return <Sparkles className="size-3 text-purple-500" />;
    }
  }
}

export function formatActorNames(names: string[], count: number): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const remaining = count - names.length;
  if (remaining > 0) {
    return `${names[0]}, ${names[1]} and ${remaining} other${remaining > 1 ? "s" : ""}`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function NotificationItem({
  type,
  entityType,
  entityId,
  count,
  actors,
  data,
  latestAt,
  isRead = false,
  onMarkRead,
}: NotificationItemProps) {
  const url = getNotificationUrl(entityType, entityId, data);
  const actorNames = actors.map((a) => a.name);
  const formattedNames = formatActorNames(actorNames, count);
  const action = getNotificationAction(type, entityType, data?.entityTitle);

  // Show first actor avatar
  const primaryActor = actors[0];

  return (
    <Link
      to={url}
      onClick={isRead ? undefined : onMarkRead}
      className={cn(
        "ring-offset-background focus-visible:ring-ring group hover:bg-accent block rounded-md p-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        !isRead && "bg-accent/50",
      )}
    >
      <div className="flex items-start gap-3">
        {primaryActor && (
          <Avatar
            cloudflareId={primaryActor.avatarId}
            alt={primaryActor.name}
            className="size-6 shrink-0"
          >
            <AvatarImage width={24} quality={75} />
            <AvatarFallback name={primaryActor.name} className="text-[10px]" />
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {formattedNames}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              <TimeAgo date={new Date(latestAt)} />
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <NotificationIcon type={type} />
            <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
              {action}
            </p>
          </div>
        </div>

        {!isRead && onMarkRead && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead();
            }}
          >
            <Check className="size-3.5" />
            <span className="sr-only">Mark as read</span>
          </Button>
        )}
      </div>
    </Link>
  );
}
