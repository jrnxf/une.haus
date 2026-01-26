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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

type SubmissionCardProps = {
  submission: {
    id: number;
    name: string;
    slug: string;
    definition?: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: Date;
    submittedBy: {
      id: number;
      name: string;
      avatarId: string | null;
    };
    elementAssignments: {
      element: {
        id: number;
        name: string;
        slug: string;
      };
    }[];
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

export function SubmissionCard({
  submission,
  showStatus = true,
}: SubmissionCardProps) {
  const statusStyle = STATUS_STYLES[submission.status];
  const StatusIcon = statusStyle.icon;

  return (
    <Link
      to="/tricks/submissions/$submissionId"
      params={{ submissionId: submission.id }}
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">
                {submission.name}
              </CardTitle>
              <CardDescription className="truncate text-xs">
                {submission.slug}
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
          {submission.definition && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {submission.definition}
            </p>
          )}

          <div className="flex flex-wrap gap-1">
            {submission.elementAssignments.map(({ element }) => (
              <Badge
                key={element.id}
                variant="outline"
                className="px-1.5 py-0 text-[10px]"
              >
                {element.name}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                className="size-5"
                cloudflareId={submission.submittedBy.avatarId}
                alt={submission.submittedBy.name}
              >
                <AvatarImage width={20} quality={85} />
                <AvatarFallback
                  className="text-[10px]"
                  name={submission.submittedBy.name}
                />
              </Avatar>
              <span className="text-muted-foreground text-xs">
                {submission.submittedBy.name}
              </span>
            </div>

            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Heart className="size-3" />
                {submission.likes.length}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="size-3" />
                {submission.messages.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
