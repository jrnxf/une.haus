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
        "border-dashed py-2.5 transition-colors",
        description && "hover:border-primary/30 cursor-help",
        className,
      )}
    >
      <CardContent className="flex items-center gap-2.5 px-3">
        <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="text-muted-foreground truncate text-[11px]">{label}</p>
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
