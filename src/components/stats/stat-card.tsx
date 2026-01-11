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
};

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  className,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "border-dashed py-4 transition-colors",
        description && "cursor-help hover:border-primary/30",
        className,
      )}
    >
      <CardContent className="flex items-center gap-3 px-4">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="text-muted-foreground size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="text-muted-foreground truncate text-xs">{label}</p>
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
