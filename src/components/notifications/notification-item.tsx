import { Link } from "@tanstack/react-router";
import {
  Check,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
  X,
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
  onDelete?: () => void;
};

function NotificationIcon({ type }: { type: NotificationType }) {
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
    default: {
      return <Sparkles className="size-3 text-purple-500" />;
    }
  }
}

function formatActorNames(names: string[], count: number): string {
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
  onDelete,
}: NotificationItemProps) {
  const url = getNotificationUrl(entityType, entityId);
  const actorNames = actors.map((a) => a.name);
  const formattedNames = formatActorNames(actorNames, count);
  const action = getNotificationAction(type, entityType, data?.entityTitle);

  // Show first actor avatar
  const primaryActor = actors[0];

  return (
    <Link
      to={url}
      onClick={onMarkRead}
      className={cn(
        "group hover:bg-accent relative block px-3 py-2 transition-colors",
        !isRead && "bg-accent/50",
      )}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div className="bg-primary absolute top-2 left-1 size-1.5 rounded-full" />
      )}

      {/* First line: avatar + names + action buttons */}
      <div className="flex items-center gap-1.5">
        {primaryActor && (
          <Avatar
            cloudflareId={primaryActor.avatarId}
            alt={primaryActor.name}
            className="size-4 shrink-0"
          >
            <AvatarImage width={16} quality={75} />
            <AvatarFallback name={primaryActor.name} className="text-[8px]" />
          </Avatar>
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {formattedNames}
        </span>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {!isRead && onMarkRead && (
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkRead();
              }}
            >
              <Check className="size-3" />
              <span className="sr-only">Mark as read</span>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="size-3" />
              <span className="sr-only">Delete notification</span>
            </Button>
          )}
        </div>
      </div>

      {/* Second line: icon + action + time */}
      <div className="mt-0.5 flex items-center gap-1">
        <NotificationIcon type={type} />
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {action}
        </p>
        <span className="text-muted-foreground shrink-0 text-[10px]">
          <TimeAgo date={new Date(latestAt)} />
        </span>
      </div>
    </Link>
  );
}
