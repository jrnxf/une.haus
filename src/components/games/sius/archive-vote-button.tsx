import { ArchiveIcon, Loader2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  useRemoveArchiveVote,
  useVoteToArchive,
} from "~/lib/games/sius/hooks";
import { cn } from "~/lib/utils";

type ArchiveVoteButtonProps = {
  chainId: number;
  voteCount: number;
  hasVoted: boolean;
  className?: string;
};

export function ArchiveVoteButton({
  chainId,
  voteCount,
  hasVoted,
  className,
}: ArchiveVoteButtonProps) {
  const voteToArchive = useVoteToArchive();
  const removeVote = useRemoveArchiveVote();

  const isPending = voteToArchive.isPending || removeVote.isPending;

  const handleClick = () => {
    if (hasVoted) {
      removeVote.mutate({ data: { chainId } });
    } else {
      voteToArchive.mutate({ data: { chainId } });
    }
  };

  return (
    <Button
      variant={hasVoted ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={cn("gap-2", className)}
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <ArchiveIcon className="size-4" />
      )}
      <span>
        {hasVoted ? "Remove vote" : "Vote to archive"} ({voteCount}/5)
      </span>
    </Button>
  );
}
