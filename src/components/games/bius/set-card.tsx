import { Link } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon } from "lucide-react";

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
          "bg-card rounded-md border p-3 transition-colors",
          "hover:bg-muted/50",
          isFlagged && "border-destructive/50",
        )}
      >
        <div className="flex items-start gap-2.5">
          <Avatar
            className="size-8 shrink-0 rounded-full"
            cloudflareId={set.user.avatarId}
            alt={set.user.name}
          >
            <AvatarImage width={32} quality={85} />
            <AvatarFallback className="text-xs" name={set.user.name} />
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-medium">{set.name}</h3>
                {isLatest && (
                  <Badge variant="outline" className="text-[10px]">
                    Latest
                  </Badge>
                )}
                {isFlagged && (
                  <Badge variant="destructive" className="text-[10px]">
                    Flagged
                  </Badge>
                )}
              </div>

              <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                <span className="flex items-center gap-0.5">
                  <HeartIcon className="size-3" />
                  {likeCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircleIcon className="size-3" />
                  {messageCount}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground text-xs">
              #{set.position} · {set.user.name}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
