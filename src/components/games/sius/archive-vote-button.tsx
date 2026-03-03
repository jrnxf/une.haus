import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
import { useRemoveArchiveVote, useVoteToArchive } from "~/lib/games/sius/hooks"
import { cn } from "~/lib/utils"

type ArchiveVoteButtonProps = {
  roundId: number
  voteCount: number
  hasVoted: boolean
  className?: string
}

export function ArchiveVoteButton({
  roundId,
  voteCount,
  hasVoted,
  className,
}: ArchiveVoteButtonProps) {
  const voteToArchive = useVoteToArchive()
  const removeVote = useRemoveArchiveVote()

  const isPending = voteToArchive.isPending || removeVote.isPending

  const handleClick = () => {
    if (hasVoted) {
      removeVote.mutate({ data: { roundId } })
    } else {
      voteToArchive.mutate({ data: { roundId } })
    }
  }

  return (
    <Button
      variant={hasVoted ? "secondary" : "outline"}
      onClick={handleClick}
      disabled={isPending}
      className={cn("relative", className)}
    >
      {hasVoted ? "remove vote" : "vote to archive"}
      {voteCount > 0 && (
        <CountChip className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2">
          {voteCount}/5
        </CountChip>
      )}
    </Button>
  )
}
