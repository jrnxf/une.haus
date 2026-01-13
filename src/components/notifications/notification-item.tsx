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
  getNotificationMessage,
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
      return <Heart className="size-5" />;
    }
    case "comment": {
      return <MessageCircle className="size-5" />;
    }
    case "follow": {
      return <UserPlus className="size-5" />;
    }
    case "new_content": {
      return <Sparkles className="size-5" />;
    }
    default: {
      return <Sparkles className="size-5" />;
    }
  }
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
  const message = getNotificationMessage(
    type,
    entityType,
    count,
    actorNames,
    data?.entityTitle,
  );

  // Show up to 3 actor avatars
  const displayActors = actors.slice(0, 3);

  // Count unique actors for the "+N" badge
  const uniqueActorCount = actors.length;

  return (
    <div
      className={cn(
        "group hover:bg-accent relative flex items-start gap-4 rounded-lg p-4 transition-colors",
        !isRead && "bg-accent/50",
      )}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div className="bg-primary absolute top-1/2 left-1.5 size-2 -translate-y-1/2 rounded-full" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          type === "like" && "bg-red-100 text-red-600 dark:bg-red-900/30",
          type === "comment" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
          type === "follow" &&
            "bg-green-100 text-green-600 dark:bg-green-900/30",
          type === "new_content" &&
            "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
        )}
      >
        <NotificationIcon type={type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <Link to={url} onClick={onMarkRead} className="block">
          {/* Actor avatars */}
          <div className="mb-1.5 flex -space-x-2">
            {displayActors.map((actor) => (
              <Avatar
                key={actor.id}
                cloudflareId={actor.avatarId}
                alt={actor.name}
                className="border-background size-7 border-2"
              >
                <AvatarImage width={28} quality={75} />
                <AvatarFallback name={actor.name} className="text-xs" />
              </Avatar>
            ))}
            {count > uniqueActorCount && (
              <div className="bg-muted text-muted-foreground border-background flex size-7 items-center justify-center rounded-full border-2 text-xs font-medium">
                +{count - uniqueActorCount}
              </div>
            )}
          </div>

          {/* Message */}
          <p className="text-sm leading-snug">{message}</p>

          {/* Time */}
          <p className="text-muted-foreground mt-1 text-xs">
            <TimeAgo date={new Date(latestAt)} />
          </p>
        </Link>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Mark as read button */}
        {!isRead && onMarkRead && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead();
            }}
          >
            <Check className="size-4" />
            <span className="sr-only">Mark as read</span>
          </Button>
        )}

        {/* Delete button */}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="size-4" />
            <span className="sr-only">Delete notification</span>
          </Button>
        )}
      </div>
    </div>
  );
}
