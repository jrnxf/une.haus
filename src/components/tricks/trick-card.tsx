import { Badge } from "~/components/ui/badge";
import type { Trick } from "~/lib/tricks";
import { cn } from "~/lib/utils";

type TrickCardProps = {
  trick: Trick;
  onSelect: (trick: Trick) => void;
  isSelected?: boolean;
  compact?: boolean;
};

// Assign colors to elements for visual distinction
const ELEMENT_COLORS: Record<string, string> = {
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

function getElementColor(element: string): string {
  return ELEMENT_COLORS[element] ?? "bg-secondary text-muted-foreground";
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
        "bg-card flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
        "hover:bg-accent hover:border-accent-foreground/20",
        isSelected && "border-primary bg-primary/5",
        compact ? "max-w-[180px] min-w-[140px]" : "max-w-[220px] min-w-[180px]",
      )}
      onClick={() => onSelect(trick)}
      type="button"
    >
      <span
        className={cn(
          "leading-tight font-medium",
          compact ? "text-sm" : "text-base",
        )}
      >
        {trick.name}
      </span>

      <div className="flex flex-wrap gap-1">
        {trick.elements.slice(0, compact ? 2 : 3).map((elem) => (
          <Badge
            className={cn(
              "border-0 px-1.5 py-0 text-[10px]",
              getElementColor(elem),
            )}
            key={elem}
            variant="secondary"
          >
            {elem}
          </Badge>
        ))}
        {trick.elements.length > (compact ? 2 : 3) && (
          <Badge
            className="border-0 px-1.5 py-0 text-[10px]"
            variant="secondary"
          >
            +{trick.elements.length - (compact ? 2 : 3)}
          </Badge>
        )}
      </div>
    </button>
  );
}
