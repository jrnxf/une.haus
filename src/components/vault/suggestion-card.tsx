import { Link } from "@tanstack/react-router";
import {
  CheckCircle,
  Clock,
  Heart,
  MessageCircle,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { UtvVideoSuggestionDiff } from "~/db/schema";
import { cn } from "~/lib/utils";

type UtvSuggestionCardProps = {
  suggestion: {
    id: number;
    diff: UtvVideoSuggestionDiff;
    reason?: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: Date;
    utvVideo: {
      id: number;
      title: string;
      legacyTitle: string;
    };
    submittedBy: {
      id: number;
      name: string;
      avatarId: string | null;
    };
    likes: { userId: number }[];
    messages: { id: number }[];
  };
  showStatus?: boolean;
};

const STATUS_STYLES = {
  pending: {
    icon: Clock,
    className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    label: "Pending",
  },
  approved: {
    icon: CheckCircle,
    className: "bg-green-500/20 text-green-700 dark:text-green-300",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    className: "bg-red-500/20 text-red-700 dark:text-red-300",
    label: "Rejected",
  },
};

function formatDiffSummary(diff: UtvVideoSuggestionDiff): string {
  const changes: string[] = [];

  if (diff.title) changes.push("title");
  if (diff.disciplines) changes.push("disciplines");
  if (diff.riders) changes.push("riders");

  if (changes.length === 0) return "no changes";
  if (changes.length === 1) return `changed ${changes[0]}`;
  if (changes.length === 2) return `changed ${changes[0]} and ${changes[1]}`;
  return `changed ${changes.slice(0, -1).join(", ")}, and ${changes.at(-1)}`;
}

export function UtvSuggestionCard({
  suggestion,
  showStatus = true,
}: UtvSuggestionCardProps) {
  const statusStyle = STATUS_STYLES[suggestion.status];
  const StatusIcon = statusStyle.icon;
  const diffSummary = formatDiffSummary(suggestion.diff);
  const displayTitle =
    suggestion.utvVideo.title || suggestion.utvVideo.legacyTitle;

  return (
    <Link
      to="/vault/suggestions/$suggestionId"
      params={{ suggestionId: suggestion.id }}
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 overflow-hidden">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">
                {displayTitle}
              </CardTitle>
            </div>
            {showStatus && (
              <Badge
                className={cn("shrink-0 gap-1 border-0", statusStyle.className)}
                variant="secondary"
              >
                <StatusIcon className="size-3" />
                {statusStyle.label}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{diffSummary}</p>

          {suggestion.reason && (
            <p className="text-muted-foreground line-clamp-2 text-sm italic">
              &quot;{suggestion.reason}&quot;
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                className="size-5"
                cloudflareId={suggestion.submittedBy.avatarId}
                alt={suggestion.submittedBy.name}
              >
                <AvatarImage width={20} quality={85} />
                <AvatarFallback
                  className="text-[10px]"
                  name={suggestion.submittedBy.name}
                />
              </Avatar>
              <span className="text-muted-foreground text-xs">
                {suggestion.submittedBy.name}
              </span>
            </div>

            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Heart className="size-3" />
                {suggestion.likes.length}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="size-3" />
                {suggestion.messages.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
