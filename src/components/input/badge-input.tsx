import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export function BadgeInput<T extends string>({
  defaultSelections,
  onChange,
  options,
}: {
  defaultSelections: null | T[] | undefined;
  onChange: (options: T[]) => void;
  options: readonly T[];
}) {
  const [selections, setSelections] = useState(defaultSelections ?? []);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selections.includes(option);
        return (
          <Button
            className="bg-background rounded-xl"
            key={option}
            onClick={() => {
              const nextSelections = isSelected
                ? selections.filter((s) => s !== option)
                : [...selections, option];
              setSelections(nextSelections);
              onChange(nextSelections);
            }}
            size="inherit"
            type="button"
            variant="unstyled"
          >
            <Badge variant={isSelected ? "default" : "outline"}>{option}</Badge>
          </Button>
        );
      })}
    </div>
  );
}
