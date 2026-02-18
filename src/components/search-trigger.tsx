import { SearchIcon } from "lucide-react";

import { Kbd } from "~/components/ui/kbd";
import { usePeripherals } from "~/hooks/use-peripherals";
import { cn } from "~/lib/utils";

export function SearchTrigger({ className }: { className?: string }) {
  const [, setOpen] = usePeripherals("search");

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "group/search border-input dark:bg-input/30 text-muted-foreground flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-2 text-sm transition-colors",
        "hover:bg-card hover:text-accent-foreground",
        "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
        "[[data-mobile=true]_&]:hidden",
        className,
      )}
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <span className="flex-1 text-left">search...</span>
      <span className="ml-auto flex items-center gap-0.5">
        <Kbd className="group-hover/search:text-accent-foreground group-hover/search:bg-black/10 dark:group-hover/search:bg-white/10">
          ⌘
        </Kbd>
        <Kbd className="group-hover/search:text-accent-foreground group-hover/search:bg-black/10 dark:group-hover/search:bg-white/10">
          K
        </Kbd>
      </span>
    </button>
  );
}
