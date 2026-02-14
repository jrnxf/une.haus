import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toast } from "sonner";

import { games } from "~/lib/games";

const activeChainKey = games.sius.chain.active.queryOptions().queryKey;

export function useStartChain() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.sius.chain.start.fn,
    onSuccess: (data) => {
      toast.success("Chain started!");
      qc.invalidateQueries({ queryKey: activeChainKey });
      navigate({
        to: "/games/sius/stacks/$stackId",
        params: { stackId: data.stack.id },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start chain");
    },
  });
}

export function useStackUp() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.sius.stacks.stackUp.fn,
    onSuccess: (data) => {
      toast.success("Stack submitted!");
      qc.invalidateQueries({ queryKey: activeChainKey });
      navigate({
        to: "/games/sius/stacks/$stackId",
        params: { stackId: data.id },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit stack");
    },
  });
}

export function useVoteToArchive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.sius.chain.voteToArchive.fn,
    onSuccess: (data) => {
      if (data.thresholdReached) {
        toast.success("Vote threshold reached! Admin has been notified.");
      } else {
        toast.success(`Voted to archive (${data.voteCount}/5)`);
      }
      qc.invalidateQueries({ queryKey: activeChainKey });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to vote");
    },
  });
}

export function useRemoveArchiveVote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.sius.chain.removeArchiveVote.fn,
    onSuccess: (data) => {
      toast.success(`Vote removed (${data.voteCount}/5)`);
      qc.invalidateQueries({ queryKey: activeChainKey });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove vote");
    },
  });
}

export function useArchiveChain() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.sius.admin.archiveChain.fn,
    onSuccess: () => {
      toast.success("Chain archived");
      qc.removeQueries({ queryKey: activeChainKey });
      navigate({ to: "/games/sius" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive chain");
    },
  });
}

export function useDeleteStack() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.sius.stacks.delete.fn,
    onSuccess: () => {
      toast.success("Stack deleted");
      qc.removeQueries({ queryKey: activeChainKey });
      navigate({ to: "/games/sius" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete stack");
    },
  });
}
