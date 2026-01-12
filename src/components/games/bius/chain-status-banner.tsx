import { AlertTriangleIcon, CheckCircleIcon } from "lucide-react";

type ChainStatusBannerProps = {
  status: "active" | "completed" | "flagged";
  chainLength?: number;
};

export function ChainStatusBanner({
  status,
  chainLength = 0,
}: ChainStatusBannerProps) {
  // Active status is implied - no banner needed
  if (status === "active") {
    return null;
  }

  if (status === "flagged") {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm">
        <AlertTriangleIcon className="size-4" />
        <span>Chain paused - set under review</span>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <CheckCircleIcon className="size-4" />
        <span>
          Completed with {chainLength} {chainLength === 1 ? "set" : "sets"}
        </span>
      </div>
    );
  }

  return null;
}
