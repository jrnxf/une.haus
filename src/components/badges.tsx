import { Link } from "@tanstack/react-router";
import { createSerializer, parseAsArrayOf, parseAsString } from "nuqs";

import { Badge, badgeVariants } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const serialize = createSerializer({
  disciplines: parseAsArrayOf(parseAsString),
});

type BadgesProps = {
  content: null | string[];
  active?: string[];
  clickable?: boolean;
};

export function Badges({ content, active, clickable = false }: BadgesProps) {
  if (!content || content.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {content.map((item) => {
        const isActive = active?.includes(item);
        const className = cn(
          "border-border",
          isActive && "bg-primary text-primary-foreground",
        );

        if (clickable) {
          return (
            <Link
              key={item}
              to={serialize("/users", { disciplines: [item] })}
              onClick={(e) => e.stopPropagation()}
              className={cn(badgeVariants({ variant: "secondary" }), className)}
            >
              {item}
            </Link>
          );
        }

        return (
          <Badge className={cn(className, "hover:bg-secondary")} key={item} variant="secondary">
            {item}
          </Badge>
        );
      })}
    </div>
  );
}
