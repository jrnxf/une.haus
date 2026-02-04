import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { games } from "~/lib/games";

const activeChainKey = games.bius.chain.active.queryOptions().queryKey;

export function useStartChain() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.bius.chain.start.fn,
    onSuccess: (data) => {
      toast.success("Chain started!");
      qc.invalidateQueries({ queryKey: activeChainKey });
      navigate({
        to: "/games/bius/sets/$setId",
        params: { setId: data.set.id },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start chain");
    },
  });
}

export function useBackUpSet() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.bius.sets.backUp.fn,
    onSuccess: (data) => {
      toast.success("Set submitted!");
      qc.invalidateQueries({ queryKey: activeChainKey });
      navigate({
        to: "/games/bius/sets/$setId",
        params: { setId: data.id },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit set");
    },
  });
}

export function useFlagSet() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.bius.sets.flag.fn,
    onSuccess: () => {
      toast.success("Set flagged for review");
      qc.invalidateQueries({ queryKey: activeChainKey });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to flag set");
    },
  });
}

export function useDeleteSet() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.bius.sets.delete.fn,
    onSuccess: () => {
      toast.success("Set deleted");
      qc.removeQueries({ queryKey: activeChainKey });
      navigate({ to: "/games/bius" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete set");
    },
  });
}

export function useResolveFlag() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: games.bius.admin.resolveFlag.fn,
    onSuccess: () => {
      toast.success("Flag resolved");
      qc.invalidateQueries({ queryKey: activeChainKey });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resolve flag");
    },
  });
}
