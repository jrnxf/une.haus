import type { Trick } from "~/lib/tricks";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type TrickCardProps = {
  trick: Trick;
  onSelect: (trick: Trick) => void;
  isSelected?: boolean;
  compact?: boolean;
};

// Assign colors to categories for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  spin: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  flip: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  wrap: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  twist: "bg-green-500/20 text-green-700 dark:text-green-300",
  roll: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  grind: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  varial: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  coast: "bg-teal-500/20 text-teal-700 dark:text-teal-300",
  walk: "bg-lime-500/20 text-lime-700 dark:text-lime-300",
  rev: "bg-red-500/20 text-red-700 dark:text-red-300",
  mount: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  basic: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
  wild: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-secondary text-muted-foreground";
}

export function TrickCard({
  trick,
  onSelect,
  isSelected,
  compact,
}: TrickCardProps) {
  return (
    <button
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
        "hover:bg-accent hover:border-accent-foreground/20",
        isSelected && "border-primary bg-primary/5",
        compact ? "min-w-[140px] max-w-[180px]" : "min-w-[180px] max-w-[220px]",
      )}
      onClick={() => onSelect(trick)}
      type="button"
    >
      <span
        className={cn(
          "font-medium leading-tight",
          compact ? "text-sm" : "text-base",
        )}
      >
        {trick.name}
      </span>

      <div className="flex flex-wrap gap-1">
        {trick.categories.slice(0, compact ? 2 : 3).map((cat) => (
          <Badge
            className={cn(
              "border-0 px-1.5 py-0 text-[10px]",
              getCategoryColor(cat),
            )}
            key={cat}
            variant="secondary"
          >
            {cat}
          </Badge>
        ))}
        {trick.categories.length > (compact ? 2 : 3) && (
          <Badge
            className="border-0 px-1.5 py-0 text-[10px]"
            variant="secondary"
          >
            +{trick.categories.length - (compact ? 2 : 3)}
          </Badge>
        )}
      </div>

      {!compact && trick.depth > 0 && (
        <span className="text-muted-foreground text-[10px]">
          depth {trick.depth}
        </span>
      )}
    </button>
  );
}
