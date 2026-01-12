import { AlertTriangleIcon, CheckCircleIcon, LinkIcon } from "lucide-react";

import { cn } from "~/lib/utils";

type ChainStatusBannerProps = {
  status: "active" | "completed" | "flagged";
  chainLength?: number;
};

export function ChainStatusBanner({
  status,
  chainLength = 0,
}: ChainStatusBannerProps) {
  if (status === "active") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4",
          "border-primary/30 bg-primary/5",
        )}
      >
        <LinkIcon className="text-primary mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Chain Active</p>
          <p className="text-muted-foreground text-sm">
            {chainLength} {chainLength === 1 ? "set" : "sets"} in the current
            chain. Back up the latest set to continue!
          </p>
        </div>
      </div>
    );
  }

  if (status === "flagged") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4",
          "border-destructive/50 bg-destructive/10",
        )}
      >
        <AlertTriangleIcon className="text-destructive mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-destructive font-medium">Chain Paused</p>
          <p className="text-muted-foreground text-sm">
            A set has been flagged for review. The chain is paused until an
            admin resolves the flag.
          </p>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4",
          "border-muted bg-muted/30",
        )}
      >
        <CheckCircleIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-medium">Chain Completed</p>
          <p className="text-muted-foreground text-sm">
            This chain has ended with {chainLength}{" "}
            {chainLength === 1 ? "set" : "sets"}.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
