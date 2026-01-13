import { Link } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type SiuStackCardProps = {
  stack: {
    id: number;
    name: string;
    position: number;
    user: {
      id: number;
      name: string;
      avatarId: string | null;
    };
    likes?: unknown[];
    messages?: unknown[];
    parentStack?: {
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

export function SiuStackCard({
  stack,
  isLatest = false,
  className,
}: SiuStackCardProps) {
  const likeCount = Array.isArray(stack.likes) ? stack.likes.length : 0;
  const messageCount = Array.isArray(stack.messages)
    ? stack.messages.length
    : 0;

  return (
    <Link
      to="/games/sius/stacks/$stackId"
      params={{ stackId: stack.id }}
      className={cn("group block", className)}
    >
      <div
        className={cn(
          "bg-card rounded-md border p-3 transition-colors",
          "hover:bg-muted/50",
        )}
      >
        <div className="flex items-start gap-2.5">
          <Avatar
            className="size-8 shrink-0 rounded-full"
            cloudflareId={stack.user.avatarId}
            alt={stack.user.name}
          >
            <AvatarImage width={32} quality={85} />
            <AvatarFallback className="text-xs" name={stack.user.name} />
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-medium">{stack.name}</h3>
                {isLatest && (
                  <Badge variant="outline" className="text-[10px]">
                    Latest
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
              #{stack.position} · {stack.user.name}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
