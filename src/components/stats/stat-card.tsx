import { Link } from "@tanstack/react-router";

import { Card, CardContent } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

type StatCardProps = {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  className?: string;
  size?: "default" | "compact" | "responsive";
  to?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  className,
  size = "default",
  to,
}: StatCardProps) {
  const isCompact = size === "compact";
  const isResponsive = size === "responsive";

  const content = (
    <Card
      className={cn(
        "rounded-md",
        isCompact && "py-1.5",
        isResponsive && "py-1.5",
        !isCompact && !isResponsive && "py-2.5",
        to && "cursor-pointer",
        className,
      )}
    >
      <CardContent
        className={cn(
          "flex items-center",
          isCompact && "gap-1.5 px-2",
          isResponsive && "gap-2 px-2",
          !isCompact && !isResponsive && "gap-2.5 px-3",
        )}
      >
        <div
          className={cn(
            "bg-muted flex shrink-0 items-center justify-center rounded-md",
            isCompact && "size-6",
            isResponsive && "size-7",
            !isCompact && !isResponsive && "size-8",
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground",
              isCompact && "size-3",
              isResponsive && "size-3.5",
              !isCompact && !isResponsive && "size-4",
            )}
          />
        </div>
        <div className="min-w-0 -space-y-0.5">
          <p
            className={cn(
              "truncate font-semibold tabular-nums",
              isCompact && "text-sm",
              isResponsive && "text-sm",
              !isCompact && !isResponsive && "text-lg",
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p
            className={cn(
              "text-muted-foreground truncate",
              isCompact && "text-[9px]",
              isResponsive && "text-xs",
              !isCompact && !isResponsive && "text-[11px]",
            )}
          >
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const maybeLinked = to ? (
    <Link to={to} className="rounded-md">
      {content}
    </Link>
  ) : (
    content
  );

  if (description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{maybeLinked}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          {description}
        </TooltipContent>
      </Tooltip>
    );
  }

  return maybeLinked;
}
