import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon, UploadIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { messages } from "~/lib/messages";
import { cn } from "~/lib/utils";

type SetCardProps = {
  set: {
    id: number;
    name: string;
    instructions: string | null;
    user: {
      id: number;
      name: string;
      avatarId: string | null;
    };
    likes?: unknown[];
    submissions?: unknown[];
  };
  showAuthor?: boolean;
  className?: string;
};

export function SetCard({ set, showAuthor = false, className }: SetCardProps) {
  const record = { type: "riuSet" as const, id: set.id };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));

  const messageCount = messagesQuery.data.messages.length;
  const likeCount = Array.isArray(set.likes) ? set.likes.length : 0;
  const submissionCount = Array.isArray(set.submissions)
    ? set.submissions.length
    : 0;

  return (
    <Link
      to="/games/rius/sets/$setId"
      params={{ setId: set.id }}
      className={cn("group block", className)}
    >
      <div
        className={cn(
          "bg-card rounded-lg border p-4 transition-all",
          "hover:border-primary/30 hover:shadow-sm",
          "active:scale-[0.99]",
        )}
      >
        {/* Header with title and optional author */}
        <div className="flex items-start gap-3">
          {showAuthor && (
            <Avatar
              className="size-8 shrink-0 rounded-full"
              cloudflareId={set.user.avatarId}
              alt={set.user.name}
            >
              <AvatarImage width={32} quality={85} />
              <AvatarFallback className="text-xs" name={set.user.name} />
            </Avatar>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="group-hover:text-primary truncate text-sm font-medium">
                  {set.name}
                </h3>
                {showAuthor && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {set.user.name}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="text-muted-foreground flex shrink-0 items-center gap-2.5 text-xs">
                <StatBadge
                  icon={MessageCircleIcon}
                  count={messageCount}
                  label="messages"
                />
                <StatBadge icon={HeartIcon} count={likeCount} label="likes" />
                <StatBadge
                  icon={UploadIcon}
                  count={submissionCount}
                  label="submissions"
                />
              </div>
            </div>

            {set.instructions && (
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                {set.instructions}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

type StatBadgeProps = {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
};

function StatBadge({ icon: Icon, count, label }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-1" title={`${count} ${label}`}>
      <Icon className="size-3.5" />
      <span>{count}</span>
    </div>
  );
}
