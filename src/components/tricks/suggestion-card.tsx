import { Link } from "@tanstack/react-router";
import {
  Heart,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { TrickSuggestionDiff } from "~/db/schema";
import { cn } from "~/lib/utils";

type SuggestionCardProps = {
  suggestion: {
    id: number;
    diff: TrickSuggestionDiff;
    reason?: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: Date;
    trick: {
      id: number;
      slug: string;
      name: string;
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

function formatDiffSummary(diff: TrickSuggestionDiff): string {
  const changes: string[] = [];

  if (diff.name) changes.push("name");
  if (diff.alternateNames) changes.push("aliases");
  if (diff.definition) changes.push("definition");
  if (diff.isPrefix) changes.push("prefix status");
  if (diff.inventedBy) changes.push("inventor");
  if (diff.yearLanded) changes.push("year");
  if (diff.videoUrl) changes.push("video");
  if (diff.videoTimestamp) changes.push("timestamp");
  if (diff.notes) changes.push("notes");
  if (diff.elements) changes.push("elements");
  if (diff.relationships) changes.push("relationships");

  if (changes.length === 0) return "No changes";
  if (changes.length === 1) return `Changed ${changes[0]}`;
  if (changes.length === 2) return `Changed ${changes[0]} and ${changes[1]}`;
  return `Changed ${changes.slice(0, -1).join(", ")}, and ${changes.at(-1)}`;
}

export function SuggestionCard({
  suggestion,
  showStatus = true,
}: SuggestionCardProps) {
  const statusStyle = STATUS_STYLES[suggestion.status];
  const StatusIcon = statusStyle.icon;
  const diffSummary = formatDiffSummary(suggestion.diff);

  return (
    <Link
      to="/tricks/suggestions/$suggestionId"
      params={{ suggestionId: suggestion.id }}
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="truncate">{suggestion.trick.name}</span>
                {suggestion.diff.name && (
                  <>
                    <ArrowRight className="text-muted-foreground size-3 shrink-0" />
                    <span className="text-primary truncate">
                      {suggestion.diff.name.new}
                    </span>
                  </>
                )}
              </CardTitle>
              <CardDescription className="truncate text-xs">
                Edit suggestion
              </CardDescription>
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
