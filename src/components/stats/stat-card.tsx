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
  size?: "default" | "compact";
};

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  className,
  size = "default",
}: StatCardProps) {
  const isCompact = size === "compact";

  const content = (
    <Card
      className={cn(
        "border-dashed transition-colors",
        isCompact ? "py-1.5" : "py-2.5",
        description && "hover:border-primary/30 cursor-help",
        className,
      )}
    >
      <CardContent
        className={cn(
          "flex items-center",
          isCompact ? "gap-1.5 px-2" : "gap-2.5 px-3",
        )}
      >
        <div
          className={cn(
            "bg-muted flex shrink-0 items-center justify-center rounded-md",
            isCompact ? "size-6" : "size-8",
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground",
              isCompact ? "size-3" : "size-4",
            )}
          />
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-semibold tabular-nums",
              isCompact ? "text-sm" : "text-lg",
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p
            className={cn(
              "text-muted-foreground truncate",
              isCompact ? "text-[9px]" : "text-[11px]",
            )}
          >
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          {description}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
