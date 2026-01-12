import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon, HeartIcon, MessageCircleIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type BiuSetCardProps = {
  set: {
    id: number;
    name: string;
    position: number;
    flaggedAt: Date | null;
    user: {
      id: number;
      name: string;
      avatarId: string | null;
    };
    likes?: unknown[];
    messages?: unknown[];
    parentSet?: {
      id: number;
      name: string;
      user?: {
        id: number;
        name: string;
      };
    } | null;
  };
  isLatest?: boolean;
  className?: string;
};

export function BiuSetCard({
  set,
  isLatest = false,
  className,
}: BiuSetCardProps) {
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0;
  const messageCount = Array.isArray(set.messages) ? set.messages.length : 0;
  const isFlagged = !!set.flaggedAt;

  return (
    <Link
      to="/games/bius/sets/$setId"
      params={{ setId: set.id }}
      className={cn("group block", className)}
    >
      <div
        className={cn(
          "bg-card rounded-lg border p-4 transition-all",
          "hover:border-primary/30 hover:shadow-sm",
          "active:scale-[0.99]",
          isLatest && "border-primary/50 ring-primary/20 ring-1",
          isFlagged && "border-destructive/50 bg-destructive/5",
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar
            className="size-10 shrink-0 rounded-full"
            cloudflareId={set.user.avatarId}
            alt={set.user.name}
          >
            <AvatarImage width={40} quality={85} />
            <AvatarFallback className="text-xs" name={set.user.name} />
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="group-hover:text-primary truncate text-sm font-medium">
                    {set.name}
                  </h3>
                  {isLatest && (
                    <Badge variant="outline" className="text-[10px]">
                      Latest
                    </Badge>
                  )}
                  {isFlagged && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangleIcon className="mr-1 size-3" />
                      Flagged
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  by {set.user.name}
                </p>
              </div>

              <div className="text-muted-foreground flex shrink-0 items-center gap-2.5 text-xs">
                <div
                  className="flex items-center gap-1"
                  title={`${likeCount} likes`}
                >
                  <HeartIcon className="size-3.5" />
                  <span>{likeCount}</span>
                </div>
                <div
                  className="flex items-center gap-1"
                  title={`${messageCount} messages`}
                >
                  <MessageCircleIcon className="size-3.5" />
                  <span>{messageCount}</span>
                </div>
              </div>
            </div>

            {set.parentSet && (
              <p className="text-muted-foreground mt-2 text-xs">
                Backed up:{" "}
                <span className="text-foreground/80">{set.parentSet.name}</span>
                {set.parentSet.user && (
                  <span className="text-muted-foreground">
                    {" "}
                    by {set.parentSet.user.name}
                  </span>
                )}
              </p>
            )}

            <p className="text-muted-foreground mt-1 text-xs">
              Position #{set.position} in chain
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
