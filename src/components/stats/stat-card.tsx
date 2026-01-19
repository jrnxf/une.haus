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
  const isResponsive = size === "responsive";

  const content = (
    <Card
      className={cn(
        "border-dashed transition-colors",
        isCompact && "py-1.5",
        isResponsive && "py-1 md:py-1.5 lg:py-2.5",
        !isCompact && !isResponsive && "py-2.5",
        description && "hover:border-primary/30 cursor-help",
        className,
      )}
    >
      <CardContent
        className={cn(
          "flex items-center",
          isCompact && "gap-1.5 px-2",
          isResponsive && "gap-1.5 px-2 lg:gap-2.5 lg:px-3",
          !isCompact && !isResponsive && "gap-2.5 px-3",
        )}
      >
        <div
          className={cn(
            "bg-muted flex shrink-0 items-center justify-center rounded-md",
            isCompact && "size-6",
            isResponsive && "size-5 md:size-6 lg:size-8",
            !isCompact && !isResponsive && "size-8",
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground",
              isCompact && "size-3",
              isResponsive && "size-2.5 md:size-3 lg:size-4",
              !isCompact && !isResponsive && "size-4",
            )}
          />
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-semibold tabular-nums",
              isCompact && "text-sm",
              isResponsive && "text-xs md:text-sm lg:text-lg",
              !isCompact && !isResponsive && "text-lg",
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p
            className={cn(
              "text-muted-foreground truncate",
              isCompact && "text-[9px]",
              isResponsive && "text-[8px] md:text-[9px] lg:text-[11px]",
              !isCompact && !isResponsive && "text-[11px]",
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
