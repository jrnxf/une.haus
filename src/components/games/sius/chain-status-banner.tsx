import { ArchiveIcon } from "lucide-react";

type ChainStatusBannerProps = {
  status: "active" | "archived";
  chainLength?: number;
  voteCount?: number;
};

export function ChainStatusBanner({
  status,
  chainLength = 0,
}: ChainStatusBannerProps) {
  // Only show banner for archived status - active status is implied
  if (status === "archived") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <ArchiveIcon className="size-4" />
        <span>
          Archived with {chainLength}{" "}
          {chainLength === 1 ? "trick" : "tricks"}
        </span>
      </div>
    );
  }

  return null;
}
