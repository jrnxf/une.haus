import { CheckCircleIcon, CircleIcon } from "lucide-react";

import pluralize from "pluralize";

import { cn } from "~/lib/utils";

type Trick = {
  id: number;
  name: string;
  position: number;
  user: {
    id: number;
    name: string;
  };
};

type TrickLineProps = {
  tricks: Trick[];
  className?: string;
};

export function TrickLine({ tricks, className }: TrickLineProps) {
  if (tricks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-muted-foreground text-sm font-medium">
        your video must show all {tricks.length}{" "}
        {pluralize("trick", tricks.length)} in order:
      </p>
      <ol className="space-y-2">
        {tricks.map((trick, index) => (
          <li key={trick.id} className="flex items-start gap-2">
            <div className="text-muted-foreground flex size-5 shrink-0 items-center justify-center">
              <CircleIcon className="size-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="text-muted-foreground">{index + 1}.</span>{" "}
                <span className="font-medium">{trick.name}</span>
                <span className="text-muted-foreground text-xs">
                  {" "}
                  by {trick.user.name}
                </span>
              </p>
            </div>
          </li>
        ))}
        <li className="flex items-start gap-2">
          <div className="text-primary flex size-5 shrink-0 items-center justify-center">
            <CheckCircleIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-primary text-sm font-medium">
              {tricks.length + 1}. your new trick
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}
